import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, MessageCircle, Phone, Bell, Users,
  Bookmark, UserPlus, LogOut, Camera, Check, X,
} from "lucide-react";
import "../styles/EditProfile.css";
import { getMe } from "../api/authApi";
import { uploadAvatar, updateProfile } from "../api/uploadApi";
import { getFriendRequests } from "../api/friendApi";
import { logoutUser } from "../api/authApi";

function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile]           = useState(null);
  const [requests, setRequests]         = useState([]);
  const [name, setName]                 = useState("");
  const [bio, setBio]                   = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]     = useState(null);
  const [saving, setSaving]             = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg]     = useState("");
  const [errorMsg, setErrorMsg]         = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, reqRes] = await Promise.all([getMe(), getFriendRequests()]);
        setProfile(meRes.data);
        setName(meRes.data.name || "");
        setBio(meRes.data.bio || "");
        setRequests(reqRes.data || []);
      } catch (err) {
        setErrorMsg("Failed to load profile.");
      }
    };
    load();
  }, []);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be under 5MB.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setErrorMsg("");
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    setErrorMsg("");
    try {
      const res = await uploadAvatar(avatarFile);
      setProfile((prev) => ({ ...prev, avatar: res.data.avatar }));
      setAvatarFile(null);
      setSuccessMsg("Profile picture updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await updateProfile({ name, bio });
      setProfile((prev) => ({ ...prev, ...res.data.user }));

      // Update localStorage so sidebar name updates too
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, name }));

      setSuccessMsg("Profile saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) await logoutUser({ headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.log(err);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const currentAvatar =
    avatarPreview ||
    profile?.avatar ||
    `https://i.pravatar.cc/150?img=${profile?.id || 32}`;

  return (
    <div className="ep-page">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar ep-sidebar">
        <div className="brand">💫 Chatrix</div>

        <div className="profile-card">
          <img src={currentAvatar} alt="profile" />
          <div>
            <h3>{profile?.name || "User"}</h3>
            <p style={{ color: "#86efac" }}>Online</p>
          </div>
        </div>

        <nav>
          <a onClick={() => navigate("/home")}><Home /> Home</a>
          <a onClick={() => navigate("/dashboard")}><MessageCircle /> Chat</a>
          <a><Bell /> Stories</a>
          <a><Phone /> Calls</a>
          <a onClick={() => navigate("/requests")}>
            <UserPlus /> Requests
            {requests.length > 0 && <span className="nav-badge">{requests.length}</span>}
          </a>
          <a><Users /> Inner Circle</a>
          <a><Bookmark /> Pinned Chat</a>
          <a onClick={logout}><LogOut /> Logout</a>
        </nav>
      </aside>

      {/* ── MAIN ── */}
      <main className="ep-main">
        <div className="ep-card">
          <h1 className="ep-title">Edit Profile</h1>

          {successMsg && (
            <div className="ep-alert success">
              <Check size={16} /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="ep-alert error">
              <X size={16} /> {errorMsg}
            </div>
          )}

          {/* Avatar Section */}
          <div className="ep-avatar-section">
            <div className="ep-avatar-wrap" onClick={handleAvatarClick}>
              <img src={currentAvatar} alt="avatar" className="ep-avatar" />
              <div className="ep-avatar-overlay">
                <Camera size={22} />
                <span>Change Photo</span>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
            />

            {avatarFile && (
              <div className="ep-avatar-actions">
                <p className="ep-avatar-hint">New photo selected — save it below</p>
                <button
                  type="button"
                  className="ep-upload-btn"
                  onClick={handleAvatarUpload}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                </button>
                <button
                  type="button"
                  className="ep-cancel-btn"
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Profile Form */}
          <form className="ep-form" onSubmit={handleSave}>
            <div className="ep-field">
              <label htmlFor="ep-name">Full Name</label>
              <input
                id="ep-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                maxLength={60}
              />
            </div>

            <div className="ep-field">
              <label htmlFor="ep-username">Username</label>
              <input
                id="ep-username"
                type="text"
                value={profile?.username ? `@${profile.username}` : ""}
                disabled
                className="ep-disabled"
              />
              <span className="ep-hint">Username cannot be changed</span>
            </div>

            <div className="ep-field">
              <label htmlFor="ep-bio">
                Bio <span className="ep-char-count">{bio.length}/160</span>
              </label>
              <textarea
                id="ep-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people a little about yourself..."
                maxLength={160}
                rows={3}
              />
            </div>

            <div className="ep-actions">
              <button type="button" className="ep-back-btn" onClick={() => navigate("/home")}>
                Cancel
              </button>
              <button type="submit" className="ep-save-btn" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* ── RIGHT PANEL ── */}
      <aside className="ep-right">
        <div className="widget ep-widget">
          <h2>Profile Tips</h2>
          <div className="ep-tip">
            <span className="ep-tip-icon">📸</span>
            <p>Use a clear, well-lit photo of your face so friends can recognise you.</p>
          </div>
          <div className="ep-tip">
            <span className="ep-tip-icon">✍️</span>
            <p>A short bio helps friends know what you're up to these days.</p>
          </div>
          <div className="ep-tip">
            <span className="ep-tip-icon">👁️</span>
            <p>Your profile picture is visible to all your friends on Chatrix.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default EditProfile;