import api from "./axios";
 
/**
 * Upload a file to Cloudinary via the backend.
 * Returns { url, publicId, resourceType, format, originalName, size, fileType }
 */
export const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
 
  const response = await api.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
 
  return response;
};
 