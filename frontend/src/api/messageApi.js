import api from "./axios";

export const sendMessage = async (friendId, message, replyToId = null, attachment = null) => {
  return api.post(`/api/messages/${friendId}`, {
    message,
    replyToId,
    attachment,
  });
};

export const getConversation = async (friendId) => {
  return api.get(`/api/messages/${friendId}`);
};

export const toggleReaction = async (messageId, emoji) => {
  return api.post(`/api/messages/${messageId}/reactions`, { emoji });
};