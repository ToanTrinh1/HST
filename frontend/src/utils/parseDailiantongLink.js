/**
 * Parse link dailiantong.com để lấy serialno và publish
 * @param {string} link - Link từ m.dailiantong.com
 * @returns {{serialno: string, publish: number}} - Object chứa serialno và publish
 */
export const parseDailiantongLink = (link) => {
  try {
    // Parse URL
    const url = new URL(link);
    
    // Lấy fragment (#)
    if (!url.hash) {
      throw new Error('Link không chứa fragment (#)');
    }
    
    // Fragment: pages/orderdetail/orderdetail?detailData=...
    if (!url.hash.includes('detailData=')) {
      throw new Error('Không tìm thấy detailData trong fragment');
    }
    
    // Tách query string từ fragment
    const fragmentParts = url.hash.split('?');
    if (fragmentParts.length < 2) {
      throw new Error('Fragment không chứa query string');
    }
    
    const fragmentQuery = fragmentParts[1];
    const params = new URLSearchParams(fragmentQuery);
    
    let detailData = params.get('detailData');
    if (!detailData) {
      throw new Error('Không tìm thấy detailData');
    }
    
    // detailData bị encode 2 lần, cần unescape 2 lần
    let detailData1 = decodeURIComponent(detailData);
    let detailData2 = decodeURIComponent(detailData1);
    
    // Parse JSON
    const data = JSON.parse(detailData2);
    
    const serialno = data.serialno;
    if (!serialno || typeof serialno !== 'string') {
      throw new Error('Không tìm thấy serialno hoặc không phải string');
    }
    
    const publish = data.publish || 2; // Default là 2
    
    return {
      serialno: serialno,
      publish: typeof publish === 'number' ? publish : parseInt(publish, 10) || 2,
    };
  } catch (error) {
    throw new Error(`Không thể parse link: ${error.message}`);
  }
};
