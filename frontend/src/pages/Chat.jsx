import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Smile, Paperclip } from "lucide-react";
import { getConversation, sendMessage } from "../api/messageApi";

function Chat() {
  const { friendId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const friend = location.state?.friend;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const loadMessages = async () => {
    try {
      const res = await getConversation(friendId);
      setMessages(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [friendId]);

  const handleSend = async (e) => {
    e.preventDefault();

    if (!text.trim()) return;

    await sendMessage(friendId, text);

    setText("");
    loadMessages();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50">
      <header className="h-20 border-b bg-white/80 backdrop-blur-xl px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")}>
            <ArrowLeft />
          </button>

          <Avatar name={friend?.name || "Friend"} />

          <div>
            <h2 className="text-xl font-bold">
              {friend?.name || "Friend"}
            </h2>
            <p className="text-sm text-green-600">Online</p>
          </div>
        </div>

        <button className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700">
          Ghost Chat
        </button>
      </header>

      <main className="h-[calc(100vh-160px)] overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 mt-20">
              No messages yet. Start your conversation 👋
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_id === user.id ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-md px-5 py-3 rounded-2xl shadow-sm ${
                    msg.sender_id === user.id
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border rounded-bl-none"
                  }`}
                >
                  <p>{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <form
        onSubmit={handleSend}
        className="h-20 border-t bg-white px-8 flex items-center gap-4"
      >
        <button type="button" className="text-slate-500">
          <Smile />
        </button>

        <button type="button" className="text-slate-500">
          <Paperclip />
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
          <Send />
        </button>
      </form>
    </div>
  );
}

function Avatar({ name }) {
  return (
    <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold">
      {name?.charAt(0)?.toUpperCase() || "U"}
      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-white rounded-full"></span>
    </div>
  );
}

export default Chat;