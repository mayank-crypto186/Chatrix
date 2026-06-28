import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Menu,
  X,
  FileText,
  Download,
  Image as ImageIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import "../styles/Chat.css";
import {
  getConversation,
  sendMessage,
  toggleReaction,
  editMessage,
  deleteMessage,
} from "../api/messageApi";
import { getFriends, getFriendProfile } from "../api/friendApi";
import { uploadAttachment } from "../api/uploadApi";

function Chat() {
  const { friendId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(location.state?.friend || null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [friendTyping, setFriendTyping] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);

  // Profile drawer
  const [showProfile, setShowProfile] = useState(false);
  const [friendProfile, setFriendProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // Attachment state
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeFriendRef = useRef(activeFriend);
  const typingTimeoutRef = useRef(null);
  const typingSentRef = useRef(false);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    activeFriendRef.current = activeFriend;
  }, [activeFriend]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user?.id) return;

    setCurrentUser(user);

    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      socket.emit("joinUser", user.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection failed:", err.message);
    });

    socket.on("newMessage", (message) => {
      const currentFriend = activeFriendRef.current;
      if (!currentFriend) return;

      const isRelevant =
        String(message.sender_id) === String(currentFriend.id) ||
        String(message.receiver_id) === String(currentFriend.id);

      if (!isRelevant) return;

      setMessages((prev) => {
        const incomingId = String(message.id);
        if (prev.some((msg) => String(msg.id) === incomingId)) {
          return prev;
        }

        if (String(message.sender_id) === String(user.id)) {
          const tempIndex = prev.findIndex(
            (m) => String(m.id).startsWith("temp-") && m.text === message.message
          );
          if (tempIndex !== -1) {
            const newPrev = [...prev];
            newPrev[tempIndex] = {
              id: message.id,
              sender: "me",
              text: message.message,
              time: new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              attachment: message.attachment || null,
            };
            return newPrev;
          }
        }

        const normalizeReactions = (reactions) => {
          if (!reactions) return [];
          if (reactions.length === 0) return [];
          if (reactions[0].count !== undefined) return reactions;
          const map = {};
          reactions.forEach((r) => {
            const e = r.emoji;
            map[e] = (map[e] || 0) + 1;
          });
          return Object.entries(map).map(([emoji, count]) => ({ emoji, count }));
        };

        const incoming = {
          id: message.id,
          sender: String(message.sender_id) === String(user.id) ? "me" : "other",
          text: message.message,
          time: new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          replyToMessage: message.reply_to_message || message.reply_to || null,
          reactions: normalizeReactions(message.reactions || []),
          myReaction: message.my_reaction || null,
          attachment: message.attachment || null,
        };

        return [...prev, incoming];
      });
    });

    socket.on("typing", (payload) => {
      const currentFriend = activeFriendRef.current;
      if (!currentFriend || String(payload.from) !== String(currentFriend.id)) return;

      if (payload.typing) {
        setFriendTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setFriendTyping(false);
          typingTimeoutRef.current = null;
        }, 1200);
      } else {
        setFriendTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    });

    socket.on("reactionUpdated", (payload) => {
      if (!payload || !payload.messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(payload.messageId)
            ? {
                ...m,
                reactions: payload.reactions || m.reactions || [],
                myReaction: payload.my_reaction ?? m.myReaction,
              }
            : m
        )
      );
    });

    // Real-time edit: update message text for both sender and receiver
    socket.on("messageEdited", ({ messageId, newText }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? { ...m, text: newText, edited: true }
            : m
        )
      );
    });

    // Real-time delete: mark as deleted for everyone
    socket.on("messageDeleted", ({ messageId, scope }) => {
      if (scope === "everyone") {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(messageId)
              ? { ...m, text: null, deleted: true, attachment: null }
              : m
          )
        );
      }
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await getFriends();
        const friendsList = response.data || [];
        setFriends(friendsList);

        if (!activeFriend && friendId) {
          const matchedFriend = friendsList.find(
            (friend) => String(friend.id) === String(friendId)
          );
          if (matchedFriend) setActiveFriend(matchedFriend);
        }
      } catch (err) {
        setError("Failed to load friends. Please refresh the page.");
      }
    };

    fetchFriends();
  }, [friendId]);

  useEffect(() => {
    if (!activeFriend) return;

    const fetchConversation = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getConversation(activeFriend.id);
        const conversation = response.data || [];

        const groupReactions = (reactions) => {
          if (!reactions || reactions.length === 0) return [];
          if (reactions[0].count !== undefined) return reactions;
          const map = {};
          reactions.forEach((r) => {
            const e = r.emoji;
            map[e] = (map[e] || 0) + 1;
          });
          return Object.entries(map).map(([emoji, count]) => ({ emoji, count }));
        };

        const formattedMessages = conversation.map((message) => ({
          id: message.id,
          sender: String(message.sender_id) === String(activeFriend.id) ? "other" : "me",
          text: message.message,
          time: new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          replyToMessage: message.reply_to_message || message.reply_to || null,
          reactions: groupReactions(message.reactions || []),
          myReaction: message.my_reaction || null,
          attachment: message.attachment || null,
          edited: !!message.updated_at,
          deleted: !!message.deleted_for_everyone,
        }));

        setMessages(formattedMessages);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load this conversation.");
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [activeFriend]);

  useEffect(() => {
    if (
      location.state?.friend &&
      String(location.state.friend.id) !== String(activeFriend?.id)
    ) {
      setActiveFriend(location.state.friend);
      setFriendTyping(false);
    }
  }, [location.state?.friend, activeFriend?.id]);

  const handleTyping = () => {
    if (!socketRef.current || !activeFriend) return;
    if (!typingSentRef.current) {
      socketRef.current.emit("typing", { receiverId: activeFriend.id, typing: true });
      typingSentRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit("typing", { receiverId: activeFriend.id, typing: false });
      }
      typingSentRef.current = false;
      typingTimeoutRef.current = null;
    }, 1200);
  };

  // ── Attachment handlers ──────────────────────────────────────

  const handlePaperclipClick = () => {
    if (!activeFriend) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    setAttachmentPreview({
      file,
      previewUrl,
      fileType: isImage ? "image" : "file",
      name: file.name,
      size: file.size,
    });
  };

  const clearAttachment = () => {
    if (attachmentPreview?.previewUrl) {
      URL.revokeObjectURL(attachmentPreview.previewUrl);
    }
    setAttachmentPreview(null);
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Send ────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e.preventDefault();

    if (!activeFriend) {
      setError("Please select a chat first.");
      return;
    }

    const hasText = messageText.trim();
    const hasAttachment = !!attachmentPreview;

    if (!hasText && !hasAttachment) return;

    if (socketRef.current) {
      socketRef.current.emit("typing", { receiverId: activeFriend.id, typing: false });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    typingSentRef.current = false;

    const messageToSend = hasText ? messageText.trim() : null;
    const tempId = `temp-${Date.now()}`;

    const optimisticMsg = {
      id: tempId,
      sender: "me",
      text: messageToSend,
      time: getCurrentTime(),
      status: "sent",
      replyToMessage: replyingToMessage,
      reactions: [],
      myReaction: null,
      attachment: hasAttachment
        ? {
            url: attachmentPreview.previewUrl || null,
            fileType: attachmentPreview.fileType,
            originalName: attachmentPreview.name,
            size: attachmentPreview.size,
            isUploading: true,
          }
        : null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");
    setShowEmoji(false);
    setError("");

    let uploadedAttachment = null;

    try {
      if (hasAttachment) {
        setUploading(true);
        const uploadRes = await uploadAttachment(attachmentPreview.file);
        uploadedAttachment = uploadRes.data;
        setUploading(false);
      }

      const response = await sendMessage(
        activeFriend.id,
        messageToSend,
        replyingToMessage?.id,
        uploadedAttachment
      );
      const savedMessage = response.data;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                id: savedMessage.id,
                sender: "me",
                text: savedMessage.message,
                time: new Date(savedMessage.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                replyToMessage: savedMessage.reply_to_message || savedMessage.reply_to || null,
                reactions: savedMessage.reactions || [],
                myReaction: savedMessage.my_reaction || null,
                attachment: savedMessage.attachment || null,
              }
            : msg
        )
      );

      setReplyingToMessage(null);
      clearAttachment();
    } catch (err) {
      setUploading(false);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(err.response?.data?.message || "Failed to send message.");
    }
  };

  const handleChatChange = (friend) => {
    setActiveFriend(friend);
    setShowSidebar(false);
    navigate(`/chat/${friend.id}`, { state: { friend } });
  };

  const handleReply = (message) => {
    setReplyingToMessage({
      id: message.id,
      text: message.text,
      sender: message.sender,
    });
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const response = await toggleReaction(messageId, emoji);
      const updated = response.data;

      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.id) === String(messageId)
            ? {
                ...msg,
                reactions: updated.reactions || msg.reactions || [],
                myReaction: updated.my_reaction || null,
              }
            : msg
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update reaction.");
    }
  };

  // ── Edit handlers ────────────────────────────────────────────

  const handleEditStart = (msg) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text || "");
    setOpenActionId(null);
  };

  const handleEditSave = async (messageId) => {
    if (!editingText.trim()) return;
    try {
      await editMessage(messageId, editingText.trim());
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? { ...m, text: editingText.trim(), edited: true }
            : m
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to edit message.");
    }
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  // ── Delete handler ───────────────────────────────────────────

  const handleDelete = async (messageId, scope) => {
    try {
      await deleteMessage(messageId, scope);
      if (scope === "everyone") {
        // Mark deleted in place — both parties see "This message was deleted"
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(messageId)
              ? { ...m, text: null, deleted: true, attachment: null }
              : m
          )
        );
      } else {
        // "Delete for me" — remove from local state only
        setMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId)));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete message.");
    }
    setOpenActionId(null);
  };

  const renderStatus = (isOnline) => (isOnline ? "Online" : "Offline");

  const openProfileDrawer = async () => {
    setShowProfile(true);
    setFriendProfile(null);
    if (!activeFriend) return;
    setProfileLoading(true);
    try {
      const res = await getFriendProfile(activeFriend.id);
      setFriendProfile(res.data);
    } catch {
      // Fallback: use whatever is already in activeFriend
      setFriendProfile(activeFriend);
    } finally {
      setProfileLoading(false);
    }
  };

  const shouldShowTimestamp = (messages, index) => {
    if (index === 0) return true;
    return messages[index].time !== messages[index - 1].time;
  };

  // ── Attachment renderer ───────────────────────────────────────

  const renderAttachment = (attachment, isMe) => {
    if (!attachment) return null;

    if (attachment.fileType === "image") {
      return (
        <div className={`attachment-image-wrapper ${attachment.isUploading ? "uploading" : ""}`}>
          {attachment.isUploading && (
            <div className="attachment-uploading-overlay">
              <div className="upload-spinner" />
            </div>
          )}
          <img
            src={attachment.url}
            alt={attachment.originalName || "image"}
            className="attachment-image"
            onClick={() => !attachment.isUploading && window.open(attachment.url, "_blank")}
          />
        </div>
      );
    }

    return (
      <a
        href={attachment.isUploading ? undefined : attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`attachment-file ${isMe ? "attachment-file-me" : "attachment-file-other"} ${attachment.isUploading ? "uploading" : ""}`}
        onClick={(e) => attachment.isUploading && e.preventDefault()}
      >
        <div className="attachment-file-icon">
          {attachment.isUploading ? (
            <div className="upload-spinner" />
          ) : (
            <FileText size={22} />
          )}
        </div>
        <div className="attachment-file-info">
          <span className="attachment-file-name">{attachment.originalName || "File"}</span>
          <span className="attachment-file-size">
            {attachment.isUploading ? "Uploading..." : formatBytes(attachment.size || 0)}
          </span>
        </div>
        {!attachment.isUploading && (
          <Download size={16} className="attachment-download-icon" />
        )}
      </a>
    );
  };

  return (
    <div className="chat-page">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`chat-sidebar ${showSidebar ? "show" : ""}`}>
        <div className="chat-sidebar-header">
          <h2>Chats</h2>
          <button type="button" className="sidebar-menu-btn">
            <MoreVertical size={22} />
          </button>
        </div>

        <div className="chat-search">
          <Search size={16} color="#94a3b8" />
          <input type="text" placeholder="Search chats..." disabled />
        </div>

        <div className="chat-list">
          {friends.length === 0 ? (
            <div className="no-chats">No friends found yet.</div>
          ) : (
            friends.map((friend) => (
              <button
                key={friend.id}
                className={`chat-user ${activeFriend?.id === friend.id ? "active" : ""}`}
                onClick={() => handleChatChange(friend)}
              >
                <div className="avatar-wrapper">
                  <img
                    src={`https://i.pravatar.cc/100?img=${friend.id}`}
                    alt={friend.name}
                  />
                  <span
                    className={`status-dot ${friend.is_online ? "online" : "offline"}`}
                  />
                </div>

                <div className="chat-user-info">
                  <div className="chat-user-name-row">
                    <h3>{friend.name}</h3>
                    {friend.last_message_time && (
                      <span className="chat-user-time">{friend.last_message_time}</span>
                    )}
                  </div>
                  <div className="chat-user-preview-row">
                    <p>{friend.last_message || friend.username || "Say hello!"}</p>
                    {friend.is_online && <span className="online-indicator" />}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-user-title">
            <button
              className="back-btn"
              type="button"
              onClick={() => setShowSidebar(true)}
            >
              <Menu size={20} />
            </button>

            <div className="avatar-wrapper">
              <img
                src={
                  activeFriend
                    ? `https://i.pravatar.cc/100?img=${activeFriend.id}`
                    : "https://i.pravatar.cc/100?img=32"
                }
                alt={activeFriend?.name || "Select a chat"}
              />
              {activeFriend && (
                <span
                  className={`status-dot ${activeFriend.is_online ? "online" : "offline"}`}
                />
              )}
            </div>

            <div
              className={activeFriend ? "chat-user-title-info clickable" : "chat-user-title-info"}
              onClick={() => activeFriend && openProfileDrawer()}
              title={activeFriend ? "View profile" : ""}
            >
              <h3>{activeFriend?.name || "Select a chat"}</h3>
              <p>
                {activeFriend
                  ? friendTyping
                    ? "Typing..."
                    : renderStatus(activeFriend?.is_online)
                  : "Choose a friend to start chat"}
              </p>
            </div>
          </div>

          <div className="chat-actions">
            <button type="button" className="header-action-btn">
              <Phone size={20} />
            </button>
            <button type="button" className="header-action-btn">
              <Video size={21} />
            </button>
            <button type="button" className="header-action-btn">
              <MoreVertical size={21} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <section className="chat-messages">
          {loading && <div className="loading">Loading conversation...</div>}
          {error && <div className="chat-error">{error}</div>}

          {!loading && !activeFriend && (
            <div className="empty-message">
              Select a friend from the left sidebar to view messages.
            </div>
          )}

          {!loading && activeFriend && messages.length === 0 && (
            <div className="empty-message">No messages yet. Send the first message.</div>
          )}

          {!loading &&
            messages.map((msg, index) => {
              const isMe = msg.sender === "me";
              const isHovered = String(hoveredMessageId) === String(msg.id);
              const isOpen = String(openActionId) === String(msg.id);
              const showActions = isHovered || isOpen;
              const showTimestamp = shouldShowTimestamp(messages, index);
              const isEditing = String(editingMessageId) === String(msg.id);

              const toolbarStyle = {
                position: "absolute",
                top: -48,
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: showActions ? 1 : 0,
                transform: showActions
                  ? "translateY(0) scale(1)"
                  : "translateY(6px) scale(0.97)",
                transition: "opacity 160ms ease, transform 160ms ease",
                pointerEvents: showActions ? "auto" : "none",
                zIndex: 40,
                ...(isMe ? { right: 0 } : { left: 0 }),
              };

              return (
                <div key={msg.id}>
                  {showTimestamp && (
                    <div className="message-timestamp-pill">
                      <span>{msg.time}</span>
                    </div>
                  )}

                  <div
                    className={`message-row ${isMe ? "me" : "other"}`}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                    style={{ position: "relative" }}
                  >
                    <div className="message-inner" style={{ position: "relative" }}>
                      {/* Reaction + reply toolbar — hidden for deleted messages */}
                      {!msg.deleted && (
                        <div
                          className="message-actions"
                          style={toolbarStyle}
                          aria-hidden={!showActions}
                        >
                          {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className={`reaction-btn ${
                                msg.myReaction === emoji ? "active" : ""
                              }`}
                              onClick={() => handleReaction(msg.id, emoji)}
                              aria-label={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          <div className="action-divider" />
                          <button
                            type="button"
                            className="reply-action"
                            onClick={() => handleReply(msg)}
                          >
                            Reply
                          </button>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`message-bubble ${isMe ? "me-bubble" : "other-bubble"} ${msg.deleted ? "deleted-bubble" : ""}`}
                      >
                        {/* Three-dot options button */}
                        {!msg.deleted && !isEditing && (
                          <button
                            className="message-options"
                            type="button"
                            onClick={() => setOpenActionId(isOpen ? null : msg.id)}
                            aria-label="Options"
                          >
                            <MoreVertical size={14} />
                          </button>
                        )}

                        {/* ── Dropdown menu ── */}
                        {isOpen && !msg.deleted && (
                          <div className={`message-dropdown ${isMe ? "dropdown-me" : "dropdown-other"}`}>
                            {/* Edit — only sender, only text messages */}
                            {isMe && msg.text && (
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => handleEditStart(msg)}
                              >
                                <Pencil size={13} />
                                Edit
                              </button>
                            )}

                            {/* Delete for me — anyone */}
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleDelete(msg.id, "me")}
                            >
                              <Trash2 size={13} />
                              Delete for me
                            </button>

                            {/* Delete for everyone — sender only */}
                            {isMe && (
                              <button
                                type="button"
                                className="dropdown-item dropdown-item-danger"
                                onClick={() => handleDelete(msg.id, "everyone")}
                              >
                                <Trash2 size={13} />
                                Delete for everyone
                              </button>
                            )}
                          </div>
                        )}

                        {/* Reply preview */}
                        {msg.replyToMessage && (
                          <div className="message-reply-preview">
                            <div className="reply-author">
                              {msg.replyToMessage.sender_name ||
                                (msg.replyToMessage.sender === "me"
                                  ? "You"
                                  : activeFriend?.name)}
                            </div>
                            <div className="reply-snippet">
                              {msg.replyToMessage.message ||
                                msg.replyToMessage.text}
                            </div>
                          </div>
                        )}

                        {/* Attachment — hidden when deleted */}
                        {!msg.deleted && msg.attachment && renderAttachment(msg.attachment, isMe)}

                        {/* Message body — deleted / editing / normal */}
                        {msg.deleted ? (
                          <div className="message-text deleted-text">
                            🚫 This message was deleted
                          </div>
                        ) : isEditing ? (
                          <div className="edit-input-wrapper">
                            <input
                              className="edit-input"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave(msg.id);
                                if (e.key === "Escape") handleEditCancel();
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="edit-save-btn"
                              onClick={() => handleEditSave(msg.id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="edit-cancel-btn"
                              onClick={handleEditCancel}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          msg.text && (
                            <div className="message-text">
                              {msg.text}
                              {msg.edited && (
                                <span className="edited-label"> (edited)</span>
                              )}
                            </div>
                          )
                        )}

                        <div className="message-meta">
                          {msg.time}
                          {isMe && <span className="read-ticks"> ✓✓</span>}
                        </div>

                        {/* Reaction pills */}
                        {!msg.deleted && msg.reactions && msg.reactions.length > 0 && (
                          <div className="reaction-summary">
                            {msg.reactions.map((reaction) => (
                              <span
                                key={reaction.emoji}
                                className="reaction-pill"
                              >
                                {reaction.emoji} {reaction.count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          <div ref={messagesEndRef} />
        </section>

        {/* Input */}
        <div className="chat-input-wrapper">
          {showEmoji && (
            <div className="emoji-picker">
              <EmojiPicker
                onEmojiClick={(emojiData) =>
                  setMessageText((prev) => prev + emojiData.emoji)
                }
              />
            </div>
          )}

          {/* Attachment preview bar */}
          {attachmentPreview && (
            <div className="attachment-preview-bar">
              <div className="attachment-preview-inner">
                {attachmentPreview.fileType === "image" ? (
                  <img
                    src={attachmentPreview.previewUrl}
                    alt="preview"
                    className="attachment-preview-thumb"
                  />
                ) : (
                  <div className="attachment-preview-icon">
                    <FileText size={20} />
                  </div>
                )}
                <div className="attachment-preview-info">
                  <span className="attachment-preview-name">{attachmentPreview.name}</span>
                  <span className="attachment-preview-size">
                    {formatBytes(attachmentPreview.size)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="attachment-preview-remove"
                onClick={clearAttachment}
                aria-label="Remove attachment"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {replyingToMessage && (
            <div className="reply-preview-bar">
              <div className="reply-preview-content">
                <span className="reply-preview-label">
                  Replying to{" "}
                  {replyingToMessage.sender === "me"
                    ? "You"
                    : activeFriend?.name || "Them"}
                </span>
                <button
                  type="button"
                  className="reply-preview-close"
                  onClick={() => setReplyingToMessage(null)}
                >
                  ×
                </button>
              </div>
              <div className="reply-preview-text">{replyingToMessage.text}</div>
            </div>
          )}

          <form className="message-input-area" onSubmit={handleSend}>
            <button
              type="button"
              className="input-icon"
              onClick={() => setShowEmoji(!showEmoji)}
            >
              <Smile size={20} />
            </button>

            <button
              type="button"
              className={`input-icon ${attachmentPreview ? "input-icon-active" : ""}`}
              onClick={handlePaperclipClick}
              disabled={!activeFriend || uploading}
              title="Attach a file"
            >
              <Paperclip size={20} />
            </button>

            <input
              type="text"
              placeholder={
                uploading
                  ? "Uploading..."
                  : attachmentPreview
                  ? "Add a caption (optional)..."
                  : "Type your message..."
              }
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                handleTyping();
              }}
              disabled={!activeFriend || uploading}
            />

            <button
              type="submit"
              className="send-btn"
              disabled={
                !activeFriend ||
                uploading ||
                (!messageText.trim() && !attachmentPreview)
              }
            >
              {uploading ? (
                <div className="upload-spinner send-spinner" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      </main>

      {/* ── FRIEND PROFILE DRAWER ── */}
      {showProfile && activeFriend && (
        <>
          <div className="profile-drawer-overlay" onClick={() => setShowProfile(false)} />
          <aside className="profile-drawer">
            <button
              className="profile-drawer-close"
              onClick={() => setShowProfile(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="profile-drawer-banner" />

            <div className="profile-drawer-body">
              {profileLoading ? (
                <div className="profile-drawer-loading">
                  <div className="upload-spinner" />
                  <p>Loading profile…</p>
                </div>
              ) : (
                <>
                  <div className="profile-drawer-avatar-wrap">
                    <img
                      src={
                        (friendProfile || activeFriend).avatar ||
                        `https://i.pravatar.cc/150?img=${activeFriend.id}`
                      }
                      alt={activeFriend.name}
                      className="profile-drawer-avatar"
                    />
                    <span className={`profile-drawer-dot ${activeFriend.is_online ? "online" : "offline"}`} />
                  </div>

                  <h2 className="profile-drawer-name">{activeFriend.name}</h2>
                  <p className="profile-drawer-username">@{activeFriend.username}</p>

                  <span className={`profile-drawer-status-pill ${activeFriend.is_online ? "online" : "offline"}`}>
                    {activeFriend.is_online ? "🟢 Online" : "⚫ Offline"}
                  </span>

                  {/* Bio */}
                  {(friendProfile?.bio || activeFriend.bio) && (
                    <div className="profile-drawer-section">
                      <p className="profile-drawer-section-label">Bio</p>
                      <p className="profile-drawer-bio">
                        {friendProfile?.bio || activeFriend.bio}
                      </p>
                    </div>
                  )}

                  {/* Current Mood / Status */}
                  {(friendProfile?.mood || friendProfile?.status || activeFriend.mood || activeFriend.status) && (
                    <div className="profile-drawer-section">
                      <p className="profile-drawer-section-label">Current Mood</p>
                      <div className="profile-drawer-mood">
                        {(() => {
                          const mood = friendProfile?.mood || friendProfile?.status || activeFriend.mood || activeFriend.status;
                          const moodMap = {
                            "Free to Chat": "🟢",
                            "free_to_chat": "🟢",
                            "Studying": "📚",
                            "studying": "📚",
                            "Gaming": "🎮",
                            "gaming": "🎮",
                            "Busy": "🔴",
                            "busy": "🔴",
                          };
                          const emoji = moodMap[mood] || "💬";
                          const label = mood.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                          return (
                            <span className="profile-drawer-mood-pill">
                              {emoji} {label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="profile-drawer-divider" />

                  <button
                    className="profile-drawer-msg-btn"
                    onClick={() => setShowProfile(false)}
                  >
                    💬 Send Message
                  </button>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default Chat;