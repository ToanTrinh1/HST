import { Link } from 'react-router-dom';
import { useState } from 'react';
import './HomePage.css';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Searching for:', searchQuery);
  };

  return (
    <div>
      <div className="home-navbar">
        <div className="navbar-brand">
          <h2>My App</h2>
        </div>
        <div className="navbar-menu">
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
        </div>
      </div>
    </div>
  );
};

export default HomePage;

