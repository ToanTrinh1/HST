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
      
      const response = await axiosInstance.post('/auth/login', {
        email_or_phone: credentials.email_or_phone || credentials.email,
        password: credentials.password
      });
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

  // Cập nhật thông tin profile (tên và số điện thoại, email không thể thay đổi)
  updateProfile: async (name, phone_number) => {
    try {
      console.log('authAPI - Gửi PUT request đến /auth/me');
      const requestData = { name };
      if (phone_number) {
        requestData.phone_number = phone_number;
      }
      const response = await axiosInstance.put('/auth/me', requestData);
      console.log('authAPI - ✅ Backend response:', response.data);

      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }

      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ UpdateProfile error:', error);
      
      let errorMsg = 'Cập nhật thông tin thất bại';

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

  // Đổi mật khẩu
  changePassword: async (oldPassword, newPassword) => {
    try {
      console.log('authAPI - Gửi PUT request đến /auth/change-password');
      console.log('authAPI - Base URL:', axiosInstance.defaults.baseURL);
      console.log('authAPI - Full URL:', axiosInstance.defaults.baseURL + '/auth/change-password');
      console.log('authAPI - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
      
      const response = await axiosInstance.put('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      console.log('authAPI - ✅ Backend response:', response.data);

      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }

      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ ChangePassword error:', error);
      console.error('authAPI - Error response:', error.response?.data);
      console.error('authAPI - Error status:', error.response?.status);
      console.error('authAPI - Error message:', error.message);
      console.error('authAPI - Error request:', error.request);
      
      let errorMsg = 'Đổi mật khẩu thất bại';

      if (error.response?.status === 401) {
        errorMsg = 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response) {
        // Server trả về response nhưng có lỗi
        errorMsg = error.response.data?.error || errorMsg;
      } else if (error.request) {
        // Request được gửi nhưng không nhận được response
        console.error('authAPI - Không nhận được phản hồi từ server');
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo backend đang chạy.';
      } else {
        // Lỗi khi setup request
        errorMsg = error.message || 'Lỗi khi gửi yêu cầu đổi mật khẩu';
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      console.log('authAPI - Gửi POST request đến /auth/upload-avatar');
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axiosInstance.post('/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('authAPI - ✅ Backend response:', response.data);

      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }

      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ UploadAvatar error:', error);
      
      let errorMsg = 'Upload avatar thất bại';

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

  // Gửi mã xác thực email
  sendVerificationCode: async (email) => {
    try {
      console.log('authAPI - Gửi POST request đến /auth/send-verification-code');
      const response = await axiosInstance.post('/auth/send-verification-code', { email });
      console.log('authAPI - ✅ Backend response:', response.data);

      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }

      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ SendVerificationCode error:', error);
      
      let errorMsg = 'Gửi mã xác thực thất bại';

      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      } else if (error.request) {
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Xác thực mã OTP
  verifyEmailCode: async (email, code) => {
    try {
      console.log('authAPI - Gửi POST request đến /auth/verify-email-code');
      const response = await axiosInstance.post('/auth/verify-email-code', { email, code });
      console.log('authAPI - ✅ Backend response:', response.data);

      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }

      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ VerifyEmailCode error:', error);
      
      let errorMsg = 'Xác thực mã thất bại';

      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      } else if (error.request) {
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Quên mật khẩu - gửi email reset
  forgotPassword: async (email) => {
    try {
      console.log('authAPI - Gửi POST request đến /auth/forgot-password');
      const response = await axiosInstance.post('/auth/forgot-password', { email });
      console.log('authAPI - ✅ Backend response:', response.data);

      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }

      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ ForgotPassword error:', error);
      
      let errorMsg = 'Gửi email đặt lại mật khẩu thất bại';

      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      } else if (error.request) {
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Đặt lại mật khẩu - sử dụng token từ email
  resetPassword: async (email, token, newPassword) => {
    try {
      console.log('authAPI - Gửi POST request đến /auth/reset-password');
      console.log('authAPI - Data gửi đi:', {
        email,
        token: token.substring(0, 10) + '...',
        tokenLength: token.length,
        new_password: '***'
      });
      const response = await axiosInstance.post('/auth/reset-password', {
        email,
        token,
        new_password: newPassword,
      });
      console.log('authAPI - ✅ Backend response:', response.data);

      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }

      return response.data;
    } catch (error) {
      console.error('authAPI - ❌ ResetPassword error:', error);
      
      let errorMsg = 'Đặt lại mật khẩu thất bại';

      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      } else if (error.request) {
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  },
};

export default authAPI;