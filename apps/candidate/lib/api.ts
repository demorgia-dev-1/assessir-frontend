import axios from "axios";
import Cookies from "js-cookie";

const AUTH_COOKIE_KEY = "candidate_access_token";

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

// Response interceptor to handle 401s (token expired / unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        Cookies.remove(AUTH_COOKIE_KEY);
        if (typeof window !== "undefined") {
          localStorage.removeItem("candidate_user");
          sessionStorage.removeItem("candidate_user");
        }
      } catch {}

      // Redirect to batch-specific login if path matches
      if (typeof window !== "undefined") {
        const match = window.location.pathname.match(/\/batches\/([^/]+)\/exam/);
        if (match && match[1]) {
          const batchId = match[1];
          const loginPath = `/batches/${batchId}/exam/login`;
          if (window.location.pathname !== loginPath) {
            window.location.href = loginPath;
          }
        } else if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
