const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  sendMessage,
  getConversation,
  toggleReaction,
  editMessage,
  deleteMessage,
} = require("../controllers/messageController");

const router = express.Router();

router.post("/:receiverId", authMiddleware, sendMessage);
router.post("/:messageId/reactions", authMiddleware, toggleReaction);
router.get("/:friendId", authMiddleware, getConversation);
router.put("/:messageId", authMiddleware, editMessage);
router.delete("/:messageId", authMiddleware, deleteMessage);

module.exports = router;