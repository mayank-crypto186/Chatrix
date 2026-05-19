import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  ArrowLeft,
  Menu,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import "./Chat.css";
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

  const messagesEndRef = useRef(null);

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
    }
  }, [location.state?.friend, activeFriend?.id]);

  const handleSend = async (e) => {
    e.preventDefault();

    if (!activeFriend) {
      setError("Please select a chat first.");
      return;
    }

    if (!messageText.trim()) return;

    const messageToSend = messageText.trim();
    const newMessage = {
      id: Date.now(),
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
      await sendMessage(activeFriend.id, messageToSend);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message.");
    }
  };

  const handleChatChange = (friend) => {
    setActiveFriend(friend);
    setShowSidebar(false);
    navigate(`/chat/${friend.id}`, { state: { friend } });
  };

  const renderStatus = (status) => {
    if (status === "online") return "Online";
    if (status === "away") return "Away";
    return "Offline";
  };

  return (
    <div className="chat-page">
      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />
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
                  <img src={`https://i.pravatar.cc/100?img=${friend.id}`} alt={friend.name} />
                  <span className={`status-dot ${friend.status || "away"}`}></span>
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
            <button className="back-btn" type="button" onClick={() => setShowSidebar(true)}>
              <Menu size={20} />
            </button>

            <img
              src={activeFriend ? `https://i.pravatar.cc/100?img=${activeFriend.id}` : "https://i.pravatar.cc/100?img=32"}
              alt={activeFriend?.name || "Select a chat"}
            />
            <div>
              <h3>{activeFriend?.name || "Select a chat"}</h3>
              <p>{activeFriend ? renderStatus(activeFriend.status) : "Choose a friend to start chat"}</p>
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
            <div className="empty-message">Select a friend from the left sidebar to view messages.</div>
          )}
          {!loading && activeFriend && messages.length === 0 && (
            <div className="empty-message">No messages yet. Send the first message.</div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.sender === "me" ? "me" : "other"}`}>
              <div className="message-bubble">
                <p>{msg.text}</p>
                <span>{msg.time} {msg.sender === "me" ? "✓✓" : ""}</span>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </section>

        <div className="chat-input-wrapper">
          {showEmoji && (
            <div className="emoji-picker">
              <EmojiPicker onEmojiClick={(emojiData) => setMessageText((prev) => prev + emojiData.emoji)} />
            </div>
          )}

          <form className="message-input-area" onSubmit={handleSend}>
            <button type="button" className="input-icon" onClick={() => setShowEmoji(!showEmoji)}>
              <Smile size={21} />
            </button>

            <button type="button" className="input-icon">
              <Paperclip size={21} />
            </button>

            <input
              type="text"
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
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
