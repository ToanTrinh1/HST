import axiosInstance from '../config/axios.config';

export const authAPI = {
  register: async (userData) => {
    try {
      console.log('authAPI - Gửi POST request đến /auth/register');
      console.log('authAPI - Data gửi đi:', {
        email: userData.email,
        name: userData.name,
        passwordLength: userData.password?.length
      });
      
      const response = await axiosInstance.post('/auth/register', userData);
      console.log('authAPI - ✅ Backend response:', response.data);
      
      // Backend đã trả về { success: true, data: {...} }
      // Trả về trực tiếp response.data
      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ Register error:', error);
      console.error('authAPI - Error response:', error.response?.data);
      console.error('authAPI - Error status:', error.response?.status);
      
      const errorMsg = error.response?.data?.error || 'Registration failed';
      
      // Log chi tiết lỗi
      if (errorMsg.includes('email already exists')) {
        console.error('   → Email đã tồn tại trong hệ thống');
      } else if (error.response?.status === 400) {
        console.error('   → Dữ liệu gửi lên không hợp lệ');
      } else if (error.response?.status === 500) {
        console.error('   → Lỗi server');
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  login: async (credentials) => {
    try {
      console.log('authAPI - Gửi POST request đến /auth/login');
      console.log('authAPI - Data gửi đi:', {
        email: credentials.email,
        passwordLength: credentials.password?.length
      });
      console.log('authAPI - URL:', axiosInstance.defaults.baseURL + '/auth/login');
      
      const response = await axiosInstance.post('/auth/login', credentials);
      console.log('authAPI - ✅ Backend response:', response.data);
      console.log('authAPI - Status:', response.status);
      
      // Backend đã trả về { success: true, data: { token, user } }
      // Trả về trực tiếp response.data
      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ Login error:', error);
      console.error('authAPI - Error response:', error.response?.data);
      console.error('authAPI - Error status:', error.response?.status);
      console.error('authAPI - Error message:', error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export default authAPI;