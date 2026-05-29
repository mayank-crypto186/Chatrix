import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/api/messages`;

const getConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export const getConversation = (friendId) => {
  return axios.get(`${API}/${friendId}`, getConfig());
};

export const sendMessage = (receiverId, message, replyToId = null) => {
  return axios.post(
    `${API}/${receiverId}`,
    { message, replyToId },
    getConfig()
  );
};

export const toggleReaction = (messageId, emoji) => {
  return axios.post(`${API}/${messageId}/reactions`, { emoji }, getConfig());
};

