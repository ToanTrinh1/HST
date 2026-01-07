import { useState, useEffect } from 'react';
import axiosInstance from '../api/config/axios.config';

/**
 * Component để test kết nối API
 * Component này sẽ hiển thị thông tin về cấu hình API và test kết nối
 */
const APIConnectionTest = () => {
  const [apiConfig, setApiConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Lấy thông tin cấu hình API
    const config = {
      REACT_APP_API_URL: process.env.REACT_APP_API_URL || 'NOT SET',
      API_BASE_URL: axiosInstance.defaults.baseURL,
      currentHost: window.location.host,
      currentOrigin: window.location.origin,
    };
    setApiConfig(config);
  }, []);

  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // Test 1: Health check hoặc endpoint đơn giản
      const testUrl = axiosInstance.defaults.baseURL.replace('/api', '') + '/health';
      console.log('🧪 Testing connection to:', testUrl);

      const healthResponse = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const healthData = await healthResponse.text();
      console.log('✅ Health check response:', healthData);

      // Test 2: Test API endpoint (có thể là /api/auth/me hoặc endpoint public)
      let apiTestResult = null;
      try {
        const apiResponse = await axiosInstance.get('/auth/me').catch(() => null);
        if (apiResponse) {
          apiTestResult = {
            success: true,
            status: apiResponse.status,
            message: 'API endpoint phản hồi thành công (có thể cần authentication)',
          };
        }
      } catch (error) {
        if (error.response) {
          // Có response từ server (dù là 401/403) nghĩa là kết nối thành công
          apiTestResult = {
            success: true,
            status: error.response.status,
            message: `API endpoint phản hồi (status: ${error.response.status}) - Kết nối thành công!`,
          };
        } else if (error.request) {
          // Không có response từ server
          apiTestResult = {
            success: false,
            message: 'Không thể kết nối đến API endpoint. Kiểm tra lại REACT_APP_API_URL.',
          };
        }
      }

      setTestResult({
        healthCheck: {
          success: healthResponse.ok,
          status: healthResponse.status,
          data: healthData,
        },
        apiTest: apiTestResult,
        timestamp: new Date().toLocaleString('vi-VN'),
      });
    } catch (error) {
      console.error('❌ Test connection error:', error);
      setTestResult({
        healthCheck: {
          success: false,
          error: error.message,
        },
        apiTest: {
          success: false,
          message: 'Lỗi khi test kết nối: ' + error.message,
        },
        timestamp: new Date().toLocaleString('vi-VN'),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!apiConfig) return null;

  return (
    <div style={{
      padding: '20px',
      margin: '20px',
      border: '2px solid #007bff',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      fontFamily: 'monospace',
    }}>
      <h3 style={{ marginTop: 0, color: '#007bff' }}>🔍 API Connection Test</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <h4>📋 Cấu hình hiện tại:</h4>
        <pre style={{
          backgroundColor: '#fff',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto',
        }}>
          {JSON.stringify(apiConfig, null, 2)}
        </pre>
      </div>

      <button
        onClick={testConnection}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        {loading ? '⏳ Đang test...' : '🧪 Test API Connection'}
      </button>

      {testResult && (
        <div style={{ marginTop: '20px' }}>
          <h4>📊 Kết quả test ({testResult.timestamp}):</h4>
          <div style={{
            backgroundColor: '#fff',
            padding: '15px',
            borderRadius: '4px',
            marginTop: '10px',
          }}>
            <div style={{ marginBottom: '15px' }}>
              <strong>Health Check:</strong>
              <div style={{
                color: testResult.healthCheck.success ? '#28a745' : '#dc3545',
                marginLeft: '10px',
              }}>
                {testResult.healthCheck.success ? '✅' : '❌'} 
                Status: {testResult.healthCheck.status || 'N/A'}
                {testResult.healthCheck.data && (
                  <div style={{ marginTop: '5px', fontSize: '12px' }}>
                    Response: {testResult.healthCheck.data}
                  </div>
                )}
                {testResult.healthCheck.error && (
                  <div style={{ marginTop: '5px', fontSize: '12px', color: '#dc3545' }}>
                    Error: {testResult.healthCheck.error}
                  </div>
                )}
              </div>
            </div>

            {testResult.apiTest && (
              <div>
                <strong>API Endpoint Test:</strong>
                <div style={{
                  color: testResult.apiTest.success ? '#28a745' : '#dc3545',
                  marginLeft: '10px',
                }}>
                  {testResult.apiTest.success ? '✅' : '❌'} 
                  {testResult.apiTest.message}
                  {testResult.apiTest.status && (
                    <span style={{ marginLeft: '10px' }}>
                      (HTTP {testResult.apiTest.status})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#6c757d' }}>
        <strong>💡 Lưu ý:</strong>
        <ul style={{ marginTop: '5px' }}>
          <li>Kiểm tra Console (F12) để xem log chi tiết</li>
          <li>Kiểm tra Network tab để xem các request API</li>
          <li>Nếu API URL sai, cần rebuild frontend container với đúng REACT_APP_API_URL</li>
        </ul>
      </div>
    </div>
  );
};

export default APIConnectionTest;

