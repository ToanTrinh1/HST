import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import Card from '../components/Card';
import BetCalculationWrapper from '../components/BetCalculationWrapper';
import './HomePage.css';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Searching for:', searchQuery);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowDropdown(false);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lấy chữ cái đầu tiên của tên để hiển thị trong avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="page-with-bottom-nav">
      <div className="home-navbar">
        <div className="navbar-brand">
          <h2>My App</h2>
        </div>
        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </form>
              <div className="avatar-container" ref={dropdownRef}>
                <div
                  className="avatar"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {getInitials(user?.name)}
                </div>
                {showDropdown && (
                  <div className="dropdown-menu">
                    <div
                      className="dropdown-item"
                      onClick={handleProfileClick}
                    >
                      Chỉnh sửa hồ sơ cá nhân
                    </div>
                    <div className="dropdown-item" onClick={handleLogout}>
                      Đăng xuất
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-nav">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn-nav">
                Đăng ký
              </Link>
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </form>
            </>
          )}
        </div>
      </div>
      <div className="home-content">
        <div className="home-content-inner">
          <Card title="CÔNG THỨC TÍNH TIỀN  😻1 tệ = 3550">
            <h4 style={{ 
              textAlign: 'left',
              fontSize: '16px',
              fontWeight: '600',
              margin: '-8px 0 14px -4px', // lùi sang trái thêm để thẳng với "Kèo ngoài"
              color: '#d32f2f',
              letterSpacing: '0.5px'
            }}>
              Kèo web
            </h4>
            <BetCalculationWrapper />
          </Card>
        </div>
          <div className="top-chart">
            <h4 className="top-chart-title">5 côn đồ mạnh nhất</h4>
            <p className="top-chart-note">Top 1 sẽ được 200k mỗi tháng dựa theo số $ cày được</p>
            <div className="top-chart-bars">
            {[1, 2, 3, 4, 5].map((i) => {
              const icon = i === 1 ? '🐃' : '🐔';
              const progressWidth = `${90 - i * 10}%`;
              return (
                <div key={i} className="top-chart-bar">
                  <span className="bar-rank">#{i}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: progressWidth }}>
                      <span className="bar-icon">{icon}</span>
                    </div>
                    <span className="bar-finish">🏁</span>
                  </div>
                  <span className="bar-name"></span>
                  <span className="bar-score"></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default HomePage;


