import axios from "axios";
import Cookies from "js-cookie";

const AUTH_COOKIE_KEY = "assessir_admin_token";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1",
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get(AUTH_COOKIE_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        Cookies.remove(AUTH_COOKIE_KEY);
        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
        }
      } catch {}

      // Redirect to root / (where login screen is), but not if already there
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
