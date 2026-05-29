import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/api/messages`;

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

