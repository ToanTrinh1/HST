import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../api';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await userAPI.updateProfile(formData);
      if (result.success) {
        setSuccess('Cập nhật hồ sơ thành công!');
        // Cập nhật user trong context và localStorage
        updateUser(formData);
      } else {
        setError(result.error || 'Cập nhật hồ sơ thất bại');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    }

    setLoading(false);
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Chỉnh sửa hồ sơ cá nhân</h1>
        <button onClick={() => navigate('/')} className="btn-back">
          ← Quay lại
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Họ và tên</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Nhập họ và tên"
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
                placeholder="Nhập email"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

