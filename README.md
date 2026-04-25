# 🚀 Chatrix

**Chatrix** is a modern full-stack social chat application that combines real-time messaging, privacy-focused features, and social interaction with a clean, customizable UI.

> 💡 *“Chat + Privacy + Social + Personalization”*

---

## 📌 Overview

Chatrix is designed to go beyond traditional chat applications by integrating:

* Advanced privacy controls
* Smart chat organization
* Social features like stories and blogs
* A modern, animated UI experience

---

## ✨ Features

### 💬 Messaging System

* One-to-one chat
* Group chat (multi-user)
* Real-time messaging (Socket.IO)
* Media sharing (images, videos, voice notes)
* Message reactions (👍 ❤️ 😂)
* Reply to messages
* Read receipts (seen/delivered)

---

### 🔒 Privacy Features (USP 🔥)

* 👻 **Ghost Chat**
  → Chats disappear after closing

* 💬 **Whisper Messages**
  → Read once and vanish

* 🔖 **Private Tags**
  → Personal labels for chats (visible only to you)

* 📝 **Private Notes**
  → Add notes on users (only visible to you)

---

### 🗂️ Organization Features

* Chat folders (Friends, Work, Study)
* Pin chats
* Archive chats
* Search chats and messages

---

### 🎨 UI & Experience

* Multiple themes:

  * 🌊 Ocean Breeze (default)
  * 🌿 Minty Fresh
  * 🌇 Sunset Glow
  * 🌌 Deep Night
  * 💜 Lavender Dream
  * 🌲 Forest Calm
* Animated gradients
* Smooth modern UI
* Online/offline indicators

---

### 📸 Social Features

* 📖 Stories (24-hour disappearing content)
* 📰 Mini blogs/posts

  * Like / Comment / Save

---

### 📞 Communication

* Voice calls
* Video calls

---

### 🌟 Extra Features

* 🔵 **Inner Circle Mode** (small private groups)
* 🎯 **Status / Activity system**

  * Busy 🚫
  * Studying 📚
  * Gaming 🎮
  * Free to chat 💬

---

## 🧱 Tech Stack

### Frontend

* Next.js
* React
* Tailwind CSS
* Framer Motion

### Backend

* Node.js
* Express.js

### Realtime

* Socket.IO

### Database

* PostgreSQL (recommended) / MongoDB

### Storage

* Cloudinary

### Calls

* LiveKit (WebRTC-based)

### Authentication

* Clerk / Auth.js / Firebase Auth

---

## 🏗️ System Architecture

```
Frontend (Next.js)
        ↓
Backend API (Node.js + Express)
        ↓
Database (PostgreSQL / MongoDB)
        ↓
Realtime Layer (Socket.IO)
        ↓
Media Storage (Cloudinary)
        ↓
Voice/Video Calls (LiveKit)
```

---

## 📂 Project Structure

### Frontend

```
src/
 ├── app/
 ├── components/
 │    ├── chat/
 │    ├── stories/
 │    ├── posts/
 │    ├── calls/
 │    └── ui/
 ├── features/
 │    ├── auth/
 │    ├── messaging/
 │    ├── groups/
 │    ├── ghostChat/
 │    ├── stories/
 │    ├── posts/
 │    ├── calls/
 │    ├── tags/
 │    └── status/
 ├── hooks/
 ├── services/
 ├── store/
 ├── utils/
```

---

### Backend

```
src/
 ├── modules/
 │    ├── auth/
 │    ├── users/
 │    ├── chats/
 │    ├── messages/
 │    ├── ghostChat/
 │    ├── groups/
 │    ├── stories/
 │    ├── posts/
 │    ├── calls/
 │    ├── tags/
 │    ├── notes/
 │    └── status/
 ├── sockets/
 ├── middleware/
 ├── config/
 ├── db/
 ├── utils/
```

---

## 🗄️ Database Schema (Simplified)

### User

* id
* name
* email
* avatar
* status

### Chat

* id
* type (direct / group / ghost)
* createdBy
* isGhost

### Message

* id
* chatId
* senderId
* text
* mediaUrl
* isWhisper
* expiresAt

### ChatMember

* chatId
* userId
* role

### PrivateTag

* userId
* chatId
* label

### PrivateNote

* userId
* targetUserId
* content

### Story

* userId
* media
* expiresAt

### Post (Blog)

* userId
* content
* media

### CallSession

* chatId
* type (voice/video)

---

## 🛣️ Roadmap

### 🥇 Phase 1 – MVP

* Authentication system
* One-to-one chat
* Real-time messaging
* Basic UI

---

### 🥈 Phase 2 – Core Features

* Group chat
* Media sharing
* Reactions & replies
* Online status

---

### 🥉 Phase 3 – Organization + UI

* Chat folders
* Private tags & notes
* Theme system

---

### 🔥 Phase 4 – Unique Features

* Ghost chat
* Whisper messages
* Status system
* Inner Circle mode

---

### 🌐 Phase 5 – Social

* Stories
* Blogs/posts

---

### 📞 Phase 6 – Communication

* Voice calls
* Video calls

---

## ⚙️ Installation

```bash
# Clone repository
git clone https://github.com/your-username/chatrix.git

# Install dependencies
npm install

# Run frontend
npm run dev

# Run backend
npm run server
```

---

## 🔐 Environment Variables

Create a `.env` file:

```
DATABASE_URL=
JWT_SECRET=
CLOUDINARY_API_KEY=
CLOUDINARY_SECRET=
LIVEKIT_API_KEY=
```

---

## 🎯 MVP Scope

Focus first on:

* Authentication
* One-to-one chat
* Group chat
* Themes
* Private tags
* Basic UI

---

## 💡 Future Improvements

* AI-based features
* Advanced analytics
* Chat recommendations
* End-to-end encryption
* Push notifications

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork and submit pull requests.

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Mayank Mishra**
B.Tech CSE (AI/ML)
