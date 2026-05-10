import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/auth`;

export const signupUser = async (userData) => {
  return axios.post(`${API}/signup`, userData);
};

export const loginUser = async (userData) => {
  return axios.post(`${API}/login`, userData);
};