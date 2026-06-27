import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  MessageCircle,
  Phone,
  Bell,
  Users,
  Bookmark,
  UserPlus,
  LogOut,
  Pencil,
  Check,
} from "lucide-react";
import "../styles/Home.css";
import { getMe, updateMyStatus } from "../api/authApi";
import { getFriends, getFriendRequests } from "../api/friendApi";
import { logoutUser } from "../api/authApi";

const MOOD_OPTIONS = [
  { label: "Free to Chat", emoji: "🟢" },
  { label: "Studying",     emoji: "📚" },
  { label: "Gaming",       emoji: "🎮" },
  { label: "Busy",         emoji: "🔴" },
];

function HomePage() {
  const navigate = useNavigate();

  const [profile, setProfile]         = useState(null);
  const [friends, setFriends]         = useState([]);
  const [requests, setRequests]       = useState([]);
  const [activeMood, setActiveMood]   = useState("Free to Chat");
  const [moodSaving, setMoodSaving]   = useState(false);
  const [moodSaved, setMoodSaved]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, friendsRes, requestsRes] = await Promise.all([
          getMe(),
          getFriends(),
          getFriendRequests(),
        ]);
        setProfile(meRes.data);
        setFriends(friendsRes.data || []);
        setRequests(requestsRes.data || []);
        if (meRes.data?.mood_status) setActiveMood(meRes.data.mood_status);
      } catch (err) {
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleMoodChange = async (mood) => {
    setActiveMood(mood);
    setMoodSaving(true);
    setMoodSaved(false);
    try {
      await updateMyStatus(mood);
      setMoodSaved(true);
      setTimeout(() => setMoodSaved(false), 2000);
    } catch (err) {
      setError("Could not update status.");
    } finally {
      setMoodSaving(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) await logoutUser({ headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.log("Logout error:", err);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const onlineFriends = friends.filter((f) => f.is_online);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="home-page">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="brand">💫 Chatrix</div>

        <div className="profile-card">
          <img
            src={`https://i.pravatar.cc/100?img=${profile?.id || 32}`}
            alt="profile"
          />
          <div>
            <h3>{profile?.name || "User"}</h3>
            <p>{profile?.is_online ? "Online" : "Offline"}</p>
          </div>
        </div>

        <nav>
          <a className="active" onClick={() => navigate("/home")}>
            <Home /> Home
          </a>
          <a onClick={() => navigate("/dashboard")}>
            <MessageCircle /> Chat
          </a>
          <a>
            <Bell /> Stories
          </a>
          <a>
            <Phone /> Calls
          </a>
          <a onClick={() => navigate("/requests")}>
            <UserPlus /> Requests
            {requests.length > 0 && (
              <span className="nav-badge">{requests.length}</span>
            )}
          </a>
          <a>
            <Users /> Inner Circle
          </a>
          <a>
            <Bookmark /> Pinned Chat
          </a>
          <a onClick={logout}>
            <LogOut /> Logout
          </a>
        </nav>
      </aside>

      {/* ── MAIN ── */}
      <main className="home-main">
        {loading && <div className="home-loading">Loading your profile...</div>}
        {error && <div className="home-error">{error}</div>}

        {!loading && profile && (
          <>
            {/* Profile Hero Card */}
            <section className="profile-hero">
              <div className="hero-banner" />

              <div className="hero-body">
                <div className="hero-avatar-wrap">
                  <img
                    src={`https://i.pravatar.cc/150?img=${profile.id || 32}`}
                    alt={profile.name}
                    className="hero-avatar"
                  />
                  <span className="hero-status-dot online" />
                </div>

                <div className="hero-info">
                  <h1 className="hero-name">{profile.name}</h1>
                  <p className="hero-username">@{profile.username}</p>
                  <p className="hero-bio">
                    {profile.bio || "Hey there! I'm using Chatrix 💬"}
                  </p>
                </div>

                <button
                  className="edit-profile-btn"
                  onClick={() => navigate("/edit-profile")}
                >
                  <Pencil size={15} /> Edit Profile
                </button>
              </div>

              {/* Stats Row */}
              <div className="hero-stats">
                <div className="stat-card purple">
                  <span className="stat-value">{friends.length}</span>
                  <span className="stat-label">Friends</span>
                </div>
                <div className="stat-card blue">
                  <span className="stat-value">{onlineFriends.length}</span>
                  <span className="stat-label">Online Now</span>
                </div>
                <div className="stat-card pink">
                  <span className="stat-value">{memberSince}</span>
                  <span className="stat-label">Member Since</span>
                </div>
              </div>
            </section>

            {/* Mood / Status Setter */}
            <section className="home-section">
              <div className="section-head">
                <h2>My Status</h2>
                {moodSaving && <span className="mood-saving">Saving...</span>}
                {moodSaved && (
                  <span className="mood-saved">
                    <Check size={14} /> Saved!
                  </span>
                )}
              </div>

              <div className="mood-grid">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.label}
                    className={`mood-btn ${activeMood === m.label ? "active" : ""}`}
                    onClick={() => handleMoodChange(m.label)}
                  >
                    <span className="mood-emoji">{m.emoji}</span>
                    <span className="mood-label">{m.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Active Friends Now */}
            <section className="home-section">
              <div className="section-head">
                <h2>Active Now</h2>
                <span className="online-count">{onlineFriends.length} online</span>
              </div>

              {onlineFriends.length === 0 ? (
                <p className="home-empty">None of your friends are online right now.</p>
              ) : (
                <div className="active-friends-row">
                  {onlineFriends.map((friend, index) => (
                    <button
                      key={friend.id}
                      className="active-friend"
                      onClick={() =>
                        navigate(`/chat/${friend.id}`, { state: { friend } })
                      }
                    >
                      <div className="active-avatar-wrap">
                        <img
                          src={`https://i.pravatar.cc/100?img=${index + 10}`}
                          alt={friend.name}
                        />
                        <span className="active-dot" />
                      </div>
                      <span className="active-name">
                        {friend.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ── RIGHT PANEL ── */}
      <aside className="home-right">
        <div className="widget">
          <h2>Quick Info</h2>
          <div className="info-row">
            <span>👥 Friends</span>
            <strong>{friends.length}</strong>
          </div>
          <div className="info-row">
            <span>🟢 Online</span>
            <strong>{onlineFriends.length}</strong>
          </div>
          <div className="info-row">
            <span>📅 Joined</span>
            <strong>{memberSince}</strong>
          </div>
        </div>

        <div className="widget">
          <h2>Current Mood</h2>
          {MOOD_OPTIONS.map((m) => (
            <div
              key={m.label}
              className={`mood-widget-item ${activeMood === m.label ? "active" : ""}`}
              onClick={() => handleMoodChange(m.label)}
            >
              {m.emoji} {m.label}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default HomePage;