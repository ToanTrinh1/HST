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

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login({ email, password });
      console.log('AuthContext - Full response:', response);
      
      if (response.success) {
        // Backend trả về: { success: true, data: { token, user } }
        const { token, user } = response.data;
        
        console.log('AuthContext - Token:', token);
        console.log('AuthContext - User:', user);
        
        // Lưu vào localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update state
        setUser(user);
        
        console.log('AuthContext - Login successful, returning success');
        return { success: true };
      } else {
        console.log('AuthContext - Login failed:', response.error);
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('AuthContext - Login exception:', err);
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Register function - KHÔNG tự động đăng nhập
  const register = async (email, password, name) => {
    try {
      setError(null);
      console.log('AuthContext - Gửi request đăng ký đến API...');
      console.log('AuthContext - Email:', email);
      console.log('AuthContext - Name:', name);
      
      const response = await authAPI.register({ email, password, name });
      console.log('AuthContext - Response từ API:', response);
      
      if (response.success) {
        console.log('AuthContext - ✅ API trả về success=true');
        console.log('AuthContext - Đăng ký thành công! KHÔNG tự động đăng nhập');
        
        // KHÔNG lưu token và user vào localStorage
        // User phải đăng nhập lại sau khi đăng ký
        
        return { success: true };
      } else {
        console.error('AuthContext - ❌ API trả về success=false');
        console.error('AuthContext - Error:', response.error);
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('AuthContext - ❌ Exception xảy ra:', err);
      const errorMessage = err.message || 'Registration failed';
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

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
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

