/**
 * Build link rút gọn từ serialno/publish để mở kèo
 * @param {string} serialno
 * @param {number} publish
 * @returns {string}
 */
export const buildDailiantongLink = (serialno, publish = 2) => {
  if (!serialno || typeof serialno !== 'string') {
    return '';
  }

  const payload = {
    serialno,
    publish: typeof publish === 'number' && publish > 0 ? publish : 2,
  };

  const json = JSON.stringify(payload);
  const encoded = encodeURIComponent(encodeURIComponent(json));

  return `https://m.dailiantong.com/#/pages/orderdetail/orderdetail?detailData=${encoded}`;
};
