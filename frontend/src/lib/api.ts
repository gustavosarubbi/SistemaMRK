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
    
    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log para debug (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      if (error.response) {
        console.error('API Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
        });
      } else if (error.request) {
        console.error('API Network Error:', {
          message: error.message,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
        });
      } else {
        console.error('API Error:', error.message);
      }
    }
    
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Token inválido ou expirado - fazer logout e redirecionar
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Validation API methods
export const validationApi = {
  getStats: () => api.get('/validation/stats'),
  listRecords: (table: string, params?: any) => api.get(`/validation/${table}`, { params }),
  getRecord: (table: string, recordId: string) => api.get(`/validation/${table}/${recordId}`),
  updateRecord: (table: string, recordId: string, updates: any) => api.put(`/validation/${table}/${recordId}`, updates),
  approveRecord: (table: string, recordId: string) => api.post(`/validation/${table}/${recordId}/approve`),
  rejectRecord: (table: string, recordId: string, rejectionReason: string) => 
    api.post(`/validation/${table}/${recordId}/reject`, { rejection_reason: rejectionReason }),
  getProjectForValidation: (custo: string) => api.get(`/validation/project/${custo}`),
  approveProjectAll: (custo: string) => api.post(`/validation/project/${custo}/approve-all`),
};

export default api;
