import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import {
  Home,
  MessageCircle,
  Clock,
  Phone,
  Star,
  Settings,
  UserPlus,
  Search,
  Bell,
  Folder,
  Plus,
  MoreHorizontal,
  LogOut,
} from "lucide-react";
import {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
} from "../api/friendApi";

const stories = ["Shivam", "Nishant", "Harshika"];

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState("");

  const loadDashboardData = async () => {
    try {
      const friendsRes = await getFriends();
      const requestsRes = await getFriendRequests();

      setFriends(friendsRes.data || []);
      setRequests(requestsRes.data || []);
    } catch (error) {
      console.log(error);
      setMessage("Unable to load friends. Backend may not be running.");
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearch(value);

    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await searchUsers(value);
      setSearchResults(res.data || []);
    } catch (error) {
      console.log(error);
      setSearchResults([]);
    }
  };

  const handleSendRequest = async (receiverId) => {
    try {
      await sendFriendRequest(receiverId);
      setMessage("Friend request sent ✅");
      setSearch("");
      setSearchResults([]);
    } catch (error) {
      setMessage(error.response?.data?.message || "Request failed");
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      setMessage("Friend request accepted ✅");
      loadDashboardData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Accept failed");
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      setMessage("Friend request rejected");
      loadDashboardData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Reject failed");
    }
  };

  const openChat = (friend) => {
    navigate(`/chat/${friend.id}`, { state: { friend } });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">💫 Chatrix</div>

        <div className="profile-card">
          <img src="https://i.pravatar.cc/100?img=32" alt="profile" />
          <div>
            <h3>{user?.name || "User"}</h3>
            <p>Busy 🔴</p>
          </div>
        </div>

        <nav>
          <a>
            <Home /> Home
          </a>

          <a className="active">
            <MessageCircle /> Chat
          </a>

          <a>
            <Bell /> Stories
          </a>

          <a>
            <Phone /> Calls
          </a>

          <a>
            <UserPlus /> Requests
            {requests.length > 0 && (
              <span className="nav-badge">{requests.length}</span>
            )}
          </a>

          <a>
            <Settings /> Inner Circle
          </a>

          <a>
            <Star /> Pinned Chat
          </a>

          <a onClick={logout}>
            <LogOut /> Logout
          </a>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="search search-wrapper">
            <Search size={20} />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search users by username..."
            />

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((person) => (
                  <div className="search-result-card" key={person.id}>
                    <div>
                      <h4>{person.name}</h4>
                      <p>@{person.username}</p>
                    </div>

                    <button onClick={() => handleSendRequest(person.id)}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="top-icons">
            <div className="notification-wrapper">
              <Bell />
              {requests.length > 0 && (
                <span className="request-count">{requests.length}</span>
              )}
            </div>

            <MessageCircle />
            <img src="https://i.pravatar.cc/100?img=32" alt="profile" />
          </div>
        </header>

        {message && <p className="dashboard-message">{message}</p>}

        <section className="stories">
          <h2>Stories</h2>
          <div className="story-row">
            <div className="story add">
              <Plus />
              <span>Add Story</span>
            </div>

            {friends.length > 0
              ? friends.slice(0, 3).map((friend, index) => (
                  <div className="story" key={friend.id}>
                    <img
                      src={`https://i.pravatar.cc/100?img=${index + 20}`}
                      alt={friend.name}
                    />
                    <span>{friend.name}</span>
                  </div>
                ))
              : stories.map((story, index) => (
                  <div className="story" key={story}>
                    <img
                      src={`https://i.pravatar.cc/100?img=${index + 20}`}
                      alt={story}
                    />
                    <span>{story}</span>
                  </div>
                ))}
          </div>
        </section>

        {requests.length > 0 && (
          <section className="friends-box request-box">
            <div className="section-title">
              <h2>Friend Requests</h2>
            </div>
            <div className="request-list">
              {requests.map((request) => (
                <div className="request-card" key={request.id}>
                  <div>
                    <h4>{request.name}</h4>
                    <p>@{request.username}</p>
                  </div>
                  <div className="request-actions">
                    <button onClick={() => handleAccept(request.id)}>
                      <Check />
                    </button>
                    <button onClick={() => handleReject(request.id)}>
                      <X />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="friends-box">
          <div className="section-title">
            <h2>Friends</h2>
          </div>
          <div className="friends-list">
            {friends.map((friend) => (
              <div className="friend-card" key={friend.id}>
                <div>
                  <h4>{friend.name}</h4>
                  <p>@{friend.username}</p>
                </div>
                <button onClick={() => openChat(friend)}>Chat</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
