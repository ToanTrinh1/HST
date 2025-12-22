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
      console.log('authAPI - Base URL:', axiosInstance.defaults.baseURL);
      
      const response = await axiosInstance.post('/auth/register', userData);
      console.log('authAPI - ✅ Backend response:', response.data);
      console.log('authAPI - Response status:', response.status);
      
      // Kiểm tra response có đúng format không
      if (!response.data) {
        console.error('authAPI - Response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      // Backend đã trả về { success: true, data: {...} }
      // Trả về trực tiếp response.data
      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ Register error:', error);
      console.error('authAPI - Error response:', error.response?.data);
      console.error('authAPI - Error status:', error.response?.status);
      console.error('authAPI - Error message:', error.message);
      
      // Xử lý các loại lỗi khác nhau
      let errorMsg = 'Đăng ký thất bại';
      
      if (error.response) {
        // Server trả về response nhưng có lỗi
        errorMsg = error.response.data?.error || error.response.data?.message || 'Đăng ký thất bại';
      } else if (error.request) {
        // Request được gửi nhưng không nhận được response
        console.error('authAPI - Không nhận được phản hồi từ server');
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo backend đang chạy.';
      } else {
        // Lỗi khi setup request
        errorMsg = error.message || 'Lỗi khi gửi yêu cầu đăng ký';
      }
      
      // Log chi tiết lỗi
      if (errorMsg.includes('email already exists') || errorMsg.includes('đã tồn tại')) {
        console.error('   → Email đã tồn tại trong hệ thống');
        errorMsg = 'Email này đã được đăng ký. Vui lòng sử dụng email khác.';
      } else if (error.response?.status === 400) {
        console.error('   → Dữ liệu gửi lên không hợp lệ');
        errorMsg = errorMsg || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
      } else if (error.response?.status === 500) {
        console.error('   → Lỗi server');
        errorMsg = 'Lỗi server. Vui lòng thử lại sau.';
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
      console.log('authAPI - Base URL:', axiosInstance.defaults.baseURL);
      console.log('authAPI - Full URL:', axiosInstance.defaults.baseURL + '/auth/login');
      
      const response = await axiosInstance.post('/auth/login', credentials);
      console.log('authAPI - ✅ Backend response:', response.data);
      console.log('authAPI - Response status:', response.status);
      
      // Kiểm tra response có đúng format không
      if (!response.data) {
        console.error('authAPI - Response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      // Backend đã trả về { success: true, data: { token, user } }
      // Trả về trực tiếp response.data
      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ Login error:', error);
      console.error('authAPI - Error response:', error.response?.data);
      console.error('authAPI - Error status:', error.response?.status);
      console.error('authAPI - Error message:', error.message);
      
      // Xử lý các loại lỗi khác nhau
      let errorMsg = 'Đăng nhập thất bại';
      
      if (error.response) {
        // Server trả về response nhưng có lỗi
        errorMsg = error.response.data?.error || error.response.data?.message || 'Đăng nhập thất bại';
      } else if (error.request) {
        // Request được gửi nhưng không nhận được response
        console.error('authAPI - Không nhận được phản hồi từ server');
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo backend đang chạy.';
      } else {
        // Lỗi khi setup request
        errorMsg = error.message || 'Lỗi khi gửi yêu cầu đăng nhập';
      }
      
      // Xử lý lỗi cụ thể
      if (errorMsg.includes('invalid credentials') || errorMsg.includes('Invalid')) {
        errorMsg = 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
      } else if (error.response?.status === 401) {
        errorMsg = 'Email hoặc mật khẩu không đúng.';
      } else if (error.response?.status === 400) {
        errorMsg = errorMsg || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
      } else if (error.response?.status === 500) {
        errorMsg = 'Lỗi server. Vui lòng thử lại sau.';
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    try {
      console.log('authAPI - Gửi GET request đến /auth/me');
      const response = await axiosInstance.get('/auth/me');
      console.log('authAPI - ✅ Backend response:', response.data);

      if (!response.data) {
        console.error('authAPI - Response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }

      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ GetCurrentUser error:', error);
      console.error('authAPI - Error response:', error.response?.data);
      console.error('authAPI - Error status:', error.response?.status);

      let errorMsg = 'Không thể lấy thông tin user';

      if (error.response?.status === 401) {
        errorMsg = 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  },
};

export default authAPI;