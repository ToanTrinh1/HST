// APIs về quản lý user (profile, update...)
import axiosInstance from '../config/axios.config';

export const userAPI = {
  // Lấy thông tin profile
  getProfile: async () => {
    try {
      const response = await axiosInstance.get('/users/me');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cập nhật profile
  updateProfile: async (userData) => {
    try {
      const response = await axiosInstance.put('/users/me', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Xóa user
  deleteUser: async (userId) => {
    try {
      const response = await axiosInstance.delete(`/users/${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default userAPI;