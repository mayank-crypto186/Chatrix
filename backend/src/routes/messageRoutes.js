const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  sendMessage,
  getConversation,
} = require("../controllers/messageController");

const router = express.Router();

router.post("/:receiverId", authMiddleware, sendMessage);
router.get("/:friendId", authMiddleware, getConversation);

module.exports = router;