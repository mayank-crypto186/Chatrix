const pool = require("../config/db");

const searchUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username } = req.query;

    if (!username) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT id, name, username, email, status
       FROM users
       WHERE username ILIKE $1
       AND id != $2
       LIMIT 10`,
      [`%${username}%`, userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "User search failed", error: error.message });
  }
};

const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.params;

    if (Number(senderId) === Number(receiverId)) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const alreadyFriends = await pool.query(
      `SELECT * FROM friendships
       WHERE (user1_id = $1 AND user2_id = $2)
       OR (user1_id = $2 AND user2_id = $1)`,
      [senderId, receiverId]
    );

    if (alreadyFriends.rows.length > 0) {
      return res.status(400).json({ message: "Already friends" });
    }

    await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id)
       VALUES ($1, $2)
       ON CONFLICT (sender_id, receiver_id) DO NOTHING`,
      [senderId, receiverId]
    );

    res.json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send request", error: error.message });
  }
};

const getRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT fr.id, fr.created_at, u.id AS sender_id, u.name, u.username, u.email
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to get requests", error: error.message });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

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
    res.status(500).json({ message: "Failed to accept request", error: error.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    await pool.query(
      `DELETE FROM friend_requests
       WHERE id = $1 AND receiver_id = $2`,
      [requestId, userId]
    );

    res.json({ message: "Friend request rejected" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject request", error: error.message });
  }
};

const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.email, u.status
       FROM friendships f
       JOIN users u
       ON u.id = CASE
         WHEN f.user1_id = $1 THEN f.user2_id
         ELSE f.user1_id
       END
       WHERE f.user1_id = $1 OR f.user2_id = $1
       ORDER BY u.name ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load friends", error: error.message });
  }
};

module.exports = {
  searchUsers,
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  getFriends,
};