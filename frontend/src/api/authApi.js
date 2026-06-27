import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/api/auth`;

export const signupUser = (userData) => {
  return axios.post(`${API}/signup`, userData);
};

export const loginUser = (userData) => {
  return axios.post(`${API}/login`, userData);
};

export const logoutUser = (config) => {
  return axios.post(`${API}/logout`, {}, config);
};

export const getMe = () => {
  const token = localStorage.getItem("token");
  return axios.get(`${API}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const updateMyStatus = (mood_status) => {
  const token = localStorage.getItem("token");
  return axios.patch(
    `${API}/status`,
    { mood_status },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};