const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { signup, login, logout, getMe, updateStatus } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getMe);
router.patch("/status", authMiddleware, updateStatus);

module.exports = router;