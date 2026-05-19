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

      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.log(error);
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
      setSearchResults(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSendRequest = async (receiverId) => {
    try {
      await sendFriendRequest(receiverId);
      setMessage("Friend request sent");
      setSearchResults([]);
      setSearch("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Request failed");
    }
  };

  const handleAccept = async (requestId) => {
    await acceptFriendRequest(requestId);
    loadDashboardData();
  };

  const handleReject = async (requestId) => {
    await rejectFriendRequest(requestId);
    loadDashboardData();
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
      <header className="dashboard-header">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white text-xl">
            💬
          </div>
          <h1 className="text-3xl font-bold">Chatrix</h1>
        </div>

        <div className="relative w-[430px]">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search friends by username..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-400"
          />

          {searchResults.length > 0 && (
            <div className="absolute top-14 left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              {searchResults.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={person.name} />
                    <div>
                      <h4 className="font-semibold">{person.name}</h4>
                      <p className="text-sm text-slate-500">@{person.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendRequest(person.id)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button className="px-5 py-3 rounded-2xl border bg-white flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500"></span>
            Status
          </button>

          <div className="relative">
            <Bell />
            {requests.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </div>

          <button onClick={logout} className="text-red-500">
            <LogOut />
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="sidebar">
          <button className="new-chat-btn flex items-center gap-2 mb-6 px-4 py-3 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white font-semibold">
            <Plus size={18} />
            New Chat
          </button>

          <nav className="space-y-2">
            <SidebarItem icon={<Home />} text="Home" active />
            <SidebarItem icon={<MessageCircle />} text="Chats" badge={friends.length} />
            <SidebarItem icon={<Clock />} text="Stories" />
            <SidebarItem icon={<Phone />} text="Calls" />
            <SidebarItem icon={<UserPlus />} text="Friend Requests" badge={requests.length} />
            <SidebarItem icon={<Star />} text="Starred Messages" />
            <SidebarItem icon={<Settings />} text="Settings" />
          </nav>

          <div className="border-t mt-7 pt-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase">
                Groups
              </h3>
              <Plus size={18} className="text-blue-600" />
            </div>

            <GroupItem name="College Friends 🎓" count="8" />
            <GroupItem name="Study Group 📚" count="5" />
            <GroupItem name="Work Team 💼" count="6" />
            <GroupItem name="Gaming Squad 🎮" count="7" />
            <GroupItem name="Close Friends ❤️" count="4" />
          </div>

          <div className="border-t mt-7 pt-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">
              Upcoming Calls
            </h3>
            <CallCard title="Study Group Call" time="Today, 7:00 PM" />
            <CallCard title="Project Discussion" time="Tomorrow, 4:30 PM" />
          </div>
        </aside>

        <main className="main">
          <div className="flex justify-between items-center mb-7">
            <div>
              <h2 className="text-3xl font-bold">
                Good Morning, {user?.name?.split(" ")[0]}! 👋
              </h2>
              <p className="text-slate-500 mt-1">
                Search username, send requests, and chat only with accepted friends.
              </p>
              {message && <p className="text-blue-600 mt-2">{message}</p>}
            </div>
          </div>

          <section className="bg-white rounded-3xl border border-slate-200 p-6 mb-6">
            <div className="flex justify-between mb-5">
              <h3 className="text-xl font-bold">Stories</h3>
              <button className="text-blue-600 font-semibold">View all</button>
            </div>

            <div className="flex gap-8">
              <Story name="Your Story" plus />
              {friends.slice(0, 6).map((friend) => (
                <Story key={friend.id} name={friend.name} />
              ))}
            </div>
          </section>

          {requests.length > 0 && (
            <section className="bg-white rounded-3xl border border-slate-200 p-6 mb-6">
              <h3 className="text-xl font-bold mb-5">Friend Requests</h3>

              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between border-b pb-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar name={req.name} />
                      <div>
                        <h4 className="font-bold">{req.name}</h4>
                        <p className="text-sm text-slate-500">
                          @{req.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-4 py-2 rounded-xl border font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white rounded-3xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold mb-5">Friends</h3>

            {friends.length === 0 ? (
              <div className="text-center py-16">
                <h3 className="text-2xl font-bold">No friends yet</h3>
                <p className="text-slate-500 mt-2">
                  Search by username and send your first friend request.
                </p>
              </div>
            ) : (
              <div>
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between py-5 border-b last:border-none"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar name={friend.name} />
                      <div>
                        <h4 className="font-bold">@{friend.username}</h4>
                        <p className="text-sm text-slate-500">{friend.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => openChat(friend)}
                        className="px-5 py-2.5 rounded-xl border text-blue-600 font-semibold"
                      >
                        Message
                      </button>
                      <MoreHorizontal className="text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, text, active, badge }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer ${
        active ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-semibold">{text}</span>
      </div>

      {badge ? (
        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function GroupItem({ name, count }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Folder size={18} className="text-blue-600" />
        <span className="font-medium">{name}</span>
      </div>

      <span className="bg-slate-100 text-xs px-2 py-1 rounded-full">
        {count}
      </span>
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

function Story({ name, plus }) {
  return (
    <div className="text-center">
      <div className="relative h-20 w-20 rounded-full p-[3px] bg-gradient-to-br from-blue-500 to-purple-500">
        <Avatar name={name} />
        {plus && (
          <span className="absolute bottom-0 right-0 bg-blue-600 text-white h-6 w-6 rounded-full flex items-center justify-center">
            +
          </span>
        )}
      </div>
      <p className="text-sm mt-2 text-slate-600">{name}</p>
    </div>
  );
}

function CallCard({ title, time }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 mb-3">
      <div className="flex gap-3">
        <div className="h-11 w-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
          <Phone size={20} />
        </div>
        <div>
          <h4 className="font-bold text-sm">{title}</h4>
          <p className="text-xs text-slate-500 mt-1">{time}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;