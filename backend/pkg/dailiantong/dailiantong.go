package dailiantong

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	BaseURL = "https://server.dailiantong.com.cn/API/AppService.ashx"
	Secret  = "9c7b9399680658d308691f2acad58c0a"
)

// OrderInfo chứa thông tin từ link
type OrderInfo struct {
	SerialNo string
	Publish  int
}

// OrderDetailResponse chứa response từ API
type OrderDetailResponse struct {
	SerialNo   string  `json:"SerialNo"`
	Title      string  `json:"Title"`
	Price      float64 `json:"Price"`
	TimeLimit  int     `json:"TimeLimit"`
	Zone       string  `json:"Zone"`
	Server     string  `json:"Server"`
	Game       string  `json:"Game"`
	CurrInfo   string  `json:"CurrInfo"`
	Require    string  `json:"Require"`
	GameAcc    string  `json:"GameAcc"`
	GamePass   string  `json:"GamePass"`
	EnGamePass string  `json:"EnGamePass"`
	GameMobile string  `json:"GameMobile"`
	Status     int     `json:"Status"`
	CreateDate string  `json:"CreateDate"`
	UpdateDate string  `json:"UpdateDate"`
}

// ParsedOrderData chứa dữ liệu đã parse để tạo đơn hàng
type ParsedOrderData struct {
	TaskCode        string  `json:"task_code"`          // Từ Title
	WebBetAmountCNY float64 `json:"web_bet_amount_cny"` // Từ Price
	OrderCode       string  `json:"order_code"`         // Từ SerialNo
	CompletedHours  *int    `json:"completed_hours"`    // Từ TimeLimit
	Region          string  `json:"region"`             // Từ Server (có thể dịch)
	Notes           string  `json:"notes"`              // Từ Title hoặc CurrInfo
}

// BuildOrderLink tạo link rút gọn để mở kèo từ serialno/publish
func BuildOrderLink(serialNo string, publish int) string {
	if strings.TrimSpace(serialNo) == "" {
		return ""
	}
	if publish <= 0 {
		publish = 2
	}

	payload := map[string]interface{}{
		"serialno": serialNo,
		"publish":  publish,
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return ""
	}

	encoded := url.QueryEscape(string(raw))
	encoded = url.QueryEscape(encoded) // detailData bị encode 2 lần

	return fmt.Sprintf("https://m.dailiantong.com/#/pages/orderdetail/orderdetail?detailData=%s", encoded)
}

// ExtractSerialFromURL parse link m.dailiantong.com để lấy serialno và publish
func ExtractSerialFromURL(link string) (*OrderInfo, error) {
	parsedURL, err := url.Parse(link)
	if err != nil {
		return nil, fmt.Errorf("không thể parse URL: %v", err)
	}

	// Lấy fragment (#)
	if parsedURL.Fragment == "" {
		return nil, fmt.Errorf("link không chứa fragment (#)")
	}

	// Fragment: pages/orderdetail/orderdetail?detailData=...
	if !strings.Contains(parsedURL.Fragment, "detailData=") {
		return nil, fmt.Errorf("không tìm thấy detailData trong fragment")
	}

	// Tách query string từ fragment
	fragmentParts := strings.SplitN(parsedURL.Fragment, "?", 2)
	if len(fragmentParts) < 2 {
		return nil, fmt.Errorf("fragment không chứa query string")
	}

	fragmentQuery := fragmentParts[1]
	params, err := url.ParseQuery(fragmentQuery)
	if err != nil {
		return nil, fmt.Errorf("không thể parse query string: %v", err)
	}

	detailData := params.Get("detailData")
	if detailData == "" {
		return nil, fmt.Errorf("không tìm thấy detailData")
	}

	// detailData bị encode 2 lần, cần unescape 2 lần
	detailData1, err := url.QueryUnescape(detailData)
	if err != nil {
		return nil, fmt.Errorf("không thể unescape detailData lần 1: %v", err)
	}

	detailData2, err := url.QueryUnescape(detailData1)
	if err != nil {
		return nil, fmt.Errorf("không thể unescape detailData lần 2: %v", err)
	}

	// Parse JSON
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(detailData2), &data); err != nil {
		return nil, fmt.Errorf("không thể parse JSON: %v", err)
	}

	serialno, ok := data["serialno"].(string)
	if !ok {
		return nil, fmt.Errorf("không tìm thấy serialno hoặc không phải string")
	}

	publish := 2 // Default
	if p, ok := data["publish"].(float64); ok {
		publish = int(p)
	}

	return &OrderInfo{
		SerialNo: serialno,
		Publish:  publish,
	}, nil
}

// makeSign tạo signature cho API request
func makeSign(action string, query string) string {
	// Concat các giá trị đã unescape
	concat := ""
	for _, pair := range strings.Split(query, "&") {
		parts := strings.SplitN(pair, "=", 2)
		if len(parts) == 2 {
			unescaped, _ := url.QueryUnescape(parts[1])
			concat += unescaped
		}
	}

	raw := Secret + action + concat
	hash := md5.Sum([]byte(raw))
	return fmt.Sprintf("%x", hash)
}

// GetOrderDetail gọi API để lấy chi tiết đơn hàng
func GetOrderDetail(serialno string, publish int) (*OrderDetailResponse, error) {
	action := "LevelOrderDetail"
	ts := int(time.Now().Unix())

	query := fmt.Sprintf(
		"ODSerialNo=%s&IsPublish=%d&UserID=0&TimeStamp=%d&Ver=1.0&AppVer=5.1.8&AppOS=WebApp IOS&AppID=webapp",
		url.QueryEscape(serialno),
		publish,
		ts,
	)

	sign := makeSign(action, query)
	query += "&Sign=" + sign

	apiURL := BaseURL + "?Action=" + action

	req, err := http.NewRequest("POST", apiURL, strings.NewReader(query))
	if err != nil {
		return nil, fmt.Errorf("không thể tạo request: %v", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Origin", "https://m.dailiantong.com")
	req.Header.Set("Referer", "https://m.dailiantong.com/")

	client := &http.Client{
		Timeout: 30 * time.Second, // Tăng timeout lên 30 giây
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("không thể gọi API: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("không thể đọc response: %v", err)
	}

	fmt.Println("Raw response:", string(body))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var orderDetail OrderDetailResponse
	if err := json.Unmarshal(body, &orderDetail); err != nil {
		return nil, fmt.Errorf("không thể parse response JSON: %v", err)
	}

	return &orderDetail, nil
}

// TranslateServer dịch tên server từ tiếng Trung sang tiếng Việt (nếu cần)
func TranslateServer(server string) string {
	// Map một số server phổ biến
	serverMap := map[string]string{
		"艾欧尼亚":  "Ionia",
		"诺克萨斯":  "Noxus",
		"德玛西亚":  "Demacia",
		"班德尔城":  "Bandle City",
		"皮尔特沃夫": "Piltover",
		"战争学院":  "Học Viện Chiến Tranh",
		"巨神峰":   "Targon",
		"雷瑟守备":  "Leona",
		"裁决之地":  "Đấu Trường",
		"黑色玫瑰":  "Hoa Hồng Đen",
		"暗影岛":   "Đảo Bóng Tối",
		"钢铁烈阳":  "Mặt Trời Thép",
		"水晶之痕":  "Dấu Vết Pha Lê",
		"均衡教派":  "Giáo Phái Cân Bằng",
		"影流":    "Bóng Tối",
		"守望之海":  "Biển Canh Gác",
		"征服之海":  "Biển Chinh Phục",
		"卡拉曼达":  "Kalamanda",
		"皮城警备":  "Cảnh Vệ Piltover",
	}

	if translated, ok := serverMap[server]; ok {
		return translated
	}
	return server // Trả về nguyên bản nếu không có trong map
}

// ParseOrderLink parse link và trả về dữ liệu để tạo đơn hàng
func ParseOrderLink(link string) (*ParsedOrderData, error) {
	// Bước 1: Extract serial từ URL
	orderInfo, err := ExtractSerialFromURL(link)
	if err != nil {
		return nil, fmt.Errorf("không thể extract serial từ URL: %v", err)
	}

	// Bước 2: Gọi API để lấy chi tiết
	orderDetail, err := GetOrderDetail(orderInfo.SerialNo, orderInfo.Publish)
	if err != nil {
		return nil, fmt.Errorf("không thể lấy chi tiết đơn hàng: %v", err)
	}

	// Bước 3: Parse và map dữ liệu
	var completedHours *int
	if orderDetail.TimeLimit > 0 {
		completedHours = &orderDetail.TimeLimit
	}
	region := TranslateServer(orderDetail.Server)

	// Tạo notes từ Title hoặc CurrInfo
	notes := orderDetail.Title
	if orderDetail.CurrInfo != "" {
		notes = orderDetail.CurrInfo
	}

	return &ParsedOrderData{
		TaskCode:        orderDetail.Title,
		WebBetAmountCNY: orderDetail.Price,
		OrderCode:       orderDetail.SerialNo,
		CompletedHours:  completedHours,
		Region:          region,
		Notes:           notes,
	}, nil
}
