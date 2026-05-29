import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/messages`;

const getConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

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