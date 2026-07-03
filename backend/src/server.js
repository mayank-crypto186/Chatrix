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

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "https://chatrix-five.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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

app.set("io", io);
app.set("onlineUsers", onlineUsers);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  const token = socket.handshake.auth?.token;

  if (!token) {
    console.log("No token provided");
    socket.disconnect(true);
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = payload.id;

    console.log("Authenticated user:", payload.id);

    addOnlineUser(payload.id, socket.id);

    socket.join(String(payload.id));

    // When user connects, flip any "sent" messages addressed to them → "delivered"
    // and notify each original sender so their single tick becomes double tick
    ;(async () => {
      try {
        const result = await pool.query(
          `UPDATE messages
           SET status = 'delivered'
           WHERE receiver_id = $1
             AND status = 'sent'
           RETURNING id, sender_id`,
          [payload.id]
        );

        // Group updated message ids by sender, notify each one
        const bySender = {};
        result.rows.forEach((row) => {
          bySender[row.sender_id] = bySender[row.sender_id] || [];
          bySender[row.sender_id].push(row.id);
        });

        Object.entries(bySender).forEach(([senderId, messageIds]) => {
          io.to(String(senderId)).emit("messagesDelivered", {
            deliveredTo: payload.id,
            messageIds,
          });
        });
      } catch (err) {
        console.error("Error marking messages delivered on connect:", err);
      }
    })();

    io.emit("userOnline", {
      userId: payload.id,
    });
  } catch (error) {
    console.log("JWT Error:", error.message);
    socket.disconnect(true);
    return;
  }

  socket.on("joinUser", (userId) => {
    if (String(userId) !== String(socket.data.userId)) {
      console.log("joinUser mismatch");
      return;
    }

    socket.join(String(userId));

    console.log("User joined room:", userId);
  });

  socket.on("typing", ({ receiverId, typing }) => {
    if (!receiverId) return;

    io.to(String(receiverId)).emit("typing", {
      from: socket.data.userId,
      typing: Boolean(typing),
    });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    const userId = socket.data.userId;

    removeOnlineUser(socket.id);

    if (
      userId &&
      !onlineUsers.has(String(userId))
    ) {
      io.emit("userOffline", {
        userId,
      });
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", require("./routes/uploadRoutes"));

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

module.exports = { io };