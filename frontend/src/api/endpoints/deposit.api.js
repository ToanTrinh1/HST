// APIs về nạp tiền (deposit)
import axiosInstance from '../config/axios.config';

export const depositAPI = {
  // Nạp tiền
  napTien: async (depositData) => {
    try {
      console.log('depositAPI - 📡 Gửi POST request đến /deposits');
      console.log('depositAPI - Data gửi đi:', depositData);
      
      const response = await axiosInstance.post('/deposits', depositData);
      console.log('depositAPI - ✅ Backend response:', response.data);
      
      if (!response.data) {
        console.error('depositAPI - Response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('depositAPI - ❌ Create error:', error);
      console.error('depositAPI - Error response:', error.response?.data);
      
      let errorMsg = 'Nạp tiền thất bại';
      
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

  // Lấy tất cả lịch sử nạp tiền
  layTatCaLichSu: async () => {
    try {
      console.log('depositAPI - 📡 Gửi GET request đến /deposits');
      
      const response = await axiosInstance.get('/deposits');
      console.log('depositAPI - ✅ Backend response:', response.data);
      
      if (!response.data) {
        console.error('depositAPI - Response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('depositAPI - ❌ Get all error:', error);
      console.error('depositAPI - Error response:', error.response?.data);
      
      let errorMsg = 'Lấy lịch sử nạp tiền thất bại';
      
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
};

export default depositAPI;

