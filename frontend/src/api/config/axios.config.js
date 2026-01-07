import axios from 'axios';

// Sử dụng biến môi trường hoặc fallback về localhost cho development
const API_BASE_URL = process.env.REACT_APP_API_URL 
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:8080/api';

// Log API configuration để debug
console.log('🔧 Axios Config:');
console.log('  - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('  - API_BASE_URL:', API_BASE_URL);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log request để debug
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.url === '/auth/change-password') {
      console.log('  - Headers:', { Authorization: config.headers.Authorization ? 'Bearer ***' : 'None' });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor để log errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.config?.url === '/auth/change-password') {
      console.error('📥 Response Error cho /auth/change-password:');
      console.error('  - Status:', error.response?.status);
      console.error('  - Data:', error.response?.data);
      console.error('  - Message:', error.message);
      if (error.request && !error.response) {
        console.error('  - ⚠️ Không nhận được response từ server');
        console.error('  - Request URL:', error.config?.baseURL + error.config?.url);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;