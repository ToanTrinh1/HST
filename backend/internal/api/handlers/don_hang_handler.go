package handlers

// Xử lý các request liên quan đến đơn hàng (thông tin nhận kèo)
import (
	"encoding/json"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/service"
	"fullstack-backend/pkg/dailiantong"
	"fullstack-backend/pkg/translate"
	"fullstack-backend/pkg/utils"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type BetReceiptHandler struct {
	betReceiptService *service.BetReceiptService
	jwtSecret         string
}

func NewBetReceiptHandler(betReceiptService *service.BetReceiptService, jwtSecret string) *BetReceiptHandler {
	return &BetReceiptHandler{
		betReceiptService: betReceiptService,
		jwtSecret:         jwtSecret,
	}
}

// CreateBetReceipt xử lý tạo đơn hàng mới
func (h *BetReceiptHandler) CreateBetReceipt(c *gin.Context) {
	var req models.CreateBetReceiptRequest

	log.Println("=== BẮT ĐẦU XỬ LÝ TẠO ĐƠN HÀNG ===")
	log.Printf("📥 Request method: %s, Path: %s", c.Request.Method, c.Request.URL.Path)
	log.Printf("📥 Request headers: %v", c.Request.Header)

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		// log.Printf("❌ Request body (raw): %s", c.GetRawData())
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Thông tin đơn hàng - Tên người dùng: %s, Nhiệm vụ: %s, Loại kèo: %s", req.UserName, req.TaskCode, req.BetType)

	// Kiểm tra quyền admin (từ JWT token)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	log.Printf("🔍 Người tạo đơn hàng - User ID: %s, Role: %s", claims.UserID, claims.Role)

	// Xác định user tạo đơn:
	// - Nếu req.UserName rỗng → User tự tạo đơn cho chính mình (truyền userID)
	// - Nếu req.UserName có → Admin tạo đơn cho user khác (kiểm tra role admin, truyền nil)
	var userID *string
	if req.UserName == "" {
		// User tự tạo đơn cho chính mình
		userID = &claims.UserID
		log.Printf("🔍 User tự tạo đơn cho chính mình")
	} else {
		// Admin tạo đơn cho user khác - kiểm tra role (admin hoặc admin_tong)
		if claims.Role != "admin" && claims.Role != "admin_tong" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Chỉ admin mới có thể tạo đơn cho user khác",
			})
			return
		}
		userID = nil // Admin tạo, service sẽ tìm user theo user_name
		log.Printf("🔍 Admin tạo đơn cho user: %s", req.UserName)
	}

	// Khi admin tạo đơn: truyền ID admin để đơn có status Đơn hàng mới và id_admin_duyet = admin này
	var createdByAdminID *string
	if req.UserName != "" && (claims.Role == "admin" || claims.Role == "admin_tong") {
		createdByAdminID = &claims.UserID
	}
	// Gọi service để xử lý logic
	betReceipt, err := h.betReceiptService.CreateBetReceipt(&req, userID, createdByAdminID)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ TẠO ĐƠN HÀNG THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ TẠO ĐƠN HÀNG THÀNH CÔNG - ID: %s, STT: %d", betReceipt.ID, betReceipt.STT)
	log.Println("=== KẾT THÚC XỬ LÝ TẠO ĐƠN HÀNG ===\n")

	// Trả response thành công
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    betReceipt,
	})
}

// GetAllBetReceipts lấy danh sách đơn hàng
// - User: lấy đơn của user đó
// - Admin: tab=don_hang_moi | cho_chap_nhan | tong_hop; admin_tong thấy tất cả, admin thường chỉ thấy đơn của mình
func (h *BetReceiptHandler) GetAllBetReceipts(c *gin.Context) {
	log.Println("=== BẮT ĐẦU LẤY DANH SÁCH ĐƠN HÀNG ===")

	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")
	tab := c.Query("tab") // don_hang_moi | cho_chap_nhan | tong_hop (dùng cho admin)

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 100
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var userID *string
	var isAdmin bool
	var adminID string
	var isSuperAdmin bool
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString != authHeader {
			claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
			if err == nil {
				if claims.Role == "admin" || claims.Role == "admin_tong" {
					isAdmin = true
					adminID = claims.UserID
					isSuperAdmin = (claims.Role == "admin_tong")
					log.Printf("🔍 Admin role - tab: %s (user_id: %s, super: %v)", tab, claims.UserID, isSuperAdmin)
				} else {
					userID = &claims.UserID
					log.Printf("🔍 User role - Filtering by user_id: %s (role: %s)", claims.UserID, claims.Role)
				}
			} else {
				log.Printf("❌ Lỗi validate JWT token: %v", err)
			}
		} else {
			log.Printf("❌ Token không có prefix 'Bearer '")
		}
	} else {
		log.Printf("❌ Không có Authorization header")
	}

	var betReceipts []*models.BetReceipt
	if isAdmin {
		tabVal := tab
		if tabVal == "" {
			tabVal = "tong_hop"
		}
		betReceipts, err = h.betReceiptService.GetByTab(limit, offset, tabVal, adminID, isSuperAdmin)
		log.Printf("🔍 Admin - Lấy danh sách tab=%s (admin_id=%s, super=%v)", tabVal, adminID, isSuperAdmin)
	} else {
		betReceipts, err = h.betReceiptService.GetAllBetReceipts(limit, offset, userID)
	}
	if err != nil {
		log.Printf("❌ LỖI LẤY DANH SÁCH ĐƠN HÀNG: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy danh sách đơn hàng",
		})
		return
	}

	log.Printf("✅ LẤY DANH SÁCH ĐƠN HÀNG THÀNH CÔNG - Số lượng: %d", len(betReceipts))
	if len(betReceipts) > 0 {
		log.Printf("🔍 Mẫu dữ liệu đầu tiên - ID: %s, STT: %d, UserID: %s, UserName: %s",
			betReceipts[0].ID, betReceipts[0].STT, betReceipts[0].UserID, betReceipts[0].UserName)
	}
	log.Println("=== KẾT THÚC LẤY DANH SÁCH ĐƠN HÀNG ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipts,
	})
}

// GetBetReceiptByID lấy thông tin đơn hàng theo ID
func (h *BetReceiptHandler) GetBetReceiptByID(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU LẤY ĐƠN HÀNG THEO ID: %s ===", id)

	betReceipt, err := h.betReceiptService.GetBetReceiptByID(id)
	if err != nil {
		log.Printf("❌ LỖI LẤY ĐƠN HÀNG: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Không tìm thấy đơn hàng",
		})
		return
	}

	log.Printf("✅ LẤY ĐƠN HÀNG THÀNH CÔNG - ID: %s", betReceipt.ID)
	log.Println("=== KẾT THÚC LẤY ĐƠN HÀNG ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipt,
	})
}

// UpdateBetReceiptStatus cập nhật status của đơn hàng
// Khi status = "DONE", tự động tính "Công thực nhận" (ActualAmountCNY)
func (h *BetReceiptHandler) UpdateBetReceiptStatus(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU CẬP NHẬT STATUS ĐƠN HÀNG ID: %s ===", id)

	var req models.UpdateBetReceiptStatusRequest

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Cập nhật status - ID: %s, Status mới: %s", id, req.Status)

	// Kiểm tra quyền admin (từ JWT token)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	log.Printf("🔍 Người cập nhật status - User ID: %s, Role: %s", claims.UserID, claims.Role)

	// Nếu không phải admin, từ chối
	if claims.Role != "admin" && claims.Role != "admin_tong" {
		if req.Status != models.BetReceiptStatusInProgress {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Bạn không có quyền cập nhật trạng thái này",
			})
			return
		}

		betReceipt, err := h.betReceiptService.GetBetReceiptByID(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Không tìm thấy đơn hàng",
			})
			return
		}

		if betReceipt.UserID != claims.UserID {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Bạn không có quyền cập nhật đơn hàng này",
			})
			return
		}

	}

	// Gọi service để xử lý logic (truyền userID để ghi log)
	betReceipt, err := h.betReceiptService.UpdateBetReceiptStatus(id, &req, &claims.UserID)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ CẬP NHẬT STATUS THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ CẬP NHẬT STATUS THÀNH CÔNG - ID: %s, Status: %s, Công thực nhận: %.2f",
		betReceipt.ID, betReceipt.Status, betReceipt.ActualAmountCNY)
	log.Println("=== KẾT THÚC CẬP NHẬT STATUS ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipt,
	})
}

// UpdateBetReceipt cập nhật các trường thông thường của đơn hàng (không phải status)
func (h *BetReceiptHandler) UpdateBetReceipt(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU CẬP NHẬT ĐƠN HÀNG ID: %s ===", id)

	var req models.UpdateBetReceiptRequest

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	log.Printf("📝 Cập nhật đơn hàng - ID: %s", id)

	// Kiểm tra quyền admin (từ JWT token)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	log.Printf("🔍 Người cập nhật đơn hàng - User ID: %s", claims.UserID)

	// Gọi service để xử lý logic (truyền userID để ghi log)
	betReceipt, err := h.betReceiptService.UpdateBetReceipt(id, &req, &claims.UserID)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ CẬP NHẬT ĐƠN HÀNG THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ CẬP NHẬT ĐƠN HÀNG THÀNH CÔNG - ID: %s", betReceipt.ID)
	log.Println("=== KẾT THÚC CẬP NHẬT ĐƠN HÀNG ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipt,
	})
}

// DeleteBetReceipt xóa đơn hàng
func (h *BetReceiptHandler) DeleteBetReceipt(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU XÓA ĐƠN HÀNG ID: %s ===", id)

	// Kiểm tra quyền admin (từ JWT token)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	log.Printf("🔍 Người xóa đơn hàng - User ID: %s", claims.UserID)

	// Gọi service để xử lý logic (truyền userID để ghi log)
	err = h.betReceiptService.DeleteBetReceipt(id, &claims.UserID)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ XÓA ĐƠN HÀNG THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ XÓA ĐƠN HÀNG THÀNH CÔNG - ID: %s", id)
	log.Println("=== KẾT THÚC XÓA ĐƠN HÀNG ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã xóa đơn hàng thành công",
	})
}

// GetCurrentExchangeRate lấy tỷ giá hiện tại
func (h *BetReceiptHandler) GetCurrentExchangeRate(c *gin.Context) {
	log.Println("=== BẮT ĐẦU LẤY TỶ GIÁ HIỆN TẠI ===")

	// Kiểm tra quyền admin
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	log.Printf("🔍 Người yêu cầu - User ID: %s", claims.UserID)

	// Gọi service để lấy config (tỷ giá trả, tỷ giá nhận, admin_keep_pct %)
	exchangeRate, adminReceiveRate, adminKeepPct, err := h.betReceiptService.GetFullConfig()
	if err != nil {
		log.Printf("❌ LẤY CONFIG THẤT BẠI: %s", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy cấu hình: " + err.Error(),
		})
		return
	}

	// Config tính tiền user (phí rút tiền %, phí trung gian %, bảng phí web) để hiển thị trong modal cập nhật config
	_, feeRutTienWeb, feeRutTienNgoai, feeTrungGianPct, feeWebTiers, _ := h.betReceiptService.GetPublicUserFeeConfig()
	tiersForJSON := make([]gin.H, 0, len(feeWebTiers))
	for _, t := range feeWebTiers {
		tiersForJSON = append(tiersForJSON, gin.H{"max": t.Max, "fee": t.Fee})
	}

	log.Printf("✅ LẤY CONFIG THÀNH CÔNG: trả %.2f, nhận %.2f, admin giữ %.2f%%", exchangeRate, adminReceiveRate, adminKeepPct)
	log.Println("=== KẾT THÚC LẤY CONFIG ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success":                true,
		"exchange_rate":          exchangeRate,
		"admin_receive_rate":     adminReceiveRate,
		"admin_keep_pct":         adminKeepPct,
		"fee_rut_tien_pct_web":   feeRutTienWeb,
		"fee_rut_tien_pct_ngoai": feeRutTienNgoai,
		"fee_trung_gian_pct":     feeTrungGianPct,
		"fee_web_tiers":          tiersForJSON,
	})
}

// GetPublicExchangeRate trả về chỉ tỷ giá trả user (exchange_rate) cho UI công khai / user, không cần auth.
// Dùng cho trang user hiển thị tỷ giá đổi tệ; config chỉ áp dụng cho đơn tương lai.
func (h *BetReceiptHandler) GetPublicExchangeRate(c *gin.Context) {
	exchangeRate, err := h.betReceiptService.GetCurrentExchangeRate()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "exchange_rate": 3550})
		return
	}
	if exchangeRate <= 0 {
		exchangeRate = 3550
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "exchange_rate": exchangeRate})
}

// GetPublicUserFeeConfig trả về config tính tiền cho user (công khai): tỷ giá + phí rút tiền %, phí trung gian %, bảng phí web. Dùng cho màn "CÔNG THỨC TÍNH TIỀN".
func (h *BetReceiptHandler) GetPublicUserFeeConfig(c *gin.Context) {
	exchangeRate, feeRutTienWeb, feeRutTienNgoai, feeTrungGianPct, feeWebTiers, err := h.betReceiptService.GetPublicUserFeeConfig()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success":                true,
			"exchange_rate":          3550,
			"fee_rut_tien_pct_web":   2,
			"fee_rut_tien_pct_ngoai": 1,
			"fee_trung_gian_pct":     6,
			"fee_web_tiers":          []gin.H{},
		})
		return
	}
	tiersJSON := make([]gin.H, 0, len(feeWebTiers))
	for _, t := range feeWebTiers {
		tiersJSON = append(tiersJSON, gin.H{"max": t.Max, "fee": t.Fee})
	}
	c.JSON(http.StatusOK, gin.H{
		"success":                true,
		"exchange_rate":          exchangeRate,
		"fee_rut_tien_pct_web":   feeRutTienWeb,
		"fee_rut_tien_pct_ngoai": feeRutTienNgoai,
		"fee_trung_gian_pct":     feeTrungGianPct,
		"fee_web_tiers":          tiersJSON,
	})
}

// feeWebTierEntry một dòng bảng phí web (max = giá kèo tối đa, fee = phí tệ) dùng cho binding JSON.
type feeWebTierEntry struct {
	Max float64 `json:"max"`
	Fee float64 `json:"fee"`
}

// UpdateConfigRequest body để cập nhật config (tỷ giá trả, nhận, phí web, phí ngoài, % admin giữ, phí rút tiền, phí trung gian, bảng phí web)
type UpdateConfigRequest struct {
	ExchangeRate       float64           `json:"exchange_rate" binding:"required"`
	AdminReceiveRate   float64           `json:"admin_receive_rate" binding:"required"`
	AdminKeepPct       float64           `json:"admin_keep_pct" binding:"required"`
	FeeRutTienPctWeb   float64           `json:"fee_rut_tien_pct_web"`
	FeeRutTienPctNgoai float64           `json:"fee_rut_tien_pct_ngoai"`
	FeeTrungGianPct    float64           `json:"fee_trung_gian_pct"`
	FeeWebTiers        []feeWebTierEntry `json:"fee_web_tiers"`
}

// UpdateConfig cập nhật config: tỷ giá trả, tỷ giá nhận, phí web %, phí ngoài %.
func (h *BetReceiptHandler) UpdateConfig(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Yêu cầu xác thực"})
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Định dạng token không hợp lệ"})
		return
	}
	if _, err := utils.ValidateJWT(tokenString, h.jwtSecret); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Token không hợp lệ hoặc đã hết hạn"})
		return
	}

	var req UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}
	if req.ExchangeRate <= 0 || req.AdminReceiveRate <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Tỷ giá trả và tỷ giá nhận phải dương"})
		return
	}
	if req.AdminKeepPct < 0 || req.AdminKeepPct > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Phần trăm admin giữ phải từ 0 đến 100"})
		return
	}
	if req.FeeRutTienPctWeb < 0 || req.FeeRutTienPctWeb > 100 || req.FeeRutTienPctNgoai < 0 || req.FeeRutTienPctNgoai > 100 || req.FeeTrungGianPct < 0 || req.FeeTrungGianPct > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Phí rút tiền và phí trung gian phải từ 0 đến 100%"})
		return
	}

	var feeWebTiersJSON []byte
	if req.FeeWebTiers != nil {
		if b, err := json.Marshal(req.FeeWebTiers); err == nil {
			feeWebTiersJSON = b
		}
	}

	if err := h.betReceiptService.UpdateConfig(req.ExchangeRate, req.AdminReceiveRate, req.AdminKeepPct,
		req.FeeRutTienPctWeb, req.FeeRutTienPctNgoai, req.FeeTrungGianPct, feeWebTiersJSON); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Cập nhật config thất bại: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã cập nhật cấu hình thành công.",
	})
}

// RecalculateActualAmountCNY tính lại "Công thực nhận" (ActualAmountCNY) cho một đơn hàng đã xử lý
func (h *BetReceiptHandler) RecalculateActualAmountCNY(c *gin.Context) {
	id := c.Param("id")
	log.Printf("=== BẮT ĐẦU TÍNH LẠI TỆ CHO ĐƠN HÀNG ID: %s ===", id)

	// Kiểm tra quyền admin (từ JWT token)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	log.Printf("🔍 Người tính lại tệ - User ID: %s", claims.UserID)

	// Gọi service để tính lại tệ
	betReceipt, err := h.betReceiptService.RecalculateActualAmountCNY(id)
	if err != nil {
		errorMsg := err.Error()
		log.Printf("❌ TÍNH LẠI TỆ THẤT BẠI: %s", errorMsg)

		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	log.Printf("✅ TÍNH LẠI TỆ THÀNH CÔNG - ID: %s, Công thực nhận: %.2f",
		betReceipt.ID, betReceipt.ActualAmountCNY)
	log.Println("=== KẾT THÚC TÍNH LẠI TỆ ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    betReceipt,
		"message": "Đã tính lại tệ thành công",
	})
}

// GetTop5UsersByMonthlyReceivedAmount lấy top 5 users theo số tiền đã nhận trong tháng
func (h *BetReceiptHandler) GetTop5UsersByMonthlyReceivedAmount(c *gin.Context) {
	// Lấy tháng từ query parameter, mặc định là tháng hiện tại
	month := c.DefaultQuery("month", "")
	if month == "" {
		// Nếu không có tháng, dùng tháng hiện tại
		now := time.Now()
		month = now.Format("2006-01")
	}

	log.Printf("=== BẮT ĐẦU LẤY TOP 5 USERS CHO THÁNG: %s ===", month)

	// Gọi service
	topUsers, err := h.betReceiptService.GetTop5UsersByMonthlyReceivedAmount(month)
	if err != nil {
		log.Printf("❌ LỖI LẤY TOP 5 USERS: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy top 5 users: " + err.Error(),
		})
		return
	}

	log.Printf("✅ LẤY TOP 5 USERS THÀNH CÔNG - Số lượng: %d", len(topUsers))
	log.Println("=== KẾT THÚC LẤY TOP 5 USERS ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    topUsers,
		"month":   month,
	})
}

// GetMonthlyTotalByUserID tính tổng số tiền đã nhận theo tháng cho user hiện tại
func (h *BetReceiptHandler) GetMonthlyTotalByUserID(c *gin.Context) {
	// Lấy tháng từ query parameter, có thể rỗng (tính tất cả)
	month := c.Query("month")

	// Kiểm tra JWT token để lấy user ID
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	userID := claims.UserID
	log.Printf("=== BẮT ĐẦU TÍNH TỔNG THEO THÁNG CHO USER: %s, THÁNG: %s ===", userID, month)

	// Gọi service
	total, err := h.betReceiptService.GetMonthlyTotalByUserID(userID, month)
	if err != nil {
		log.Printf("❌ LỖI TÍNH TỔNG THEO THÁNG: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi tính tổng theo tháng: " + err.Error(),
		})
		return
	}

	log.Printf("✅ TÍNH TỔNG THEO THÁNG THÀNH CÔNG - User: %s, Tháng: %s, Tổng: %.2f ¥", userID, month, total)
	log.Println("=== KẾT THÚC TÍNH TỔNG THEO THÁNG ===\n")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id": userID,
			"month":   month,
			"total":   total,
		},
	})
}

// GetAdminProfitByMonth lấy lợi nhuận admin theo tháng (tổng tất cả admin)
// Chỉ admin mới gọi được. Lợi nhuận mỗi đơn DONE = tiền kèo - tiền thực nhận user
func (h *BetReceiptHandler) GetAdminProfitByMonth(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Yêu cầu xác thực"})
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Định dạng token không hợp lệ"})
		return
	}
	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Token không hợp lệ hoặc đã hết hạn"})
		return
	}
	if claims.Role != "admin" && claims.Role != "admin_tong" {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Chỉ admin mới xem được lợi nhuận"})
		return
	}
	data, err := h.betReceiptService.GetAdminProfitByMonth()
	if err != nil {
		log.Printf("❌ LỖI LẤY LỢI NHUẬN ADMIN: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy lợi nhuận admin: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

// GetAdminProfitStatsByMonth lấy thống kê & lợi nhuận theo từng admin (2 bảng: thống kê + tính toán)
// Query: month (optional, "YYYY-MM" hoặc rỗng = tất cả)
func (h *BetReceiptHandler) GetAdminProfitStatsByAdmin(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Yêu cầu xác thực"})
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Định dạng token không hợp lệ"})
		return
	}
	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Token không hợp lệ hoặc đã hết hạn"})
		return
	}
	if claims.Role != "admin" && claims.Role != "admin_tong" {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "Chỉ admin mới xem được thống kê lợi nhuận"})
		return
	}
	month := c.DefaultQuery("month", "")
	data, adminProfitSplit, err := h.betReceiptService.GetAdminProfitStatsByAdmin(month)
	if err != nil {
		log.Printf("❌ LỖI LẤY THỐNG KÊ LỢI NHUẬN THEO ADMIN: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Lỗi khi lấy thống kê: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"data":               data,
		"admin_profit_split": adminProfitSplit,
		"month":              month,
	})
}

// ParseOrderLink parse link dailiantong.com và trả về thông tin đơn hàng
func (h *BetReceiptHandler) ParseOrderLink(c *gin.Context) {
	var req models.ParseOrderLinkRequest

	log.Println("=== BẮT ĐẦU PARSE LINK ĐƠN HÀNG ===")

	// Parse request body
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ VALIDATION LỖI: Dữ liệu không hợp lệ - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ: " + err.Error(),
		})
		return
	}

	// Set default publish nếu không có
	if req.Publish == 0 {
		req.Publish = 2
	}

	log.Printf("📝 SerialNo: %s, Publish: %d", req.SerialNo, req.Publish)

	// Kiểm tra authentication (user hoặc admin đều có thể lấy chi tiết đơn hàng)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Yêu cầu xác thực",
		})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Định dạng token không hợp lệ",
		})
		return
	}

	claims, err := utils.ValidateJWT(tokenString, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Token không hợp lệ hoặc đã hết hạn",
		})
		return
	}

	log.Printf("🔍 User lấy chi tiết đơn hàng - User ID: %s, Role: %s", claims.UserID, claims.Role)

	// Gọi API để lấy chi tiết đơn hàng
	orderDetail, err := dailiantong.GetOrderDetail(req.SerialNo, req.Publish)
	if err != nil {
		log.Printf("❌ LẤY CHI TIẾT ĐƠN HÀNG THẤT BẠI: %s", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Không thể lấy chi tiết đơn hàng: " + err.Error(),
		})
		return
	}

	// Parse và map dữ liệu
	var completedHours *int
	if orderDetail.TimeLimit > 0 {
		completedHours = &orderDetail.TimeLimit
	}

	// Dịch các trường tiếng Trung sang tiếng Việt
	translatedTitle, _, _, _, _, translatedServer := translate.TranslateFields(
		orderDetail.Title,
		orderDetail.CurrInfo,
		orderDetail.Require,
		orderDetail.Game,
		orderDetail.Zone,
		orderDetail.Server,
	)

	// Dùng server đã dịch (hoặc dùng TranslateServer nếu có mapping)
	region := dailiantong.TranslateServer(translatedServer)
	if region == translatedServer {
		// Nếu TranslateServer không có mapping, dùng bản dịch từ Google
		region = translatedServer
	}

	// Notes để trống (user có thể điền sau)
	notes := ""

	parsedData := &dailiantong.ParsedOrderData{
		TaskCode:        translatedTitle, // Dùng bản dịch
		WebBetAmountCNY: orderDetail.Price,
		OrderCode:       orderDetail.SerialNo,
		CompletedHours:  completedHours,
		Region:          region,
		Notes:           notes,
	}

	log.Printf("✅ PARSE LINK THÀNH CÔNG - Task: %s, Price: %.2f, OrderCode: %s", parsedData.TaskCode, parsedData.WebBetAmountCNY, parsedData.OrderCode)
	log.Println("=== KẾT THÚC PARSE LINK ===\n")

	// Trả response thành công
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    parsedData,
	})
}
