const express = require("express");
const pool = require("../config/db");

const router = express.Router();

function getUserId(req) {
  return Number(req.headers["user-id"]);
}

// search users by username
router.get("/search", async (req, res) => {
  try {
    const { username } = req.query;
    const userId = getUserId(req);

    const result = await pool.query(
      `SELECT id, name, username, avatar, status
       FROM users
       WHERE username ILIKE $1 AND id != $2
       LIMIT 10`,
      [`%${username}%`, userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Search failed", error: error.message });
  }
});

// send friend request
router.post("/request/:receiverId", async (req, res) => {
  try {
    const senderId = getUserId(req);
    const receiverId = Number(req.params.receiverId);

    if (senderId === receiverId) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id)
       VALUES ($1, $2)
       ON CONFLICT (sender_id, receiver_id) DO NOTHING`,
      [senderId, receiverId]
    );

    res.json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: "Request failed", error: error.message });
  }
});

// incoming requests
router.get("/requests", async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await pool.query(
      `SELECT fr.id, u.id AS sender_id, u.name, u.username, u.avatar, fr.created_at
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load requests" });
  }
});

// accept request
router.post("/accept/:requestId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = Number(req.params.requestId);

    const request = await pool.query(
      `SELECT * FROM friend_requests
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const senderId = request.rows[0].sender_id;
    const receiverId = request.rows[0].receiver_id;

    const user1 = Math.min(senderId, receiverId);
    const user2 = Math.max(senderId, receiverId);

    await pool.query(
      `INSERT INTO friendships (user1_id, user2_id)
       VALUES ($1, $2)
       ON CONFLICT (user1_id, user2_id) DO NOTHING`,
      [user1, user2]
    );

    await pool.query(
      `UPDATE friend_requests SET status = 'accepted' WHERE id = $1`,
      [requestId]
    );

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ message: "Accept failed", error: error.message });
  }
});

// reject request
router.delete("/reject/:requestId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const requestId = Number(req.params.requestId);

    await pool.query(
      `DELETE FROM friend_requests
       WHERE id = $1 AND receiver_id = $2`,
      [requestId, userId]
    );

    res.json({ message: "Friend request rejected" });
  } catch (error) {
    res.status(500).json({ message: "Reject failed" });
  }
});

// get friends
router.get("/friends", async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.avatar, u.status
       FROM friendships f
       JOIN users u
       ON u.id = CASE
         WHEN f.user1_id = $1 THEN f.user2_id
         ELSE f.user1_id
       END
       WHERE f.user1_id = $1 OR f.user2_id = $1`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load friends" });
  }
});

module.exports = router;