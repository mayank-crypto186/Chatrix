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