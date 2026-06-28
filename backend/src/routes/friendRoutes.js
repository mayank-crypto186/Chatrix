const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  searchUsers,
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  getFriends,
  getFriendProfile,
} = require("../controllers/friendController");

const router = express.Router();

router.get("/search", authMiddleware, searchUsers);
router.post("/request/:receiverId", authMiddleware, sendRequest);
router.get("/requests", authMiddleware, getRequests);
router.post("/accept/:requestId", authMiddleware, acceptRequest);
router.delete("/reject/:requestId", authMiddleware, rejectRequest);
router.get("/friends", authMiddleware, getFriends);
router.get("/profile/:friendId", authMiddleware, getFriendProfile);

module.exports = router;