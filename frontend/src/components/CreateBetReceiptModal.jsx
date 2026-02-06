import { useState, useEffect } from 'react';
import { donHangAPI } from '../api/endpoints/don_hang.api';
import { parseDailiantongLink } from '../utils/parseDailiantongLink';
import './CreateBetReceiptModal.css';

const CreateBetReceiptModal = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [linkInput, setLinkInput] = useState('');

  // Reset form khi modal đóng/mở
  const resetForm = () => {
    setLinkInput('');
    setErrorMessage('');
    setIsLoading(false);
  };

  // Reset form khi modal mở
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Tạo đơn trực tiếp từ link
  const handleCreateFromLink = async () => {
    if (!linkInput.trim()) {
      setErrorMessage('Vui lòng nhập link');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Bước 1: Parse link ở client để lấy serialno và publish
      console.log('Parsing link ở client...');
      const { serialno, publish } = parseDailiantongLink(linkInput.trim());
      console.log('✅ Parsed link - SerialNo:', serialno, 'Publish:', publish);

      // Bước 2: Gửi serialno và publish lên server để lấy chi tiết
      console.log('Gửi request lên server để lấy chi tiết...');
      const result = await donHangAPI.getOrderDetail(serialno, publish);
      
      if (!result.success || !result.data) {
        setErrorMessage(result.error || 'Không thể lấy chi tiết đơn hàng');
        setIsLoading(false);
        return;
      }

      // Bước 3: Tạo đơn hàng từ thông tin đã lấy
      const orderData = result.data;
      const submitData = {
        task_code: orderData.task_code || '',
        web_bet_amount_cny: parseFloat(orderData.web_bet_amount_cny) || 0,
        order_code: orderData.order_code || '',
        completed_hours: orderData.completed_hours ? parseInt(orderData.completed_hours) : null,
        region: orderData.region || '',
        bet_type: orderData.bet_type || 'web',
        notes: orderData.notes || '',
        order_serial_no: serialno,
        order_publish: publish,
      };

      console.log('Tạo đơn hàng từ link:', submitData);
      const createResult = await donHangAPI.taoDonHang(submitData);

      if (createResult.success) {
        console.log('✅ Tạo đơn hàng thành công:', createResult.data);
        resetForm();
        if (onSuccess) {
          onSuccess(createResult.data);
        }
        onClose();
      } else {
        setErrorMessage(createResult.error || 'Tạo đơn hàng thất bại');
      }
    } catch (error) {
      console.error('Error creating bet receipt from link:', error);
      setErrorMessage(error.message || 'Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-bet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Tạo kèo mới</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Error message */}
          {errorMessage && (
            <div className="error-message" style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {errorMessage}
            </div>
          )}

          {/* Link input và nút tạo đơn */}
          <div className="form-group">
            <label>Link đơn hàng *</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="https://m.dailiantong.com/..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                disabled={isLoading}
                style={{ 
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isLoading && linkInput.trim()) {
                    handleCreateFromLink();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleCreateFromLink}
                disabled={isLoading || !linkInput.trim()}
                style={{
                  padding: '10px 24px',
                  backgroundColor: isLoading ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                {isLoading ? 'Đang tạo...' : 'Tạo đơn'}
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBetReceiptModal;
