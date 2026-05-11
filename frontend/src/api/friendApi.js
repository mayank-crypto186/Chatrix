import axios from "axios";

const API = "http://localhost:5000/api/friends";

const getUserId = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.id;
};

const config = () => ({
  headers: {
    "user-id": getUserId(),
  },
});

export const searchUsers = (username) => {
  return axios.get(`${API}/search?username=${username}`, config());
};

export const sendFriendRequest = (receiverId) => {
  return axios.post(`${API}/request/${receiverId}`, {}, config());
};

export const getFriendRequests = () => {
  return axios.get(`${API}/requests`, config());
};

export const acceptFriendRequest = (requestId) => {
  return axios.post(`${API}/accept/${requestId}`, {}, config());
};

export const rejectFriendRequest = (requestId) => {
  return axios.delete(`${API}/reject/${requestId}`, config());
};

export const getFriends = () => {
  return axios.get(`${API}/friends`, config());
};