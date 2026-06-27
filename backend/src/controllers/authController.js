const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const username =
      name.toLowerCase().replace(/\s+/g, "_") +
      "_" +
      Math.floor(Math.random() * 10000);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (name, username, email, password, is_online, last_seen)
       VALUES ($1, $2, $3, $4, true, NULL)
       RETURNING id, name, username, email, is_online, last_seen`,
      [name, username, email, hashedPassword]
    );

    const token = jwt.sign(
      { id: newUser.rows[0].id, email: newUser.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        ...newUser.rows[0],
        status: "online",
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.rows[0].password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await pool.query(
      `UPDATE users SET is_online = true, last_seen = NULL WHERE id = $1`,
      [user.rows[0].id]
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        username: user.rows[0].username,
        email: user.rows[0].email,
        is_online: true,
        status: "online",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1`,
      [userId]
    );

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};

// GET /api/auth/me — returns full profile of logged-in user
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, username, email, bio, mood_status, is_online, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/auth/status — updates mood status
const updateStatus = async (req, res) => {
  const { mood_status } = req.body;
  const allowed = ["Free to Chat", "Busy", "Studying", "Gaming"];

  if (!allowed.includes(mood_status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    await pool.query(
      `UPDATE users SET mood_status = $1 WHERE id = $2`,
      [mood_status, req.user.id]
    );

    res.json({ message: "Status updated successfully", mood_status });
  } catch (error) {
    console.error("updateStatus error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { signup, login, logout, getMe, updateStatus };