const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
require("dotenv").config();


const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://192.168.1.44:5173"
    ],
    credentials: true,
  })
);
app.use(express.json());


app.use("/api/auth", authRoutes);

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

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});