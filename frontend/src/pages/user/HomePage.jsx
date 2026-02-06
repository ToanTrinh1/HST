import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNavigation from '../../components/BottomNavigation';
import TopBar from '../../components/TopBar';
import Card from '../../components/Card';
import BetCalculationWrapper from '../../components/BetCalculationWrapper';
import { donHangAPI } from '../../api/endpoints/don_hang.api';
import { buildAvatarUrl } from '../../utils/avatar';
import './HomePage.css';

const HomePage = () => {
  const [topUsers, setTopUsers] = useState([]);
  const [isLoadingTopUsers, setIsLoadingTopUsers] = useState(false);
  const [dataMonth, setDataMonth] = useState(null);
  const { isAuthenticated } = useAuth();

  // Fetch top 5 users - tự động cập nhật khi tháng thay đổi
  useEffect(() => {
    const fetchTopUsers = async () => {
      setIsLoadingTopUsers(true);
      try {
        // Lấy tháng hiện tại
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const response = await donHangAPI.layTop5UsersThang(currentMonth);
        if (response.success && response.data) {
          console.log('Top users data:', response.data);
          setTopUsers(response.data);
          // Lưu tháng của dữ liệu (từ response hoặc dùng currentMonth)
          setDataMonth(response.month || currentMonth);
        } else {
          console.error('Lỗi khi lấy top users:', response.error);
          setTopUsers([]);
          setDataMonth(null);
        }
      } catch (error) {
        console.error('Lỗi khi fetch top users:', error);
        setTopUsers([]);
      } finally {
        setIsLoadingTopUsers(false);
      }
    };

    fetchTopUsers();

    // Kiểm tra mỗi phút xem tháng có thay đổi không
    const intervalId = setInterval(() => {
      fetchTopUsers();
    }, 60000); // Check mỗi 60 giây

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Lấy chữ cái đầu tiên của tên để hiển thị trong avatar

  return (
    <div className="page-with-bottom-nav">
      <TopBar />
      <div className="home-content">
        <div className="home-content-inner">
          <Card title="CÔNG THỨC TÍNH TIỀN 😻">
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
          <Card title="MINI GAME">
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px'
            }}>
              Mini game sẽ được cập nhật sau này
            </div>
          </Card>
        </div>
        <div className="top-chart">
          <h4 className="top-chart-title">5 côn đồ mạnh nhất</h4>
          <p className="top-chart-note">Top 1 sẽ được 200k mỗi tháng dựa theo số ¥ cày được</p>
          <div className="top-chart-bars">
            {isLoadingTopUsers ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Đang tải...
              </div>
            ) : (
              (() => {
                // Kiểm tra xem tháng đã kết thúc chưa
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const isMonthEnded = dataMonth && currentMonth !== dataMonth;
                
                // Tính max amount để normalize progress width
                const maxAmount = topUsers.length > 0 ? Math.max(...topUsers.map(u => u.amount_cny || 0)) : 1;
                // Luôn hiển thị đủ 5 hàng
                return Array.from({ length: 5 }, (_, i) => {
                  if (i < topUsers.length) {
                    // Có dữ liệu thực
                    const user = topUsers[i];
                    const rank = i + 1;
                    const amount = user.amount_cny || 0;
                    
                    // Nếu hết tháng và là top 1, cho chạm đích (100%)
                    // Nếu không, dùng công thức bình thường (90% max)
                    let progressWidth;
                    if (isMonthEnded && rank === 1 && amount > 0) {
                      progressWidth = '100%'; // Top 1 chạm đích khi hết tháng
                    } else {
                      progressWidth = maxAmount > 0 ? `${(amount / maxAmount) * 90}%` : '0%';
                    }
                    
                    const avatarUrl = buildAvatarUrl(user.avatar_url);
                    const userInitials = user.user_name ? user.user_name.charAt(0).toUpperCase() : 'U';
                    const isWinner = isMonthEnded && rank === 1 && amount > 0;
                    
                    return (
                      <div key={`user-${user.user_id}-${i}`} className="top-chart-bar">
                        <span className="bar-rank">{user.user_name || 'N/A'}</span>
                        <div className={`bar-track ${isWinner ? 'bar-track-winner' : ''}`}>
                          <div 
                            className={`bar-fill ${isWinner ? 'bar-fill-winner' : ''}`}
                            style={{ width: progressWidth }}
                          >
                            <div 
                              className="bar-avatar"
                              style={avatarUrl ? {
                                backgroundImage: `url(${avatarUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              } : {}}
                            >
                              {!avatarUrl && userInitials}
                            </div>
                          </div>
                          <span className="bar-finish">🏁</span>
                        </div>
                      </div>
                    );
                  } else {
                    // Chưa có dữ liệu - hiển thị "đang cập nhật"
                    return (
                      <div key={`placeholder-${i}`} className="top-chart-bar">
                        <span className="bar-rank" style={{ color: '#999', fontStyle: 'italic' }}>
                          Đang cập nhật
                        </span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: '0%' }}>
                            <div className="bar-avatar">
                              ?
                            </div>
                          </div>
                          <span className="bar-finish">🏁</span>
                        </div>
                      </div>
                    );
                  }
                });
              })()
            )}
          </div>
        </div>

        {/* Khu vực cá nhân: 3 box */}
        <div className="personal-section">
          <div className="personal-card personal-card-left">
            <h4>Nhiệm vụ đã hoàn thành</h4>
            <div className="personal-card-body">Chưa có dữ liệu</div>
          </div>
          <div className="personal-card personal-card-center">
            <h4>Nhiệm vụ cần làm</h4>
            <div className="personal-card-body">Chưa có dữ liệu</div>
          </div>
          <div className="personal-card personal-card-right">
            <h4>Tài chính</h4>
            <div className="personal-card-body">Chưa có dữ liệu</div>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default HomePage;


