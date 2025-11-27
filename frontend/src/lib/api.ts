import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// Helper to determine Base URL dynamically if env not set
const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    // If running in browser, try to use the current hostname
    if (typeof window !== 'undefined') {
        // Assumes API runs on port 8000 on the same host
        return `http://${window.location.hostname}:8000/api`;
    }
    // Fallback for server-side rendering (SSR)
    return 'http://localhost:8000/api';
};

// Create an instance of axios
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Update baseURL dynamically just in case (though axios instance usually sets it once)
    // But for client-side navigation it's safer to ensure we match the logic
    if (!config.baseURL && typeof window !== 'undefined') {
        config.baseURL = getBaseUrl();
    }

    const token = useAuthStore.getState().token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
