import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/api/friends`;

const getConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const searchUsers = (username) => {
  return axios.get(`${API}/search?username=${username}`, getConfig());
};

export const sendFriendRequest = (receiverId) => {
  return axios.post(`${API}/request/${receiverId}`, {}, getConfig());
};

export const getFriendRequests = () => {
  return axios.get(`${API}/requests`, getConfig());
};

export const acceptFriendRequest = (requestId) => {
  return axios.post(`${API}/accept/${requestId}`, {}, getConfig());
};

export const rejectFriendRequest = (requestId) => {
  return axios.delete(`${API}/reject/${requestId}`, getConfig());
};

export const getFriends = () => {
  return axios.get(`${API}/friends`, getConfig());
};

export const getFriendProfile = (friendId) => {
  return axios.get(`${API}/profile/${friendId}`, getConfig());
};