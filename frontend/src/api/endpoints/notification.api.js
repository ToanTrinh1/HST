import api from '../config/axios.config';

const notificationAPI = {
  async list(limit = 50, offset = 0) {
    try {
      const res = await api.get('/notifications', {
        params: { limit, offset },
      });
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi lấy thông báo',
      };
    }
  },

  async markRead(id) {
    try {
      const res = await api.post(`/notifications/${id}/read`);
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi cập nhật thông báo',
      };
    }
  },

  async markAllRead() {
    try {
      const res = await api.post('/notifications/read-all');
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi cập nhật thông báo',
      };
    }
  },
};

export default notificationAPI;
