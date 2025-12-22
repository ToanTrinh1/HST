import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthForms.css';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔥 BUTTON CLICKED! handleSubmit được gọi');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    setError('');
    setLoading(true);

    try {
      console.log('Đang gọi login function...');
      const result = await login(email, password);
      console.log('Login result:', result);

      if (result.success) {
        console.log('Login successful, checking user vai_tro...');
        
        // Lấy user từ result (đã được trả về từ login function)
        const currentUser = result.user;
        console.log('LoginForm - User from result:', currentUser);
        console.log('LoginForm - User object keys:', currentUser ? Object.keys(currentUser) : 'null');
        console.log('LoginForm - Full user object:', JSON.stringify(currentUser, null, 2));
        
        // Fallback: Nếu không có trong result, lấy từ localStorage
        const userToCheck = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
        console.log('LoginForm - User to check:', userToCheck);
        console.log('LoginForm - User to check keys:', Object.keys(userToCheck));
        console.log('LoginForm - User to check.vai_tro:', userToCheck?.vai_tro);
        console.log('LoginForm - User to check.role:', userToCheck?.role);
        
        // Check cả vai_tro và role (fallback) - ưu tiên vai_tro
        // Tạm thời check role trước nếu backend chưa update
        const userRole = userToCheck?.vai_tro || userToCheck?.role;
        console.log('LoginForm - Final userRole to check:', userRole);
        console.log('LoginForm - Is admin?', userRole === 'admin');
        console.log('LoginForm - userToCheck.vai_tro:', userToCheck?.vai_tro);
        console.log('LoginForm - userToCheck.role:', userToCheck?.role);
        
        if (userRole === 'admin') {
          console.log('✅ Admin detected, redirecting to /admin');
          navigate('/admin', { replace: true }); // Redirect admin to admin page
        } else {
          console.log('❌ Regular user (vai_tro/role:', userRole, '), redirecting to home');
          navigate('/', { replace: true }); // Redirect regular user to home page
        }
      } else {
        console.log('Login failed:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Login to your account</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;

