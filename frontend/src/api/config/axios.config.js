import axios from 'axios';

// Sử dụng biến môi trường hoặc fallback về localhost cho development
const API_BASE_URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL
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

// Add response interceptor để log errors và xử lý 401
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Xử lý 401 Unauthorized - Token hết hạn hoặc không hợp lệ
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.error || 'Token không hợp lệ hoặc đã hết hạn';
      
      // Chỉ xử lý logout nếu không phải là request login/register (tránh loop)
      const isAuthRequest = error.config?.url?.includes('/auth/login') || 
                           error.config?.url?.includes('/auth/register');
      
      if (!isAuthRequest) {
        console.warn('⚠️ Token hết hạn hoặc không hợp lệ. Đăng xuất và chuyển về trang đăng nhập...');
        
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Show alert thông báo
        alert('Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.');
        
        // Redirect về login page
        // Sử dụng window.location để đảm bảo reload hoàn toàn và clear state
        window.location.href = '/login';
        
        // Return một promise rejected để dừng request hiện tại
        return Promise.reject(new Error('Unauthorized: Token expired'));
      }
    }
    
    // Log errors cho các request khác
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