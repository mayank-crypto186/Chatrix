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

export const editMessage = async (messageId, newText) => {
  return api.put(`/api/messages/${messageId}`, { message: newText });
};

export const deleteMessage = async (messageId, scope) => {
  return api.delete(`/api/messages/${messageId}`, { data: { scope } });
};

// ── Read Receipts ─────────────────────────────────────────────
// Called when user opens a chat — marks all messages from
// friendId as "read" and triggers blue ticks on sender's screen
export const markAsRead = (friendId) => {
  return api.put(`/api/messages/read/${friendId}`, {});
};