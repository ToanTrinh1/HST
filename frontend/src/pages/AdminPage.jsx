import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import ChatPage from './ChatPage';
import AdminBetsSection from './admin/AdminBetsSection';
import AdminWithdrawSection from './admin/AdminWithdrawSection';
import AdminProfitSection from './admin/AdminProfitSection';
import AdminBottomNavigation from '../components/AdminBottomNavigation';
import './user/HomePage.css';
import './AdminPage.css';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('danh-sach-keo');
  useAuth(); // ensure auth context available

  // Disable scroll cho body khi component mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  return (
    <div className="page-with-bottom-nav">
      <TopBar />
      <div className="admin-content">
        {activeTab === 'danh-sach-keo' && <AdminBetsSection />}
        {activeTab === 'rut-tien' && <AdminWithdrawSection />}
        {activeTab === 'loi-nhuan' && <AdminProfitSection />}
        {activeTab === 'chat' && (
          <div className="admin-tab-content admin-chat-container">
            <ChatPage embedded />
                    </div>
                  )}
                </div>
      <AdminBottomNavigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />
    </div>
  );
};

export default AdminPage;
