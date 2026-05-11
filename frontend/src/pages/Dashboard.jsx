import {
  Home,
  MessageCircle,
  Phone,
  Bell,
  Search,
  Plus,
  MoreHorizontal,
  Users,
  Bookmark,
  UserPlus,
  Gamepad2,
} from "lucide-react";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
} from "../api/friendApi";

const friends = [
  { name: "Aayushi", status: "online" },
  { name: "Rishit", status: "online" },
  { name: "Shivani", status: "away" },
  { name: "Anisha", status: "online" },
];

const stories = ["Shivam", "Nishant", "Harshika"];

function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">💫 Chatrix</div>

        <div className="profile-card">
          <img src="https://i.pravatar.cc/100?img=32" />
          <div>
            <h3>Mayank</h3>
            <p>Busy 🔴</p>
          </div>
        </div>

        <nav>
          <a><Home /> Home</a>
          <a className="active" onClick={() => navigate("/chat")}>
  <MessageCircle /> Chat
</a>
          <a><Bell /> Stories</a>
          <a><Phone /> Calls</a>
          <a><UserPlus /> Requests</a>
          <a><Users /> Inner Circle</a>
          <a><Bookmark /> Pinned Chat</a>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="search">
            <Search size={20} />
            <input placeholder="Search..." />
          </div>

          <div className="top-icons">
            <Bell />
            <MessageCircle />
            <img src="https://i.pravatar.cc/100?img=32" />
          </div>
        </header>

        <section className="stories">
          <h2>Stories</h2>
          <div className="story-row">
            <div className="story add">
              <Plus />
              <span>Add Story</span>
            </div>

            {stories.map((story, index) => (
              <div className="story" key={story}>
                <img src={`https://i.pravatar.cc/100?img=${index + 20}`} />
                <span>{story}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="friends-box">
          <div className="section-title">
            <h2>Friends</h2>
            <button><Plus size={18} /> Message</button>
          </div>

          {friends.map((friend, index) => (
            <div className="friend-card" key={friend.name}>
              <div className="friend-info">
                <img src={`https://i.pravatar.cc/100?img=${index + 40}`} />
                <h3>{friend.name}</h3>
              </div>

              <button
                className="msg-btn"
                onClick={() => navigate("/chat")}
              >
                Message
              </button>
              <button className="more-btn"><MoreHorizontal /></button>
            </div>
          ))}
        </section>
      </main>

      <aside className="right-panel">
        <div className="widget">
          <h2>Stories</h2>
          <p>Anushna <span>1h</span></p>
          <p>Rahul <span>10m</span></p>
        </div>

        <div className="widget">
          <h2>Trending Posts</h2>
          <div className="trend">Weekend Getaway 🌅</div>
          <div className="trend">Tech Trends 2026 📱</div>
        </div>

        <div className="widget">
          <h2>Status</h2>
          <p>📚 Studying</p>
          <p><Gamepad2 size={18} /> Gaming</p>
          <p>🟢 Free to Chat</p>
          <p>🔴 Busy</p>
        </div>
      </aside>
    </div>
  );
}

export default Dashboard;