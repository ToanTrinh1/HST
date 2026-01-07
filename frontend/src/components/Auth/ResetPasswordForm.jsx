import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import './AuthForms.css';

const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Lấy email và token từ URL query params
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    
    console.log('ResetPasswordForm - Email param:', emailParam);
    console.log('ResetPasswordForm - Token param (raw):', tokenParam);
    console.log('ResetPasswordForm - Token param (decoded):', tokenParam ? decodeURIComponent(tokenParam) : null);
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (tokenParam) {
      // Decode token nếu bị URL encoded
      const decodedToken = decodeURIComponent(tokenParam);
      console.log('ResetPasswordForm - Setting token:', decodedToken, 'length:', decodedToken.length);
      setToken(decodedToken);
    }

    // Nếu thiếu email hoặc token, hiển thị lỗi
    if (!emailParam || !tokenParam) {
      setError('Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu link mới.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email || !token) {
      setError('Link đặt lại mật khẩu không hợp lệ.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      console.log('ResetPasswordForm - Submitting:', {
        email,
        token: token.substring(0, 10) + '...',
        tokenLength: token.length,
        passwordLength: password.length
      });
      const result = await authAPI.resetPassword(email, token, password);
      console.log('ResetPasswordForm - Result:', result);
      if (result.success) {
        setSuccess('Đặt lại mật khẩu thành công! Bạn sẽ được chuyển đến trang đăng nhập...');
        // Chuyển đến trang đăng nhập sau 2 giây
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(result.error || 'Đặt lại mật khẩu thất bại');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2>Đặt Lại Mật Khẩu</h2>
        <p className="auth-subtitle">Nhập mật khẩu mới cho tài khoản của bạn</p>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          borderLeft: '4px solid #155724',
          fontSize: '14px'
        }}>{success}</div>}
        
        {email && token ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu mới</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đặt Lại Mật Khẩu'}
            </button>
          </form>
        ) : (
          <div>
            <p style={{ color: '#dc3545', marginBottom: '20px' }}>
              Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
            </p>
            <Link to="/forgot-password" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Yêu cầu link mới
            </Link>
          </div>
        )}

        <p className="auth-footer">
          Nhớ mật khẩu? <Link to="/login">Đăng nhập tại đây</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordForm;

