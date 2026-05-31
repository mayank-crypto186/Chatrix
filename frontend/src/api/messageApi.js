import api from "./axios";

export const sendMessage = async (friendId, message, replyToId = null, attachment = null) => {
  return api.post(`/messages/${friendId}`, {
    message,
    replyToId,
    attachment, // { url, fileType, originalName, size, publicId } or null
  });
};

export const getConversation = async (friendId) => {
  return api.get(`/messages/${friendId}`);
};

export const toggleReaction = async (messageId, emoji) => {
  return api.post(`/messages/${messageId}/reactions`, { emoji });
};