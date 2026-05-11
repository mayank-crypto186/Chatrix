const pool = require("../config/db");

const checkFriendship = async (userId, friendId) => {
  const result = await pool.query(
    `SELECT * FROM friendships
     WHERE (user1_id = $1 AND user2_id = $2)
     OR (user1_id = $2 AND user2_id = $1)`,
    [userId, friendId]
  );

  return result.rows.length > 0;
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const isFriend = await checkFriendship(senderId, receiverId);

    if (!isFriend) {
      return res.status(403).json({ message: "You can only message friends" });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, receiverId, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const isFriend = await checkFriendship(userId, friendId);

    if (!isFriend) {
      return res.status(403).json({ message: "You can only view chats with friends" });
    }

    const result = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
       OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId, friendId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load conversation", error: error.message });
  }
};

module.exports = { sendMessage, getConversation };