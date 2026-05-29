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
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import "../styles/Chat.css";
import { getConversation, sendMessage, toggleReaction } from "../api/messageApi";
import { getFriends } from "../api/friendApi";

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

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeFriendRef = useRef(activeFriend);
  const typingTimeoutRef = useRef(null);
  const typingSentRef = useRef(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);

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

    const emitTyping = (typing) => {
      if (!socketRef.current || !activeFriendRef.current) return;
      socketRef.current.emit("typing", {
        receiverId: activeFriendRef.current.id,
        typing,
      });
    };

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      socket.emit("joinUser", user.id);
      console.log("Joined user room", user.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection failed:", err.message);
    });

    socket.on("newMessage", (message) => {
      console.log("newMessage received", message);
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

        // If this message was just optimistically added by the sender, replace the temp
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
        };

        return [...prev, incoming];
      });
    });

    socket.on("typing", (payload) => {
      const currentFriend = activeFriendRef.current;
      if (!currentFriend || String(payload.from) !== String(currentFriend.id)) return;

      if (payload.typing) {
        setFriendTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
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

    // Listen for reaction updates via socket (if backend emits them)
    socket.on("reactionUpdated", (payload) => {
      // payload expected: { messageId, reactions, my_reaction }
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

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
          if (matchedFriend) {
            setActiveFriend(matchedFriend);
          }
        }
      } catch (err) {
        setError("Failed to load friends. Please refresh the page.");
      }
    };

    fetchFriends();
  }, [friendId]);

  useEffect(() => {
    if (!activeFriend) {
      return;
    }

    const fetchConversation = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getConversation(activeFriend.id);
        const conversation = response.data || [];

        const groupReactions = (reactions) => {
          if (!reactions) return [];
          if (reactions.length === 0) return [];
          // already grouped (has count)
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
          sender:
            String(message.sender_id) === String(activeFriend.id)
              ? "other"
              : "me",
          text: message.message,
          time: new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          replyToMessage: message.reply_to_message || message.reply_to || null,
          reactions: groupReactions(message.reactions || []),
          myReaction: message.my_reaction || null,
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
    if (location.state?.friend && String(location.state.friend.id) !== String(activeFriend?.id)) {
      setActiveFriend(location.state.friend);
      setFriendTyping(false);
    }
  }, [location.state?.friend, activeFriend?.id]);

  const handleTyping = () => {
    if (!socketRef.current || !activeFriend) return;
    if (!typingSentRef.current) {
      socketRef.current.emit("typing", {
        receiverId: activeFriend.id,
        typing: true,
      });
      typingSentRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit("typing", {
          receiverId: activeFriend.id,
          typing: false,
        });
      }
      typingSentRef.current = false;
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!activeFriend) {
      setError("Please select a chat first.");
      return;
    }

    if (!messageText.trim()) return;

    if (socketRef.current) {
      socketRef.current.emit("typing", {
        receiverId: activeFriend.id,
        typing: false,
      });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    typingSentRef.current = false;

    const messageToSend = messageText.trim();
    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      id: tempId,
      sender: "me",
      text: messageToSend,
      time: getCurrentTime(),
      status: "sent",
      replyToMessage: replyingToMessage,
      reactions: [],
      myReaction: null,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");
    setShowEmoji(false);
    setError("");

    try {
      const response = await sendMessage(activeFriend.id, messageToSend, replyingToMessage?.id);
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
              }
            : msg
        )
      );
      setReplyingToMessage(null);
    } catch (err) {
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

  const toggleActionPanel = (messageId) => {
    setOpenActionId((prev) => (String(prev) === String(messageId) ? null : messageId));
  };

  const renderStatus = (isOnline) => {
    return isOnline ? "Online" : "Offline";
  };

  return (
    <div className="chat-page">
      {showSidebar && (
        <div
          className="sidebar-overlay"
          onClick={() => setShowSidebar(false)}
        ></div>
      )}

      <aside className={`chat-sidebar ${showSidebar ? "show" : ""}`}>
        <div className="chat-sidebar-header">
          <h2>Chats</h2>
          <MoreVertical size={22} />
        </div>

        <div className="chat-search">
          <Search size={18} />
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
                  <span className={`status-dot ${friend.is_online ? "online" : "offline"}`}></span>
                </div>

                <div className="chat-user-info">
                  <h3>{friend.name}</h3>
                  <p>{friend.username || "Friend"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div className="chat-user-title">
            <button
              className="back-btn"
              type="button"
              onClick={() => setShowSidebar(true)}
            >
              <Menu size={20} />
            </button>

            <img
              src={
                activeFriend
                  ? `https://i.pravatar.cc/100?img=${activeFriend.id}`
                  : "https://i.pravatar.cc/100?img=32"
              }
              alt={activeFriend?.name || "Select a chat"}
            />
            <div>
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
            <Phone size={21} />
            <Video size={22} />
            <MoreVertical size={22} />
          </div>
        </header>

        <section className="chat-messages">
          {loading && <div className="loading">Loading conversation...</div>}
          {error && <div className="chat-error">{error}</div>}
          {!loading && !activeFriend && (
            <div className="empty-message">
              Select a friend from the left sidebar to view messages.
            </div>
          )}

          {!loading && activeFriend && messages.length === 0 && (
            <div className="empty-message">
              No messages yet. Send the first message.
            </div>
          )}

          {!loading && messages.map((msg) => {
            const isMe = msg.sender === "me";
            const isHovered = String(hoveredMessageId) === String(msg.id);
            const isOpen = String(openActionId) === String(msg.id);
            const showActions = isHovered || isOpen;

            const toolbarStyle = {
              position: "absolute",
              top: -44,
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: showActions ? 1 : 0,
              transform: showActions ? "translateY(0) scale(1)" : "translateY(6px) scale(0.98)",
              transition: "opacity 160ms ease, transform 160ms ease",
              pointerEvents: showActions ? "auto" : "none",
              zIndex: 40,
              ...(isMe ? { right: 0 } : { left: 0 }),
            };

            return (
              <div
                key={msg.id}
                className={`message-row ${isMe ? "me" : "other"}`}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{ position: "relative" }}
              >
                <div className="message-inner" style={{ position: "relative" }}>
                  <div className="message-actions" style={toolbarStyle} aria-hidden={!showActions}>
                    {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`reaction-btn ${msg.myReaction === emoji ? "active" : ""}`}
                        onClick={() => handleReaction(msg.id, emoji)}
                        aria-label={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="action-divider" />

                    <button type="button" className="reply-action" onClick={() => handleReply(msg)}>
                      Reply
                    </button>
                  </div>

                  <div className={`message-bubble ${isMe ? 'me-bubble' : 'other-bubble'}`}>
                    <button className="message-options" type="button" onClick={() => setOpenActionId(isOpen ? null : msg.id)} aria-label="Options">
                      <MoreVertical size={14} />
                    </button>

                    {msg.replyToMessage && (
                      <div className="message-reply-preview">
                        <div className="reply-author">{msg.replyToMessage.sender_name || (msg.replyToMessage.sender === 'me' ? 'You' : activeFriend?.name)}</div>
                        <div className="reply-snippet">{msg.replyToMessage.message || msg.replyToMessage.text}</div>
                      </div>
                    )}

                    <div className="message-text">{msg.text}</div>
                    <div className="message-meta">{msg.time} {isMe ? "✓✓" : ""}</div>

                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="reaction-summary">
                        {msg.reactions.map((reaction) => (
                          <span key={reaction.emoji} className="reaction-pill">
                            {reaction.emoji} {reaction.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef}></div>
        </section>

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

          {replyingToMessage && (
            <div className="input-reply-preview reply-preview-bar">
              <div className="input-reply-header reply-preview-content">
                Replying to {replyingToMessage.sender === "me" ? "You" : activeFriend?.name || "Them"}
                <button
                  type="button"
                  className="clear-reply reply-preview-close"
                  onClick={() => setReplyingToMessage(null)}
                >
                  ×
                </button>
              </div>
              <div className="input-reply-text">{replyingToMessage.text}</div>
            </div>
          )}

          <form className="message-input-area" onSubmit={handleSend}>
            <button
              type="button"
              className="input-icon"
              onClick={() => setShowEmoji(!showEmoji)}
            >
              <Smile size={21} />
            </button>

            <button type="button" className="input-icon">
              <Paperclip size={21} />
            </button>

            <input
              type="text"
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                handleTyping();
              }}
              disabled={!activeFriend}
            />

            <button type="submit" className="send-btn" disabled={!activeFriend || !messageText.trim()}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Chat;
