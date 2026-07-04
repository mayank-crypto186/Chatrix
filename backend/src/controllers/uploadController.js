const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const pool = require("../config/db");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const streamUploadToCloudinary = (fileBuffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });

// POST /api/upload — general file/attachment upload
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const file = req.file;
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    let resourceType = "raw";
    if (isImage) resourceType = "image";
    if (isVideo) resourceType = "video";

    const result = await streamUploadToCloudinary(file.buffer, {
      resource_type: resourceType,
      folder: "chatrix_attachments",
      use_filename: true,
      unique_filename: true,
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      originalName: file.originalname,
      size: file.size,
      fileType: isImage ? "image" : isVideo ? "video" : "file",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

// POST /api/upload/avatar — upload profile picture + save URL to DB
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const file = req.file;

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files are allowed for avatar" });
    }

    const result = await streamUploadToCloudinary(file.buffer, {
      resource_type: "image",
      folder: "chatrix_avatars",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
      use_filename: true,
      unique_filename: true,
    });

    await pool.query(
      "UPDATE users SET avatar = $1 WHERE id = $2",
      [result.secure_url, req.user.id]
    );

    res.json({
      message: "Avatar updated successfully",
      avatar: result.secure_url,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ message: "Avatar upload failed", error: error.message });
  }
};

// PATCH /api/upload/profile — update name and bio
const updateProfile = async (req, res) => {
  const { name, bio } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (bio && bio.length > 160) {
    return res.status(400).json({ message: "Bio must be under 160 characters" });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET name = $1, bio = $2 WHERE id = $3 RETURNING id, name, bio, avatar, username",
      [name.trim(), bio?.trim() || null, req.user.id]
    );

    res.json({
      message: "Profile updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Profile update failed", error: error.message });
  }
};

// exports moved to bottom
// POST /api/upload/voice — upload voice message to Cloudinary
const uploadVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const result = await streamUploadToCloudinary(req.file.buffer, {
      resource_type: "video", // Cloudinary uses "video" for audio files
      folder: "chatrix_voice_messages",
      use_filename: true,
      unique_filename: true,
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration || 0,
      size: req.file.size,
      fileType: "voice",
      originalName: req.file.originalname,
    });
  } catch (error) {
    console.error("Voice upload error:", error);
    res.status(500).json({ message: "Voice upload failed", error: error.message });
  }
};

module.exports = { uploadFile, uploadAvatar, updateProfile, uploadVoice };