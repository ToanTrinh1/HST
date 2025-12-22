import { useState } from 'react';
import './BetCalculationTable.css';

const BetCalculationTable = () => {
  const [betPrice, setBetPrice] = useState(90);
  const exchangeRate = 3550;

  // Bảng tra cứu phí web
  const getWebFee = (price) => {
    if (price < 20) return 2;
    if (price >= 20 && price <= 50) return 4;
    if (price >= 51 && price <= 100) return 5;
    if (price >= 101 && price <= 150) return 6;
    if (price >= 151 && price <= 200) return 7;
    if (price >= 201 && price <= 250) return 8;
    if (price >= 251 && price <= 300) return 9;
    if (price >= 301 && price <= 350) return 10;
    if (price >= 351 && price < 800) return 11;
    if (price >= 800) return 20;
    return 0;
  };

  const webFee = getWebFee(betPrice);
  const withdrawalFee = (betPrice * 0.02).toFixed(2);
  const intermediaryFee = (betPrice * 0.06).toFixed(2);
  const totalReceived = (betPrice - webFee - parseFloat(withdrawalFee) - parseFloat(intermediaryFee)).toFixed(1);

  return (
    <div className="bet-calculation-container">
      <div className="calculation-main-section">
        <div className="calculation-table-wrapper">
          <table className="calculation-table">
            <thead>
              <tr>
                <th>Giá kèo (tệ)</th>
                <th>Phí web</th>
                <th>
                  Phí rút tiền
                  <span className="fee-percentage">2%</span>
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

        <div className="web-fee-table-wrapper">
          <table className="web-fee-table">
            <thead>
              <tr>
                <th>Giá kèo</th>
                <th>Tệ</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>&lt;20</td><td>2</td></tr>
              <tr><td>20-50</td><td>4</td></tr>
              <tr><td>51-100</td><td>5</td></tr>
              <tr><td>101-150</td><td>6</td></tr>
              <tr><td>151-200</td><td>7</td></tr>
              <tr><td>201-250</td><td>8</td></tr>
              <tr><td>251-300</td><td>9</td></tr>
              <tr><td>301-350</td><td>10</td></tr>
              <tr><td>&gt;351</td><td>11</td></tr>
              <tr><td>800 trở lên</td><td>20</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="notes-section">
        <p className="note-title">Note:</p>
        <ul className="note-list">
          <li>Phí web tính theo Bảng bên cạnh</li>
          <li>Phí rút tiền (bao gồm phí của web và phí): 2% x Giá kèo</li>
          <li>Phí trung gian: 6% x Giá kèo thực nhận</li>
          <li className="exchange-rate">Tỷ giá đổi tệ: {exchangeRate}</li>
        </ul>
      </div>
    </div>
  );
};

export default BetCalculationTable;

