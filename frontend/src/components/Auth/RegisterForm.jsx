import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthForms.css';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('=== BẮT ĐẦU ĐĂNG KÝ ===');
    console.log('Thông tin đăng ký:', {
      name: formData.name,
      email: formData.email,
      passwordLength: formData.password.length,
      confirmPasswordLength: formData.confirmPassword.length
    });

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Mật khẩu và xác nhận mật khẩu không khớp';
      console.error('❌ VALIDATION LỖI:', errorMsg);
      setError(errorMsg);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      const errorMsg = 'Mật khẩu phải có ít nhất 6 ký tự';
      console.error('❌ VALIDATION LỖI:', errorMsg);
      setError(errorMsg);
      return;
    }

    console.log('✅ Validation frontend thành công, gửi request đến backend...');
    setLoading(true);

    try {
      const result = await register(
        formData.email,
        formData.password,
        formData.name
      );
      console.log('📦 Kết quả từ register function:', result);

      if (result.success) {
        console.log('✅ ĐĂNG KÝ THÀNH CÔNG! Chuyển hướng đến trang đăng nhập...');
        // Hiển thị thông báo thành công
        alert('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
        // Chuyển đến trang login (không tự động login)
        navigate('/login', { replace: true });
      } else {
        console.error('❌ ĐĂNG KÝ THẤT BẠI:', result.error);
        
        // Phân loại lỗi cụ thể
        if (result.error?.includes('email already exists') || 
            result.error?.includes('đã tồn tại')) {
          console.error('   → Lý do: Email đã được đăng ký trước đó');
        } else if (result.error?.includes('invalid') || 
                   result.error?.includes('không hợp lệ')) {
          console.error('   → Lý do: Dữ liệu không hợp lệ');
        }
        
        setError(result.error || 'Đăng ký không thành công');
      }
    } catch (error) {
      console.error('❌ LỖI EXCEPTION:', error);
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    }

    setLoading(false);
    console.log('=== KẾT THÚC ĐĂNG KÝ ===\n');
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up to get started</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;

