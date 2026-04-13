// APIs về quản lý đơn hàng (thông tin nhận kèo)
import axiosInstance from '../config/axios.config';

export const donHangAPI = {
  // Lấy chi tiết đơn hàng từ serialno và publish (đã parse ở client)
  getOrderDetail: async (serialno, publish = 2) => {
    try {
      console.log('donHangAPI - Gửi POST request đến /bet-receipts/parse-link');
      console.log('donHangAPI - SerialNo:', serialno, 'Publish:', publish);
      
      const response = await axiosInstance.post('/bet-receipts/parse-link', { 
        serialno: serialno,
        publish: publish
      });
      console.log('donHangAPI - ✅ Get order detail response:', response.data);
      
      if (!response.data) {
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ Get order detail error:', error);
      
      let errorMsg = 'Không thể lấy chi tiết đơn hàng';
      
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
  // tab (admin): 'tong_hop' | 'don_hang_moi' | 'cho_chap_nhan' | 'da_xu_ly'. User không truyền tab.
  // month (optional): 'YYYY-MM' — lọc theo tháng hoàn thành (Asia/HCM) trên server (tab da_xu_ly hoặc user đơn DONE/Hủy/Đền)
  layDanhSachDonHang: async (limit = 100, offset = 0, tab = null, month = null) => {
    try {
      const params = { limit, offset };
      if (tab) params.tab = tab;
      if (month) params.month = month;
      console.log('donHangAPI - 📡 Gửi GET request đến /bet-receipts với params:', params);
      const response = await axiosInstance.get('/bet-receipts', {
        params
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

  // Cập nhật status đơn hàng
  capNhatStatusDonHang: async (id, statusData) => {
    try {
      console.log('donHangAPI - 📡 Gửi PATCH request đến /bet-receipts/' + id + '/status');
      console.log('donHangAPI - Data gửi đi:', statusData);
      
      const response = await axiosInstance.patch(`/bet-receipts/${id}/status`, statusData);
      console.log('donHangAPI - ✅ PATCH /bet-receipts/' + id + '/status response:', response.data);
      
      if (!response.data) {
        console.error('donHangAPI - ❌ response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ UpdateStatus error:', error);
      console.error('donHangAPI - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMsg = 'Cập nhật status đơn hàng thất bại';
      
      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Cập nhật đơn hàng (không phải status)
  capNhatDonHang: async (id, donHangData) => {
    try {
      console.log('donHangAPI - 📡 Gửi PUT request đến /bet-receipts/' + id);
      console.log('donHangAPI - Data gửi đi:', donHangData);
      
      const response = await axiosInstance.put(`/bet-receipts/${id}`, donHangData);
      console.log('donHangAPI - ✅ PUT /bet-receipts/' + id + ' response:', response.data);
      
      if (!response.data) {
        console.error('donHangAPI - ❌ response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ Update error:', error);
      console.error('donHangAPI - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMsg = 'Cập nhật đơn hàng thất bại';
      
      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Xóa đơn hàng
  xoaDonHang: async (id) => {
    try {
      console.log('donHangAPI - 📡 Gửi DELETE request đến /bet-receipts/' + id);
      
      const response = await axiosInstance.delete(`/bet-receipts/${id}`);
      console.log('donHangAPI - ✅ DELETE /bet-receipts/' + id + ' response:', response.data);
      
      if (!response.data) {
        console.error('donHangAPI - ❌ response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ Delete error:', error);
      console.error('donHangAPI - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMsg = 'Xóa đơn hàng thất bại';
      
      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Lấy tỷ giá công khai (cho UI user, không cần auth) - chỉ trả về exchange_rate
  layTyGiaCongKhai: async () => {
    try {
      const response = await axiosInstance.get('/bet-receipts/public-exchange-rate');
      if (!response.data) return { success: false, exchange_rate: 3550 };
      return { success: response.data.success !== false, exchange_rate: response.data.exchange_rate ?? 3550 };
    } catch (e) {
      return { success: false, exchange_rate: 3550 };
    }
  },

  // Config tính tiền user (tỷ giá + phí rút tiền %, phí trung gian %, bảng phí web) - cho màn CÔNG THỨC TÍNH TIỀN, không cần auth
  layConfigTinhTienUser: async () => {
    try {
      const response = await axiosInstance.get('/bet-receipts/public-user-fee-config');
      if (!response.data || response.data.success === false) {
        return {
          success: true,
          exchange_rate: 3550,
          fee_rut_tien_pct_web: 2,
          fee_rut_tien_pct_ngoai: 1,
          fee_trung_gian_pct: 6,
          fee_web_tiers: [],
        };
      }
      return {
        success: true,
        exchange_rate: response.data.exchange_rate ?? 3550,
        fee_rut_tien_pct_web: response.data.fee_rut_tien_pct_web ?? 2,
        fee_rut_tien_pct_ngoai: response.data.fee_rut_tien_pct_ngoai ?? 1,
        fee_trung_gian_pct: response.data.fee_trung_gian_pct ?? 6,
        fee_web_tiers: Array.isArray(response.data.fee_web_tiers) ? response.data.fee_web_tiers : [],
      };
    } catch (e) {
      return {
        success: true,
        exchange_rate: 3550,
        fee_rut_tien_pct_web: 2,
        fee_rut_tien_pct_ngoai: 1,
        fee_trung_gian_pct: 6,
        fee_web_tiers: [],
      };
    }
  },

  // Lấy tỷ giá hiện tại (đủ config, cần auth - dùng cho admin)
  layTyGiaHienTai: async () => {
    try {
      console.log('donHangAPI - 📡 Gửi GET request đến /bet-receipts/current-exchange-rate');
      
      const response = await axiosInstance.get('/bet-receipts/current-exchange-rate');
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
      console.error('donHangAPI - ❌ Get current exchange rate error:', error);
      console.error('donHangAPI - Error response:', error.response?.data);
      
      let errorMsg = 'Lấy tỷ giá hiện tại thất bại';
      
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

  // Cập nhật config: tỷ giá trả, tỷ giá nhận, phí web %, phí ngoài %
  capNhatConfig: async (payload) => {
    try {
      const response = await axiosInstance.post('/bet-receipts/update-config', payload);
      if (!response.data) return { success: false, error: 'Không nhận được dữ liệu từ server' };
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Cập nhật config thất bại';
      return { success: false, error: errorMsg };
    }
  },

  // Tính lại tệ cho một đơn hàng đã xử lý
  tinhLaiTe: async (donHangId) => {
    try {
      console.log('donHangAPI - 📡 Gửi POST request đến /bet-receipts/' + donHangId + '/recalculate-amount');
      
      const response = await axiosInstance.post(`/bet-receipts/${donHangId}/recalculate-amount`);
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
      console.error('donHangAPI - ❌ Tính lại tệ error:', error);
      console.error('donHangAPI - Error response:', error.response?.data);
      
      let errorMsg = 'Tính lại tệ thất bại';
      
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

  // Lấy top 5 users theo số tiền đã nhận trong tháng
  layTop5UsersThang: async (month = null) => {
    try {
      const params = month ? { month } : {};
      console.log('donHangAPI - 📡 Gửi GET request đến /bet-receipts/top-5-monthly với params:', params);
      const response = await axiosInstance.get('/bet-receipts/top-5-monthly', {
        params
      });
      console.log('donHangAPI - ✅ GET /bet-receipts/top-5-monthly response:', response.data);
      
      if (!response.data) {
        console.error('donHangAPI - ❌ response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ GetTop5UsersThang error:', error);
      console.error('donHangAPI - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMsg = 'Lấy top 5 users thất bại';
      
      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Lấy tổng số tiền đã nhận theo tháng cho user hiện tại
  layTongTienTheoThang: async (month = null) => {
    try {
      const params = month ? { month } : {};
      console.log('donHangAPI - 📡 Gửi GET request đến /bet-receipts/monthly-total với params:', params);
      const response = await axiosInstance.get('/bet-receipts/monthly-total', {
        params
      });
      console.log('donHangAPI - ✅ GET /bet-receipts/monthly-total response:', response.data);
      
      if (!response.data) {
        console.error('donHangAPI - ❌ response.data is null or undefined');
        return {
          success: false,
          error: 'Không nhận được dữ liệu từ server',
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('donHangAPI - ❌ GetMonthlyTotal error:', error);
      console.error('donHangAPI - Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMsg = 'Lấy tổng số tiền theo tháng thất bại';

      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  // Lợi nhuận admin theo tháng (tổng tất cả admin) - chỉ admin
  layLoiNhuanAdminTheoThang: async () => {
    try {
      const response = await axiosInstance.get('/bet-receipts/admin-profit-by-month');
      if (!response.data) {
        return { success: false, error: 'Không nhận được dữ liệu từ server' };
      }
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Lỗi khi lấy lợi nhuận admin';
      return { success: false, error: errorMsg };
    }
  },

  // Thống kê & lợi nhuận theo từng admin (hàng = admin) - chỉ admin. month: 'YYYY-MM' hoặc '' = tất cả
  layThongKeLoiNhuanAdmin: async (month = '') => {
    try {
      const params = month ? { month } : {};
      const response = await axiosInstance.get('/bet-receipts/admin-profit-stats', { params });
      if (!response.data) {
        return { success: false, error: 'Không nhận được dữ liệu từ server' };
      }
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Lỗi khi lấy thống kê';
      return { success: false, error: errorMsg };
    }
  },
};

export default donHangAPI;

