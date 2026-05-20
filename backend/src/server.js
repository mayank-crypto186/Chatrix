const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");
const friendRoutes = require("./routes/friendRoutes");
const messageRoutes = require("./routes/messageRoutes");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const server = http.createServer(app);

const onlineUsers = new Map();
const socketIdToUserId = new Map();

const addOnlineUser = (userId, socketId) => {
  const key = String(userId);
  const sockets = onlineUsers.get(key) || new Set();
  sockets.add(socketId);
  onlineUsers.set(key, sockets);
  socketIdToUserId.set(socketId, key);
};

const removeOnlineUser = (socketId) => {
  const userId = socketIdToUserId.get(socketId);
  if (!userId) return;

  const sockets = onlineUsers.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  } else {
    onlineUsers.set(userId, sockets);
  }

  socketIdToUserId.delete(socketId);
};

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);
app.set("onlineUsers", onlineUsers);

io.on("connection", (socket) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    socket.disconnect(true);
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = payload.id;
  } catch (error) {
    socket.disconnect(true);
    return;
  }

  socket.on("register", (userId) => {
    if (String(userId) !== String(socket.data.userId)) return;
    addOnlineUser(userId, socket.id);
  });

  socket.on("typing", ({ receiverId, typing }) => {
    if (!receiverId) return;
    const targetSockets = onlineUsers.get(String(receiverId));
    if (!targetSockets) return;

    targetSockets.forEach((targetSocketId) => {
      io.to(targetSocketId).emit("typing", {
        from: socket.data.userId,
        typing: Boolean(typing),
      });
    });
  });

  socket.on("disconnect", () => {
    removeOnlineUser(socket.id);
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("Chatrix backend is running");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "PostgreSQL connected successfully",
      time: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});