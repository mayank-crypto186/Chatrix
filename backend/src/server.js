const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const friendRoutes = require("./routes/friendRoutes");
require("dotenv").config();


const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});