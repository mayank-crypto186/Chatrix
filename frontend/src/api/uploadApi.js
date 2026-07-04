import api from "./axios";

// General attachment upload (chat files)
export const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response;
};

// Avatar image upload
export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await api.post("/api/upload/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response;
};

// Update name and bio
export const updateProfile = async ({ name, bio }) => {
  const response = await api.patch("/api/upload/profile", { name, bio });
  return response;
};
// Voice message upload
export const uploadVoiceMessage = async (blob) => {
  const formData = new FormData();
  formData.append("voice", blob, "voice_message.webm");

  const response = await api.post("/api/upload/voice", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response;
};