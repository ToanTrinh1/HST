// APIs về quản lý đơn hàng (thông tin nhận kèo)
import axiosInstance from '../config/axios.config';

export const donHangAPI = {
  // Tạo đơn hàng mới
  taoDonHang: async (donHangData) => {
    try {
      console.log('donHangAPI - Gửi POST request đến /bet-receipts');
      console.log('donHangAPI - Data gửi đi:', donHangData);
      
      const response = await axiosInstance.post('/bet-receipts', donHangData);
      console.log('donHangAPI - ✅ Backend response:', response.data);
      
      if (!response.data) {
        console.error('donHangAPI - Response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ Create error:', error);
      console.error('donHangAPI - Error response:', error.response?.data);
      
      let errorMsg = 'Tạo đơn hàng thất bại';
      
      if (error.response) {
        errorMsg = error.response.data?.error || error.response.data?.message || errorMsg;
      } else if (error.request) {
        errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else {
        errorMsg = error.message || errorMsg;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Lấy danh sách đơn hàng
  layDanhSachDonHang: async (limit = 100, offset = 0) => {
    try {
      console.log('donHangAPI - 📡 Gửi GET request đến /bet-receipts với params:', { limit, offset });
      const response = await axiosInstance.get('/bet-receipts', {
        params: { limit, offset }
      });
      console.log('donHangAPI - ✅ GET /bet-receipts response:', response.data);
      
      if (!response.data) {
        console.error('donHangAPI - ❌ response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ GetAll error:', error);
      console.error('donHangAPI - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMsg = 'Lấy danh sách đơn hàng thất bại';
      
      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Lấy thông tin đơn hàng theo ID
  layDonHangTheoId: async (id) => {
    try {
      const response = await axiosInstance.get(`/bet-receipts/${id}`);
      
      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ GetById error:', error);
      
      let errorMsg = 'Lấy thông tin đơn hàng thất bại';
      
      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },
};

export default donHangAPI;

