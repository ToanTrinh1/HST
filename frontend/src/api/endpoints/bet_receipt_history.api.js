import axiosInstance from '../config/axios.config';

const betReceiptHistoryAPI = {
  // Lấy tất cả lịch sử (có phân trang)
  layTatCaLichSu: async (limit = 100, offset = 0) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.get('/bet-receipt-history', {
        params: { limit, offset },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ Lỗi khi lấy lịch sử:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // Lấy lịch sử theo bet_receipt_id
  layLichSuTheoDonHang: async (betReceiptId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.get(`/bet-receipt-history/${betReceiptId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ Lỗi khi lấy lịch sử theo đơn hàng:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },
};

export default betReceiptHistoryAPI;


