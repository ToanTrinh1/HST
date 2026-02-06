import api from '../config/axios.config';

const chatAPI = {
  async listThreads() {
    try {
      const res = await api.get('/chat/threads');
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi lấy danh sách chat',
      };
    }
  },

  async listAdmins(limit = 50, offset = 0) {
    try {
      const res = await api.get('/chat/admins', {
        params: { limit, offset },
      });
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi lấy danh sách admin',
      };
    }
  },

  async listMessages(userId = '', limit = 100, offset = 0, before = null) {
    try {
      const params = {
        user_id: userId || undefined,
      };
      
      if (before) {
        // Use cursor-based pagination (newest first)
        params.before = before;
        params.limit = limit;
      } else {
        // Use offset-based pagination (old method)
        params.limit = limit;
        params.offset = offset;
      }
      
      const res = await api.get('/chat/messages', { params });
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi lấy tin nhắn',
      };
    }
  },

  async uploadChatImage(file) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/chat/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi tải ảnh lên',
      };
    }
  },

  async sendMessage(content, receiverId = '', imageUrl = null) {
    try {
      const payload = receiverId ? { receiver_id: receiverId, content: content || '' } : { content: content || '' };
      if (imageUrl) payload.image_url = imageUrl;
      const res = await api.post('/chat/messages', payload);
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi gửi tin nhắn',
      };
    }
  },

  async markRead(userId = '') {
    try {
      const payload = userId ? { user_id: userId } : {};
      const res = await api.post('/chat/messages/read', payload);
      return res.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Lỗi khi cập nhật tin nhắn',
      };
    }
  },
};

export default chatAPI;
