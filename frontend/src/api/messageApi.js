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

