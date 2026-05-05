import axios from "axios";

const API = "http://localhost:5000/api/auth";

export const signupUser = async (userData) => {
  return await axios.post(`${API}/signup`, userData);
};

export const loginUser = async (userData) => {
  return await axios.post(`${API}/login`, userData);
};