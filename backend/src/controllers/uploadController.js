const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Cloudinary is configured via env vars set on Render:
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// cloudinary.config() reads them automatically when using the official SDK

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const file = req.file;
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    // Determine resource type for Cloudinary
    let resourceType = "raw"; // default for docs, pdfs, etc.
    if (isImage) resourceType = "image";
    if (isVideo) resourceType = "video";

    // Stream the buffer to Cloudinary
    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: "chatrix_attachments",
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });

    const result = await streamUpload();

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

module.exports = { uploadFile };