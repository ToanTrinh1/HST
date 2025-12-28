import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../api';
import './AuthForms.css';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await authAPI.forgotPassword(email);
      if (result.success) {
        setSuccess('Email đặt lại mật khẩu đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra email.');
      } else {
        setError(result.error || 'Gửi email đặt lại mật khẩu thất bại');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2>Quên Mật Khẩu</h2>
        <p className="auth-subtitle">Nhập email của bạn để nhận link đặt lại mật khẩu</p>
        
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
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Nhập email của bạn"
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi Email Đặt Lại Mật Khẩu'}
          </button>
        </form>

        <p className="auth-footer">
          Nhớ mật khẩu? <Link to="/login">Đăng nhập tại đây</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;



