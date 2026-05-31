const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadFile } = require("../controllers/uploadController");

const router = express.Router();

// Store file in memory so we can stream it to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, PDFs, and common office formats
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  },
});

router.post("/", authMiddleware, upload.single("file"), uploadFile);

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Maximum size is 20MB." });
    }
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;