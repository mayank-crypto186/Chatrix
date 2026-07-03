const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  sendMessage,
  getConversation,
  toggleReaction,
  editMessage,
  deleteMessage,
  markAsRead,
} = require("../controllers/messageController");

const router = express.Router();

// ── Read Receipts ─────────────────────────────────────────────
// Must be defined BEFORE "/:messageId" routes to avoid
// Express matching "read" as a messageId param
router.put("/read/:friendId", authMiddleware, markAsRead);

router.post("/:receiverId", authMiddleware, sendMessage);
router.post("/:messageId/reactions", authMiddleware, toggleReaction);
router.get("/:friendId", authMiddleware, getConversation);
router.put("/:messageId", authMiddleware, editMessage);
router.delete("/:messageId", authMiddleware, deleteMessage);

module.exports = router;