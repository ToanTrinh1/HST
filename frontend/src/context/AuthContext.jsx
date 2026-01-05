import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user từ localStorage khi app start
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Login function - hỗ trợ email hoặc số điện thoại
  const login = async (emailOrPhone, password) => {
    try {
      setError(null);
      const response = await authAPI.login({ email_or_phone: emailOrPhone, password });
      console.log('AuthContext - Full response:', response);
      
      // Kiểm tra response có tồn tại không
      if (!response) {
        console.error('AuthContext - Response is null or undefined');
        const errorMsg = 'Không nhận được phản hồi từ server';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      if (response.success && response.data) {
        // Backend trả về: { success: true, data: { token, user } }
        const { token, user } = response.data;
        
        // Kiểm tra token và user có tồn tại không
        if (!token || !user) {
          console.error('AuthContext - Token or user is missing in response.data');
          const errorMsg = 'Dữ liệu phản hồi không đầy đủ';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
        
        console.log('AuthContext - Token:', token);
        console.log('AuthContext - User:', user);
        console.log('AuthContext - User vai_tro:', user.vai_tro);
        console.log('AuthContext - User keys:', Object.keys(user));
        
        // Lưu vào localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update state
        setUser(user);
        
        console.log('AuthContext - User saved to localStorage and state');
        
        console.log('AuthContext - Login successful, returning success');
        // Trả về user object để LoginForm có thể check vai_tro ngay
        return { success: true, user: user };
      } else {
        const errorMsg = response.error || 'Đăng nhập thất bại';
        console.log('AuthContext - Login failed:', errorMsg);
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error('AuthContext - Login exception:', err);
      const errorMessage = err.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Register function - KHÔNG tự động đăng nhập
  const register = async (email, password, name, phone_number) => {
    try {
      setError(null);
      console.log('AuthContext - Gửi request đăng ký đến API...');
      console.log('AuthContext - Email:', email);
      console.log('AuthContext - Name:', name);
      console.log('AuthContext - Phone:', phone_number);
      
      const response = await authAPI.register({ email, password, name, phone_number });
      console.log('AuthContext - Response từ API:', response);
      
      // Kiểm tra response có tồn tại không
      if (!response) {
        console.error('AuthContext - Response is null or undefined');
        const errorMsg = 'Không nhận được phản hồi từ server';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      if (response.success) {
        console.log('AuthContext - ✅ API trả về success=true');
        console.log('AuthContext - Đăng ký thành công! KHÔNG tự động đăng nhập');
        
        // KHÔNG lưu token và user vào localStorage
        // User phải đăng nhập lại sau khi đăng ký
        
        return { success: true };
      } else {
        const errorMsg = response.error || 'Đăng ký thất bại';
        console.error('AuthContext - ❌ API trả về success=false');
        console.error('AuthContext - Error:', errorMsg);
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error('AuthContext - ❌ Exception xảy ra:', err);
      const errorMessage = err.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    authAPI.logout();
    setUser(null);
    setError(null);
  };

  // Update user function
  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook để sử dụng Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

