import { useState } from 'react';
import './BetCalculationTable.css';

const BetCalculationTableOuter = () => {
  const [betPrice, setBetPrice] = useState(90);
  const exchangeRate = 3550;

  // Phí web luôn là 0 cho kèo ngoài
  const webFee = 0;
  const withdrawalFee = (betPrice * 0.01).toFixed(2); // 1%
  const intermediaryFee = (betPrice * 0.06).toFixed(2); // 6%
  const totalReceived = (betPrice - webFee - parseFloat(withdrawalFee) - parseFloat(intermediaryFee)).toFixed(1);

  return (
    <div className="bet-calculation-container">
      <div className="calculation-left-section">
        <div className="calculation-table-wrapper">
          <table className="calculation-table">
            <thead>
              <tr>
                <th>Giá kèo (tệ)</th>
                <th>Phí web</th>
                <th>
                  Phí rút tiền
                  <span className="fee-percentage">1%</span>
                </th>
                <th>
                  Phí trung gian
                  <span className="fee-percentage">6%</span>
                </th>
                <th>Tổng thực nhận</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <input
                    type="number"
                    value={betPrice}
                    onChange={(e) => setBetPrice(parseFloat(e.target.value) || 0)}
                    className="bet-input"
                  />
                </td>
                <td>{webFee}</td>
                <td>{withdrawalFee}</td>
                <td>{intermediaryFee}</td>
                <td className="total-received">{totalReceived}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="notes-section">
          <p className="note-title">Note:</p>
          <ul className="note-list">
            <li>Phí web: 0 (không áp dụng bảng giá kèo web)</li>
            <li>Phí rút tiền: 1% x Giá kèo</li>
            <li>Phí trung gian: 6% x Giá kèo thực nhận</li>
            <li className="exchange-rate">Tỷ giá đổi tệ: {exchangeRate}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BetCalculationTableOuter;

