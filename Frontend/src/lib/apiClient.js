import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE || "https://rxcq.pythonanywhere.com";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

export const apiGet = async (url, params = {}) => {
  const { data } = await apiClient.get(url, { params });
  return data;
};

export const apiPost = async (url, payload = {}) => {
  const { data } = await apiClient.post(url, payload);
  return data;
};

export const apiPut = async (url, payload = {}) => {
  const { data } = await apiClient.put(url, payload);
  return data;
};

export const apiDelete = async (url) => {
  const { data } = await apiClient.delete(url);
  return data;
};
