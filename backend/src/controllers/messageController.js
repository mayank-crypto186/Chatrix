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
    const { message, replyToId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const isFriend = await checkFriendship(senderId, receiverId);

    if (!isFriend) {
      return res.status(403).json({ message: "You can only message friends" });
    }

    if (replyToId) {
      const replyCheck = await pool.query(
        `SELECT id FROM messages
         WHERE id = $1
         AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))`,
        [replyToId, senderId, receiverId]
      );

      if (!replyCheck.rows.length) {
        return res.status(400).json({ message: "Invalid replied message" });
      }
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, reply_to_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [senderId, receiverId, message.trim(), replyToId || null]
    );

    const newMessage = result.rows[0];
    let replyPayload = null;

    if (newMessage.reply_to_id) {
      const replyResult = await pool.query(
        `SELECT id, sender_id, receiver_id, message
         FROM messages
         WHERE id = $1`,
        [newMessage.reply_to_id]
      );
      replyPayload = replyResult.rows[0] || null;
    }

    const messagePayload = {
      id: newMessage.id,
      sender_id: newMessage.sender_id,
      receiver_id: newMessage.receiver_id,
      message: newMessage.message,
      created_at: newMessage.created_at,
      reply_to_id: newMessage.reply_to_id,
      reply_to: replyPayload,
      reactions: [],
      my_reaction: null,
    };

    const io = req.app.get("io");

    try {
      io.to(String(receiverId)).emit("newMessage", messagePayload);
      io.to(String(senderId)).emit("newMessage", messagePayload);
    } catch (emitErr) {
      console.error("Emit error:", emitErr);
    }

    res.status(201).json(messagePayload);
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
      `SELECT m.*, 
        json_build_object(
          'id', r.id,
          'sender_id', r.sender_id,
          'message', r.message
        ) AS reply_to,
        COALESCE(
          (
            SELECT json_agg(json_build_object('emoji', emoji, 'count', count))
            FROM (
              SELECT emoji, COUNT(*) AS count
              FROM message_reactions
              WHERE message_id = m.id
              GROUP BY emoji
            ) AS reaction_counts
          ), '[]'
        ) AS reactions,
        (
          SELECT emoji
          FROM message_reactions
          WHERE message_id = m.id
            AND user_id = $1
          LIMIT 1
        ) AS my_reaction
       FROM messages m
       LEFT JOIN messages r ON m.reply_to_id = r.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [userId, friendId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load conversation", error: error.message });
  }
};

const toggleReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const messageResult = await pool.query(
      `SELECT * FROM messages WHERE id = $1`,
      [messageId]
    );

    if (!messageResult.rows.length) {
      return res.status(404).json({ message: "Message not found" });
    }

    const message = messageResult.rows[0];

    if (message.sender_id !== userId && message.receiver_id !== userId) {
      return res.status(403).json({ message: "You can only react to messages in your chats" });
    }

    const existingReaction = await pool.query(
      `SELECT * FROM message_reactions
       WHERE message_id = $1
         AND user_id = $2`,
      [messageId, userId]
    );

    if (existingReaction.rows.length) {
      const current = existingReaction.rows[0];

      if (current.emoji === emoji) {
        await pool.query(`DELETE FROM message_reactions WHERE id = $1`, [current.id]);
      } else {
        await pool.query(
          `UPDATE message_reactions SET emoji = $1, created_at = NOW() WHERE id = $2`,
          [emoji, current.id]
        );
      }
    } else {
      await pool.query(
        `INSERT INTO message_reactions (message_id, user_id, emoji)
         VALUES ($1, $2, $3)`,
        [messageId, userId, emoji]
      );
    }

    const reactionsResult = await pool.query(
      `SELECT emoji, COUNT(*) AS count
       FROM message_reactions
       WHERE message_id = $1
       GROUP BY emoji`,
      [messageId]
    );

    const myReactionResult = await pool.query(
      `SELECT emoji FROM message_reactions
       WHERE message_id = $1
         AND user_id = $2
       LIMIT 1`,
      [messageId, userId]
    );

    res.json({
      messageId: Number(messageId),
      reactions: reactionsResult.rows,
      my_reaction: myReactionResult.rows[0]?.emoji || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle reaction", error: error.message });
  }
};

module.exports = { sendMessage, getConversation, toggleReaction };