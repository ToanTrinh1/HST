package translate

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// TranslateText dịch text từ tiếng Trung sang tiếng Việt
// Sử dụng LibreTranslate API (miễn phí, không cần API key)
func TranslateText(text string) (string, error) {
	if text == "" {
		log.Printf("📝 [TranslateText] Text rỗng, bỏ qua")
		return "", nil
	}

	log.Printf("📝 [TranslateText] Bắt đầu dịch: %s", text)

	// Kiểm tra xem text có phải tiếng Trung không (chứa ký tự Trung Quốc)
	if !containsChinese(text) {
		// Không phải tiếng Trung, trả về nguyên bản
		log.Printf("ℹ️  [TranslateText] Text không phải tiếng Trung, giữ nguyên: %s", text)
		return text, nil
	}

	// Thử dùng mapping dictionary trước (nhanh hơn)
	if translated := translateWithDictionary(text); translated != "" {
		log.Printf("📚 [TranslateText] Dùng dictionary: %s → %s", text, translated)
		return translated, nil
	}

	log.Printf("🌐 [TranslateText] Không có trong dictionary, gọi MyMemory API cho: %s", text)

	// Nếu không có trong dictionary, dùng MyMemory Translation API
	apiURL := "https://api.mymemory.translated.net/get"

	// Tạo query parameters
	params := "?q=" + strings.ReplaceAll(url.QueryEscape(text), "+", "%20") + "&langpair=zh|vi"

	fullURL := apiURL + params

	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		log.Printf("❌ [TranslateText] Lỗi tạo request: %v", err)
		return text, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	log.Printf("📡 [TranslateText] Gửi request đến MyMemory API: %s", fullURL)
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("❌ [TranslateText] Lỗi khi gọi API: %v", err)
		return text, err
	}
	defer resp.Body.Close()

	log.Printf("📥 [TranslateText] Response status: %d", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		// Đọc response body để xem lỗi chi tiết
		body, _ := io.ReadAll(resp.Body)
		log.Printf("❌ [TranslateText] API trả về status code không OK: %d, Response: %s", resp.StatusCode, string(body))
		return text, nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ [TranslateText] Lỗi đọc response body: %v", err)
		return text, err
	}

	log.Printf("📥 [TranslateText] Response body: %s", string(body))

	// Parse JSON response từ MyMemory API
	var result struct {
		ResponseData struct {
			TranslatedText string  `json:"translatedText"`
			Match          float64 `json:"match"`
		} `json:"responseData"`
		QuotaFinished bool `json:"quotaFinished"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("❌ [TranslateText] Lỗi parse JSON: %v", err)
		return text, err
	}

	// Kiểm tra translated text
	if result.ResponseData.TranslatedText == "" {
		log.Printf("⚠️  [TranslateText] Translated text rỗng, giữ nguyên text gốc")
		return text, nil
	}

	// Kiểm tra quota
	if result.QuotaFinished {
		log.Printf("⚠️  [TranslateText] Quota đã hết, giữ nguyên text gốc")
		return text, nil
	}

	log.Printf("✅ [TranslateText] Dịch thành công (match: %.2f): %s → %s",
		result.ResponseData.Match, text, result.ResponseData.TranslatedText)
	return result.ResponseData.TranslatedText, nil
}

// translateWithDictionary dịch bằng dictionary mapping (nhanh, không cần API)
func translateWithDictionary(text string) string {
	// Dictionary cho các từ phổ biến trong game
	dict := map[string]string{
		// Game terms
		"英雄联盟": "Liên Minh Huyền Thoại",
		"王者荣耀": "Vương Giả Vinh Diệu",
		"和平精英": "Hòa Bình Tinh Anh",
		"原神":   "Nguyên Thần",
		"绝地求生": "Tuyệt Địa Cầu Sinh",

		// Common game terms
		"任务":  "Nhiệm vụ",
		"订单":  "Đơn hàng",
		"完成":  "Hoàn thành",
		"进行中": "Đang thực hiện",
		"已完成": "Đã hoàn thành",
		"取消":  "Hủy bỏ",
		"区域":  "Khu vực",
		"服务器": "Máy chủ",
		"游戏":  "Trò chơi",
		"账号":  "Tài khoản",
		"密码":  "Mật khẩu",
		"要求":  "Yêu cầu",
		"信息":  "Thông tin",
		"当前":  "Hiện tại",
		"时间":  "Thời gian",
		"限制":  "Giới hạn",

		// Server names (đã có trong TranslateServer nhưng thêm vào đây để đảm bảo)
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

	// Kiểm tra exact match trước
	if translated, ok := dict[text]; ok {
		return translated
	}

	// Nếu không có exact match, thử tìm các từ trong text
	for chinese, vietnamese := range dict {
		if strings.Contains(text, chinese) {
			// Thay thế từ tiếng Trung bằng tiếng Việt
			text = strings.ReplaceAll(text, chinese, vietnamese)
		}
	}

	// Nếu đã thay thế được, trả về
	if text != "" && !containsChinese(text) {
		return text
	}

	return "" // Không có trong dictionary
}

// containsChinese kiểm tra xem text có chứa ký tự Trung Quốc không
func containsChinese(text string) bool {
	for _, r := range text {
		// Unicode range cho tiếng Trung: 0x4E00-0x9FFF (CJK Unified Ideographs)
		if r >= 0x4E00 && r <= 0x9FFF {
			return true
		}
		// Cũng kiểm tra các ký tự Trung Quốc khác
		if r >= 0x3400 && r <= 0x4DBF { // CJK Extension A
			return true
		}
		if r >= 0x20000 && r <= 0x2A6DF { // CJK Extension B
			return true
		}
	}
	return false
}

// TranslateFields dịch các trường trong OrderDetailResponse
func TranslateFields(title, currInfo, require, game, zone, server string) (string, string, string, string, string, string) {
	log.Printf("🌐 [TranslateFields] Bắt đầu dịch các trường - Title: %s, CurrInfo: %s, Require: %s, Game: %s, Zone: %s, Server: %s",
		title, currInfo, require, game, zone, server)

	// Dịch song song để tăng tốc độ
	type result struct {
		field string
		value string
		err   error
	}

	fields := []struct {
		name string
		text string
	}{
		{"title", title},
		{"currInfo", currInfo},
		{"require", require},
		{"game", game},
		{"zone", zone},
		{"server", server},
	}

	results := make(chan result, len(fields))

	// Dịch tất cả fields song song
	for _, f := range fields {
		go func(fieldName, fieldText string) {
			log.Printf("🔄 [TranslateFields] Đang dịch field '%s': %s", fieldName, fieldText)
			translated, err := TranslateText(fieldText)
			if err != nil {
				log.Printf("❌ [TranslateFields] Lỗi khi dịch field '%s': %v", fieldName, err)
			} else {
				log.Printf("✅ [TranslateFields] Dịch thành công field '%s': %s → %s", fieldName, fieldText, translated)
			}
			results <- result{field: fieldName, value: translated, err: err}
		}(f.name, f.text)
	}

	// Thu thập kết quả
	translatedFields := make(map[string]string)
	for i := 0; i < len(fields); i++ {
		res := <-results
		if res.err == nil {
			translatedFields[res.field] = res.value
		} else {
			// Nếu lỗi, giữ nguyên text gốc
			log.Printf("⚠️  [TranslateFields] Giữ nguyên text gốc cho field '%s' do lỗi: %v", res.field, res.err)
			translatedFields[res.field] = fields[i].text
		}
	}

	log.Printf("✅ [TranslateFields] Hoàn thành dịch - Title: %s, CurrInfo: %s, Require: %s, Game: %s, Zone: %s, Server: %s",
		translatedFields["title"], translatedFields["currInfo"], translatedFields["require"],
		translatedFields["game"], translatedFields["zone"], translatedFields["server"])

	return translatedFields["title"],
		translatedFields["currInfo"],
		translatedFields["require"],
		translatedFields["game"],
		translatedFields["zone"],
		translatedFields["server"]
}
