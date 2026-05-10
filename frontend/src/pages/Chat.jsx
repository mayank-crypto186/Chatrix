import { useState, useRef, useEffect } from "react";
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

const chats = [
  {
    id: 1,
    name: "Aayushi",
    status: "online",
    lastMessage: "See you tomorrow!",
    avatar: "https://i.pravatar.cc/100?img=41",
  },
  {
    id: 2,
    name: "Rishit",
    status: "online",
    lastMessage: "Okay done 👍",
    avatar: "https://i.pravatar.cc/100?img=43",
  },
  {
    id: 3,
    name: "Shivani",
    status: "away",
    lastMessage: "I will check it.",
    avatar: "https://i.pravatar.cc/100?img=44",
  },
  {
    id: 4,
    name: "Anisha",
    status: "online",
    lastMessage: "Let’s work on frontend.",
    avatar: "https://i.pravatar.cc/100?img=45",
  },
];

const initialMessages = [
  { id: 1, sender: "other", text: "Hey! Are you working on Chatrix?", time: "10:20 AM" },
  { id: 2, sender: "me", text: "Yes, building the chat UI now.", time: "10:21 AM", status: "seen" },
  { id: 3, sender: "other", text: "Great! It looks clean.", time: "10:22 AM" },
];

function Chat() {
  const [activeChat, setActiveChat] = useState(chats[0]);
  const [messages, setMessages] = useState(initialMessages);
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const messagesEndRef = useRef(null);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();

    if (!messageText.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: "me",
      text: messageText,
      time: getCurrentTime(),
      status: "delivered",
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");
    setShowEmoji(false);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      const reply = {
        id: Date.now() + 1,
        sender: "other",
        text: "Nice 👍",
        time: getCurrentTime(),
      };

      setMessages((prev) => [...prev, reply]);
    }, 1500);
  };

  const handleChatChange = (chat) => {
    setActiveChat(chat);
    setShowSidebar(false);
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
          <input type="text" placeholder="Search chats..." />
        </div>

        <div className="chat-list">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`chat-user ${activeChat.id === chat.id ? "active" : ""}`}
              onClick={() => handleChatChange(chat)}
            >
              <div className="avatar-wrapper">
                <img src={chat.avatar} alt={chat.name} />
                <span className={`status-dot ${chat.status}`}></span>
              </div>

              <div className="chat-user-info">
                <h3>{chat.name}</h3>
                <p>{chat.lastMessage}</p>
              </div>
            </button>
          ))}
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

            <img src={activeChat.avatar} alt={activeChat.name} />
            <div>
              <h3>{activeChat.name}</h3>
              <p>{activeChat.status === "online" ? "Online" : "Away"}</p>
            </div>
          </div>

          <div className="chat-actions">
            <Phone size={21} />
            <Video size={22} />
            <MoreVertical size={22} />
          </div>
        </header>

        <section className="messages-area">
          {messages.map((msg) => (
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

          {isTyping && (
            <div className="typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}

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
              onChange={(e) => setMessageText(e.target.value)}
            />

            <button type="submit" className="send-btn">
              <Send size={20} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Chat;