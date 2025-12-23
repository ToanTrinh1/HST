// APIs về rút tiền (withdrawal)
import axiosInstance from '../config/axios.config';

export const withdrawalAPI = {
  // Rút tiền
  rutTien: async (withdrawalData) => {
    try {
      console.log('withdrawalAPI - 📡 Gửi POST request đến /withdrawals');
      console.log('withdrawalAPI - Data gửi đi:', withdrawalData);
      
      const response = await axiosInstance.post('/withdrawals', withdrawalData);
      console.log('withdrawalAPI - ✅ Backend response:', response.data);
      
      if (!response.data) {
        console.error('withdrawalAPI - Response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('withdrawalAPI - ❌ Create error:', error);
      console.error('withdrawalAPI - Error response:', error.response?.data);
      
      let errorMsg = 'Rút tiền thất bại';
      
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

export default withdrawalAPI;

