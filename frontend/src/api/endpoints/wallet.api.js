// APIs về quản lý wallet (rút tiền)
import axiosInstance from '../config/axios.config';

export const walletAPI = {
  // Lấy danh sách tất cả wallets
  layDanhSachWallets: async (limit = 100, offset = 0) => {
    try {
      console.log('walletAPI - 📡 Gửi GET request đến /wallets với params:', { limit, offset });
      const response = await axiosInstance.get('/wallets', {
        params: { limit, offset }
      });
      console.log('walletAPI - ✅ GET /wallets response:', response.data);
      
      if (!response.data) {
        console.error('walletAPI - ❌ response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('walletAPI - ❌ GetAll error:', error);
      console.error('walletAPI - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMsg = 'Lấy danh sách wallets thất bại';
      
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

export default walletAPI;
