import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading, updateUser } = useAuth();
  const [checkingRole, setCheckingRole] = useState(true);

  // Refresh user info từ server khi vào AdminRoute để đảm bảo có vai_tro mới nhất
  useEffect(() => {
    const refreshUserInfo = async () => {
      if (isAuthenticated) {
        try {
          console.log('AdminRoute - Refreshing user info from server...');
          console.log('AdminRoute - Current user:', user);
          const response = await authAPI.getCurrentUser();
          console.log('AdminRoute - API response:', response);
          if (response.success && response.data) {
            console.log('AdminRoute - User info refreshed:', response.data);
            console.log('AdminRoute - Refreshed user vai_tro:', response.data.vai_tro);
            updateUser(response.data);
          }
        } catch (error) {
          console.error('AdminRoute - Error refreshing user info:', error);
        }
      }
      setCheckingRole(false);
    };

    if (!loading && isAuthenticated) {
      refreshUserInfo();
    } else if (!loading) {
      setCheckingRole(false);
    }
  }, [isAuthenticated, loading, updateUser, user]);

  if (loading || checkingRole) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('AdminRoute - User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('AdminRoute - Checking user vai_tro:', user?.vai_tro);
  console.log('AdminRoute - User object:', user);
  if (user?.vai_tro !== 'admin') {
    console.log('AdminRoute - User vai_tro is not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('AdminRoute - User is admin, allowing access');

  return children;
};

export default AdminRoute;

