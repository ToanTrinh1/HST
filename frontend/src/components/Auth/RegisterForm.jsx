import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
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
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Reset verification status khi email thay đổi
    if (e.target.name === 'email') {
      setIsEmailVerified(false);
      setVerificationCode('');
      setVerificationError('');
    }
  };

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Gửi mã xác thực
  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      setVerificationError('Vui lòng nhập email trước');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setVerificationError('Email không hợp lệ');
      return;
    }

    setVerificationError('');
    setIsSendingCode(true);

    try {
      const result = await authAPI.sendVerificationCode(formData.email);
      if (result.success) {
        setCountdown(60); // 60 giây countdown
        alert('Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');
      } else {
        setVerificationError(result.error || 'Gửi mã xác thực thất bại');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      setVerificationError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Xác thực mã OTP
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setVerificationError('Vui lòng nhập mã xác thực');
      return;
    }

    if (verificationCode.length !== 6) {
      setVerificationError('Mã xác thực phải có 6 chữ số');
      return;
    }

    setVerificationError('');

    try {
      const result = await authAPI.verifyEmailCode(formData.email, verificationCode);
      if (result.success) {
        setIsEmailVerified(true);
        alert('Email đã được xác thực thành công!');
      } else {
        setVerificationError(result.error || 'Mã xác thực không đúng');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setVerificationError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
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

    // Kiểm tra email đã được xác thực chưa
    if (!isEmailVerified) {
      const errorMsg = 'Vui lòng xác thực email trước khi đăng ký';
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
        <h2>Tạo Tài Khoản</h2>
        <p className="auth-subtitle">Đăng ký để bắt đầu</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Họ và Tên</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Nhập họ và tên của bạn"
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Nhập email của bạn"
                autoComplete="email"
                style={{ flex: 1 }}
                disabled={isEmailVerified}
              />
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={isSendingCode || countdown > 0 || isEmailVerified}
                style={{
                  padding: '12px 16px',
                  background: isEmailVerified ? '#4caf50' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (isSendingCode || countdown > 0 || isEmailVerified) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  opacity: (isSendingCode || countdown > 0 || isEmailVerified) ? 0.7 : 1,
                }}
              >
                {isEmailVerified ? '✓ Đã xác thực' : countdown > 0 ? `${countdown}s` : isSendingCode ? 'Đang gửi...' : 'Gửi mã'}
              </button>
            </div>
            {isEmailVerified && (
              <p style={{ color: '#4caf50', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                ✓ Email đã được xác thực
              </p>
            )}
          </div>

          {!isEmailVerified && (
            <div className="form-group">
              <label htmlFor="verificationCode">Mã xác thực</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Nhập mã 6 chữ số"
                  maxLength={6}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Xác thực
                </button>
              </div>
              {verificationError && (
                <p style={{ color: '#c33', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                  {verificationError}
                </p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Ít nhất 6 ký tự"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận Mật khẩu</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Xác nhận mật khẩu của bạn"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !isEmailVerified}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <p className="auth-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập tại đây</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;

