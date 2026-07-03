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
    const { message, replyToId, attachment } = req.body;

    const hasText = message && message.trim();
    const hasAttachment = attachment && attachment.url;

    if (!hasText && !hasAttachment) {
      return res.status(400).json({ message: "Message or attachment is required" });
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

    // Set "delivered" immediately if receiver is currently online
    const onlineUsers = req.app.get("onlineUsers");
    const receiverIsOnline = onlineUsers?.has(String(receiverId));
    const initialStatus = receiverIsOnline ? "delivered" : "sent";

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, reply_to_id, attachment_url, attachment_type, attachment_name, attachment_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        senderId,
        receiverId,
        hasText ? message.trim() : null,
        replyToId || null,
        hasAttachment ? attachment.url : null,
        hasAttachment ? attachment.fileType : null,
        hasAttachment ? attachment.originalName : null,
        hasAttachment ? attachment.size : null,
        initialStatus,
      ]
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
      status: newMessage.status,
      attachment: hasAttachment
        ? {
            url: newMessage.attachment_url,
            fileType: newMessage.attachment_type,
            originalName: newMessage.attachment_name,
            size: newMessage.attachment_size,
          }
        : null,
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
        ) AS my_reaction,
        CASE
          WHEN m.attachment_url IS NOT NULL THEN
            json_build_object(
              'url', m.attachment_url,
              'fileType', m.attachment_type,
              'originalName', m.attachment_name,
              'size', m.attachment_size
            )
          ELSE NULL
        END AS attachment
       FROM messages m
       LEFT JOIN messages r ON m.reply_to_id = r.id
       WHERE (
         (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
       )
       AND NOT ($1 = ANY(COALESCE(m.deleted_for, '{}')))
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

// ── Edit Message ──────────────────────────────────────────────────────────────
// Only the sender can edit their own message.
const editMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const messageResult = await pool.query(
      `SELECT * FROM messages WHERE id = $1`,
      [messageId]
    );

    if (!messageResult.rows.length) {
      return res.status(404).json({ message: "Message not found" });
    }

    const existing = messageResult.rows[0];

    if (String(existing.sender_id) !== String(userId)) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    if (existing.deleted_for_everyone) {
      return res.status(400).json({ message: "Cannot edit a deleted message" });
    }

    const result = await pool.query(
      `UPDATE messages
       SET message = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [message.trim(), messageId]
    );

    const updated = result.rows[0];

    const io = req.app.get("io");
    const payload = { messageId: updated.id, newText: updated.message };

    try {
      io.to(String(updated.receiver_id)).emit("messageEdited", payload);
      io.to(String(updated.sender_id)).emit("messageEdited", payload);
    } catch (emitErr) {
      console.error("Emit error:", emitErr);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to edit message", error: error.message });
  }
};

// ── Delete Message ────────────────────────────────────────────────────────────
// scope "everyone" — nulls text, sets deleted_for_everyone = true (sender only).
// scope "me"       — appends userId to deleted_for array, persisted in DB.
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { scope } = req.body; // "me" | "everyone"

    if (!scope || !["me", "everyone"].includes(scope)) {
      return res.status(400).json({ message: "scope must be 'me' or 'everyone'" });
    }

    // Fetch the message first (needed for both scopes)
    const messageResult = await pool.query(
      `SELECT * FROM messages WHERE id = $1`,
      [messageId]
    );

    if (!messageResult.rows.length) {
      return res.status(404).json({ message: "Message not found" });
    }

    const existing = messageResult.rows[0];

    // Verify the user is part of this conversation
    if (
      String(existing.sender_id) !== String(userId) &&
      String(existing.receiver_id) !== String(userId)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (scope === "everyone") {
      // Only the sender can delete for everyone
      if (String(existing.sender_id) !== String(userId)) {
        return res.status(403).json({ message: "Only the sender can delete a message for everyone" });
      }

      await pool.query(
        `UPDATE messages
         SET message = NULL, deleted_for_everyone = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [messageId]
      );

      const io = req.app.get("io");
      const payload = { messageId: Number(messageId), scope: "everyone" };

      try {
        io.to(String(existing.receiver_id)).emit("messageDeleted", payload);
        io.to(String(existing.sender_id)).emit("messageDeleted", payload);
      } catch (emitErr) {
        console.error("Emit error:", emitErr);
      }
    } else {
      // scope === "me" — persist userId into the deleted_for array
      await pool.query(
        `UPDATE messages
         SET deleted_for = array_append(
           COALESCE(deleted_for, '{}'),
           $1
         )
         WHERE id = $2
           AND NOT ($1 = ANY(COALESCE(deleted_for, '{}')))`,
        [userId, messageId]
      );
    }

    res.json({ success: true, scope });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message", error: error.message });
  }
};

// ── Mark As Read ──────────────────────────────────────────────────────────────
// Called when receiver opens the chat. Marks all unread messages from
// friendId as "read" and emits "messagesRead" socket event to the sender
// so their tick marks turn blue in real time.
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;       // the person now reading
    const { friendId } = req.params;  // the person who sent the messages

    const result = await pool.query(
      `UPDATE messages
       SET status = 'read'
       WHERE sender_id = $1
         AND receiver_id = $2
         AND status != 'read'
       RETURNING id`,
      [friendId, userId]
    );

    const updatedIds = result.rows.map((r) => r.id);

    if (updatedIds.length > 0) {
      const io = req.app.get("io");
      // Notify the original sender — their ticks turn blue
      io.to(String(friendId)).emit("messagesRead", {
        readBy: userId,
        messageIds: updatedIds,
      });
    }

    res.json({ success: true, updatedIds });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark as read", error: error.message });
  }
};

module.exports = { sendMessage, getConversation, toggleReaction, editMessage, deleteMessage, markAsRead };