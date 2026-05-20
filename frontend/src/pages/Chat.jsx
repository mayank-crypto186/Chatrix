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
import { getConversation, sendMessage } from "../api/messageApi";
import { getFriends } from "../api/friendApi";

function Chat() {
  const { friendId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(location.state?.friend || null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
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
      socket.emit("register", user.id);
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
        if (prev.some((msg) => String(msg.id) === String(message.id))) {
          return prev;
        }

        const incoming = {
          id: message.id,
          sender: String(message.sender_id) === String(user.id) ? "me" : "other",
          text: message.message,
          time: new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
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
    e.preventDefault();

    if (!activeFriend) {
      setError("Please select a chat first.");
      return;
    }

    if (!messageText.trim()) return;

    const messageToSend = messageText.trim();
    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      id: tempId,
      sender: "me",
      text: messageToSend,
      time: getCurrentTime(),
      status: "sent",
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");
    setShowEmoji(false);
    setError("");

    try {
      const response = await sendMessage(activeFriend.id, messageToSend);
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
              }
            : msg
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message.");
    }
  };

  const handleChatChange = (friend) => {
    setActiveFriend(friend);
    setShowSidebar(false);
    navigate(`/chat/${friend.id}`, { state: { friend } });
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

        <section className="messages-area">
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

          {!loading && messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === "me" ? "me" : "other"}`}
            >
              <div className="message-bubble">
                <p>{msg.text}</p>
                <span>
                  {msg.time} {msg.sender === "me" ? "✓✓" : ""}
                </span>
              </div>
            </div>
          ))}

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
