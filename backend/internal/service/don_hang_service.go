package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"fullstack-backend/internal/websocket"
	"fullstack-backend/pkg/dailiantong"
	"log"
	"strings"
	"time"
)

type BetReceiptService struct {
	betReceiptRepo      *repository.BetReceiptRepository
	userRepo            *repository.UserRepository
	walletRepo          *repository.WalletRepository
	historyRepo         *repository.BetReceiptHistoryRepository
	notificationService *NotificationService
	hub                 *websocket.Hub
}

func NewBetReceiptService(
	betReceiptRepo *repository.BetReceiptRepository,
	userRepo *repository.UserRepository,
	walletRepo *repository.WalletRepository,
	historyRepo *repository.BetReceiptHistoryRepository,
	notificationService *NotificationService,
	hub *websocket.Hub,
) *BetReceiptService {
	return &BetReceiptService{
		betReceiptRepo:      betReceiptRepo,
		userRepo:            userRepo,
		walletRepo:          walletRepo,
		historyRepo:         historyRepo,
		notificationService: notificationService,
		hub:                 hub,
	}
}

// CreateBetReceipt tạo đơn hàng (thông tin nhận kèo) mới
// userID: ID của user tạo đơn (từ JWT token). Nếu nil, sẽ tìm user theo req.UserName (admin tạo)
// createdByAdminID: khi admin tạo đơn thì truyền ID admin → đơn có status CHỜ LOGIN và id_admin_duyet = admin này
func (s *BetReceiptService) CreateBetReceipt(req *models.CreateBetReceiptRequest, userID *string, createdByAdminID *string) (*models.BetReceipt, error) {
	var foundUser *models.User
	var err error
	var isUserSelfCreate bool

	// Xác định user: Nếu userID != nil → user tự tạo, nếu không → admin tạo (tìm theo user_name)
	if userID != nil {
		// User tự tạo đơn cho chính mình
		isUserSelfCreate = true
		foundUser, err = s.userRepo.FindByID(*userID)
		if err != nil {
			log.Printf("Service - ❌ Lỗi khi tìm người dùng theo ID: %v", err)
			return nil, errors.New("Lỗi khi tìm kiếm người dùng")
		}
		log.Printf("Service - ✅ User tự tạo đơn - User ID: %s, Name: %s", foundUser.ID, foundUser.Name)
	} else {
		// Admin tạo đơn cho user khác (tìm theo user_name)
		if req.UserName == "" {
			return nil, errors.New("Tên người dùng không được để trống khi admin tạo đơn")
		}

		log.Printf("Service - Admin tạo đơn hàng cho user_name: %s", req.UserName)
		users, err := s.userRepo.FindByName(req.UserName)
		if err != nil {
			log.Printf("Service - ❌ Lỗi khi tìm người dùng: %v", err)
			return nil, errors.New("Lỗi khi tìm kiếm người dùng")
		}

		// Lọc để tìm user có tên chính xác (phải khớp hoàn toàn, phân biệt hoa thường)
		for _, u := range users {
			if u.Name == req.UserName {
				foundUser = u
				break
			}
		}

		if foundUser == nil {
			log.Printf("Service - ❌ Không tìm thấy người dùng với tên: %s", req.UserName)
			return nil, errors.New("Tên người dùng '" + req.UserName + "' không có trong hệ thống")
		}

		log.Printf("Service - ✅ Admin tạo đơn - Tìm thấy người dùng: %s (%s), ID: %s", foundUser.Name, foundUser.Email, foundUser.ID)
	}

	// Kiểm tra loại kèo hợp lệ
	if req.BetType != models.BetTypeWeb && req.BetType != models.BetTypeExternal {
		return nil, errors.New("Loại kèo không hợp lệ. Phải là 'web' hoặc 'Kèo ngoài'")
	}

	// Xác định status và admin gán:
	// - Nếu user tự tạo → "Chờ chấp nhận" (chờ admin chấp nhận)
	// - Nếu admin tạo → "Đơn hàng mới" và gán id_admin_duyet = admin (đơn gắn với admin đó)
	var status string
	var assignedAdminID *string
	if isUserSelfCreate {
		status = models.BetReceiptStatusChoChapNhan // "Chờ chấp nhận"
		assignedAdminID = nil
		log.Printf("Service - User tự tạo → Status: Chờ chấp nhận")
	} else {
		status = models.BetReceiptStatusNew // "Đơn hàng mới"
		assignedAdminID = createdByAdminID
		log.Printf("Service - Admin tạo → Status: Đơn hàng mới, id_admin_duyet: %v", createdByAdminID)
	}

	// Tính thời gian còn lại: Thời gian hoàn thành (completed_hours) = Thời gian còn lại ban đầu
	var timeRemainingHours *int
	if req.CompletedHours != nil {
		timeRemainingHours = req.CompletedHours
	}

	// Tạo đơn hàng (thông tin nhận kèo)
	betReceipt := &models.BetReceipt{
		UserID:             foundUser.ID,
		TaskCode:           req.TaskCode,
		BetType:            req.BetType,
		WebBetAmountCNY:    req.WebBetAmountCNY,
		OrderCode:          req.OrderCode,
		Notes:              req.Notes,
		Account:            req.Account,  // User tạo thì để rỗng, admin sẽ điền sau
		Password:           req.Password, // User tạo thì để rỗng, admin sẽ điền sau
		Region:             req.Region,
		Status:             status,
		AssignedAdminID:    assignedAdminID, // Admin tạo thì gán admin này
		CompletedHours:     req.CompletedHours,
		TimeRemainingHours: timeRemainingHours,
		ActualReceivedCNY:  0,
		CompensationCNY:    0,
		ActualAmountCNY:    0,
	}

	if req.OrderSerialNo != nil && *req.OrderSerialNo != "" {
		betReceipt.OrderSerialNo = *req.OrderSerialNo
	}
	if req.OrderPublish != nil {
		betReceipt.OrderPublish = req.OrderPublish
	}

	if err := s.betReceiptRepo.Create(betReceipt); err != nil {
		log.Printf("Service - ❌ Lỗi tạo đơn hàng: %v", err)
		return nil, errors.New("Lỗi khi tạo đơn hàng: " + err.Error())
	}

	// Set UserName để trả về trong response
	betReceipt.UserName = foundUser.Name
	if betReceipt.OrderLink == "" {
		publish := 0
		if betReceipt.OrderPublish != nil {
			publish = *betReceipt.OrderPublish
		}
		betReceipt.OrderLink = dailiantong.BuildOrderLink(betReceipt.OrderSerialNo, publish)
	}

	log.Printf("Service - ✅ Đơn hàng đã được tạo với ID: %s, STT: %d, UserName: %s, Status: %s", betReceipt.ID, betReceipt.STT, betReceipt.UserName, betReceipt.Status)

	if s.hub != nil {
		s.hub.BroadcastBetReceiptUpdated(nil)
	}

	// Thông báo chỉ gửi cho admin khi đơn hàng cập nhật trạng thái (không gửi khi user tạo đơn)
	return betReceipt, nil
}

// GetAllBetReceipts lấy tất cả đơn hàng (thông tin nhận kèo) theo user (dùng cho user thường)
func (s *BetReceiptService) GetAllBetReceipts(limit, offset int, userID *string) ([]*models.BetReceipt, error) {
	return s.betReceiptRepo.GetAll(limit, offset, userID, false, nil)
}

// GetByTab lấy đơn hàng theo tab cho admin: don_hang_moi | cho_chap_nhan | tong_hop
// - isSuperAdmin (admin tổng): thấy tất cả đơn; admin thường chỉ thấy đơn của mình (id_admin_duyet = adminID hoặc NULL cho tab chờ chấp nhận)
func (s *BetReceiptService) GetByTab(limit, offset int, tab, adminID string, isSuperAdmin bool) ([]*models.BetReceipt, error) {
	return s.betReceiptRepo.GetByTab(limit, offset, tab, adminID, isSuperAdmin)
}

// GetBetReceiptByID lấy đơn hàng (thông tin nhận kèo) theo ID
func (s *BetReceiptService) GetBetReceiptByID(id string) (*models.BetReceipt, error) {
	return s.betReceiptRepo.FindByID(id)
}

// UpdateBetReceipt cập nhật các trường thông thường của đơn hàng (không phải status)
func (s *BetReceiptService) UpdateBetReceipt(id string, req *models.UpdateBetReceiptRequest, performedBy *string) (*models.BetReceipt, error) {
	log.Printf("Service - Cập nhật đơn hàng ID: %s", id)

	// Kiểm tra đơn hàng có tồn tại không và lấy dữ liệu cũ
	oldBetReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return nil, errors.New("Không tìm thấy đơn hàng")
	}

	// Validation
	if req.BetType != nil && *req.BetType != models.BetTypeWeb && *req.BetType != models.BetTypeExternal {
		return nil, errors.New("Loại kèo không hợp lệ. Phải là 'web' hoặc 'Kèo ngoài'")
	}

	// Cập nhật trong database
	if err := s.betReceiptRepo.Update(id, req); err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật đơn hàng: %v", err)
		return nil, errors.New("Lỗi khi cập nhật đơn hàng: " + err.Error())
	}

	// Lấy lại thông tin đơn hàng đã cập nhật
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Lỗi lấy thông tin đơn hàng sau khi cập nhật: %v", err)
		return nil, errors.New("Lỗi khi lấy thông tin đơn hàng")
	}

	// Nếu admin cập nhật TK/MK (thông tin login) khi status đang Chờ chấp nhận
	// -> chuyển status sang ĐANG THỰC HIỆN và bắt đầu tính giờ (thoi_gian_bat_dau)
	movedToInProgress := false
	hasCredentialsUpdate := req.Account != nil || req.Password != nil
	if oldBetReceipt.Status == models.BetReceiptStatusChoChapNhan &&
		betReceipt.Status == models.BetReceiptStatusChoChapNhan &&
		hasCredentialsUpdate &&
		(betReceipt.Account != "" || betReceipt.Password != "") {
		betReceipt.Status = models.BetReceiptStatusInProgress
		if betReceipt.StartedAt == nil {
			now := time.Now()
			betReceipt.StartedAt = &now
		}
		// Gán admin duyệt đơn (admin đang cập nhật TK/MK)
		if performedBy != nil {
			betReceipt.AssignedAdminID = performedBy
		}
		if err := s.betReceiptRepo.UpdateStatus(betReceipt); err != nil {
			log.Printf("Service - ❌ Lỗi cập nhật status sang ĐANG THỰC HIỆN: %v", err)
			return nil, errors.New("Lỗi khi cập nhật status sang ĐANG THỰC HIỆN")
		}
		movedToInProgress = true
	}

	_ = movedToInProgress // hiện tại không tạo notification; admin sẽ nhắn chat cho user

	// Lấy tên người dùng
	if req.UserName != nil {
		users, err := s.userRepo.FindByName(*req.UserName)
		if err == nil {
			for _, u := range users {
				if u.Name == *req.UserName {
					betReceipt.UserName = u.Name
					break
				}
			}
		}
	} else {
		// Nếu không cập nhật user_name, lấy từ database
		user, err := s.userRepo.FindByID(betReceipt.UserID)
		if err == nil && user != nil {
			betReceipt.UserName = user.Name
		}
	}

	// Ghi log lịch sử (UPDATE)
	if s.historyRepo != nil {
		go func() {
			oldData, _ := betReceiptToMap(oldBetReceipt)
			newData, _ := betReceiptToMap(betReceipt)
			changedFields := repository.FindChangedFields(oldData, newData)

			historyReq := &models.CreateHistoryRequest{
				BetReceiptID:  id,
				Action:        models.HistoryActionUpdate,
				PerformedBy:   performedBy,
				OldData:       oldData,
				NewData:       newData,
				ChangedFields: changedFields,
				Description:   "Cập nhật thông tin đơn hàng",
			}

			if err := s.createHistory(historyReq); err != nil {
				log.Printf("Service - ⚠️ Không thể ghi lịch sử: %v", err)
			}
		}()
	}

	log.Printf("Service - ✅ Đã cập nhật đơn hàng thành công cho ID: %s", id)
	if s.hub != nil {
		s.hub.BroadcastBetReceiptUpdated(nil)
	}
	return betReceipt, nil
}

// DeleteBetReceipt xóa đơn hàng
func (s *BetReceiptService) DeleteBetReceipt(id string, performedBy *string) error {
	log.Printf("Service - Xóa đơn hàng ID: %s", id)

	// Kiểm tra đơn hàng có tồn tại không
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return errors.New("Không tìm thấy đơn hàng")
	}

	// Nếu đơn hàng có status = DONE, HỦY BỎ, hoặc ĐỀN, cần tính lại wallet
	const exchangeRate = 3550.0
	oldStatus := betReceipt.Status
	userID := betReceipt.UserID

	// Lưu dữ liệu cũ để ghi log
	oldData, _ := betReceiptToMap(betReceipt)

	// Xóa đơn hàng
	if err := s.betReceiptRepo.Delete(id); err != nil {
		log.Printf("Service - ❌ Lỗi xóa đơn hàng: %v", err)
		return errors.New("Lỗi khi xóa đơn hàng: " + err.Error())
	}

	// Ghi log lịch sử (DELETE)
	if s.historyRepo != nil {
		go func() {
			historyReq := &models.CreateHistoryRequest{
				BetReceiptID: id,
				Action:       models.HistoryActionDelete,
				PerformedBy:  performedBy,
				OldData:      oldData,
				Description:  "Xóa đơn hàng",
			}

			if err := s.createHistory(historyReq); err != nil {
				log.Printf("Service - ⚠️ Không thể ghi lịch sử: %v", err)
			}
		}()
	}

	// Nếu đơn hàng đã có ảnh hưởng đến wallet (status = DONE, HỦY BỎ, hoặc ĐỀN), tính lại wallet
	if oldStatus == models.BetReceiptStatusDone || oldStatus == models.BetReceiptStatusCancelled || oldStatus == models.BetReceiptStatusCompensation {
		if err := s.walletRepo.RecalculateTotalReceived(userID, exchangeRate); err != nil {
			log.Printf("Service - ❌ Lỗi tính lại wallet sau khi xóa: %v", err)
			// Không return error vì đơn hàng đã bị xóa, chỉ log warning
			log.Printf("Service - ⚠️ Đơn hàng đã bị xóa nhưng không thể tính lại wallet, cần tính thủ công")
		} else {
			log.Printf("Service - ✅ Đã tính lại wallet cho user ID: %s sau khi xóa đơn hàng", userID)
		}
	}

	log.Printf("Service - ✅ Đã xóa đơn hàng thành công cho ID: %s", id)
	if s.hub != nil {
		s.hub.BroadcastBetReceiptUpdated(nil)
	}
	return nil
}

// lookupPhiWeb tra cứu phí web dựa trên giá kèo (tệ)
// Bảng tham chiếu:
// < 20: 2
// 20-50: 4
// 51-100: 5
// 101-150: 6
// 151-200: 7
// PhiWebTier một dòng bảng phí web theo giá kèo (max = giá kèo tối đa áp dụng, fee = phí tệ)
type PhiWebTier struct {
	Max float64 `json:"max"`
	Fee float64 `json:"fee"`
}

// lookupPhiWebFromTiers tra cứu phí web (tệ) từ bảng tiers: chọn fee của tier đầu tiên có giaKeo <= max.
func lookupPhiWebFromTiers(tiers []PhiWebTier, giaKeo float64) float64 {
	for _, t := range tiers {
		if giaKeo <= t.Max {
			return t.Fee
		}
	}
	return 0
}

// defaultPhiWebTiers bảng phí web mặc định khi chưa có config (giống logic cũ).
func defaultPhiWebTiers() []PhiWebTier {
	return []PhiWebTier{
		{20, 2}, {50, 4}, {100, 5}, {150, 6}, {200, 7}, {250, 8}, {300, 9}, {350, 10},
		{799, 11}, {99999, 20},
	}
}

// calculateActualAmountCNYWithConfig tính "Công thực nhận" theo config: phí rút tiền %, phí trung gian %, phí web (lookup).
func calculateActualAmountCNYWithConfig(betType string, giaKeo float64, feeRutTienWeb, feeRutTienNgoai, feeTrungGianPct float64, phiWebLookup func(float64) float64) float64 {
	var phiWeb, phiRutTien, phiTrungGian float64
	if betType == models.BetTypeWeb {
		phiWeb = phiWebLookup(giaKeo)
		phiRutTien = giaKeo * (feeRutTienWeb / 100)
		phiTrungGian = giaKeo * (feeTrungGianPct / 100)
	} else if betType == models.BetTypeExternal {
		phiWeb = 0
		phiRutTien = giaKeo * (feeRutTienNgoai / 100)
		phiTrungGian = giaKeo * (feeTrungGianPct / 100)
	} else {
		log.Printf("Service - ⚠️ Loại kèo không hợp lệ: %s", betType)
		return 0
	}
	tongThucNhan := giaKeo - phiWeb - phiRutTien - phiTrungGian
	log.Printf("Service - 📊 Tính Công thực nhận - Loại kèo: %s, Giá kèo: %.2f, Phí web: %.2f, Phí rút tiền: %.2f, Phí trung gian: %.2f, Tổng thực nhận: %.2f",
		betType, giaKeo, phiWeb, phiRutTien, phiTrungGian, tongThucNhan)
	return tongThucNhan
}

// CalculateActualAmountCNY tính "Công thực nhận" (ActualAmountCNY) từ config DB: phí rút tiền %, phí trung gian %, bảng phí web.
func (s *BetReceiptService) CalculateActualAmountCNY(betType string, giaKeo float64) (float64, error) {
	tiers, feeRutTienWeb, feeRutTienNgoai, feeTrungGianPct, err := s.getUserFeeConfig()
	if err != nil {
		log.Printf("Service - ⚠️ Lấy config user fee thất bại, dùng mặc định: %v", err)
		tiers = defaultPhiWebTiers()
		feeRutTienWeb, feeRutTienNgoai, feeTrungGianPct = 2, 1, 6
	}
	lookup := func(g float64) float64 { return lookupPhiWebFromTiers(tiers, g) }
	return calculateActualAmountCNYWithConfig(betType, giaKeo, feeRutTienWeb, feeRutTienNgoai, feeTrungGianPct, lookup), nil
}

// getUserFeeConfig lấy config tính tiền user từ DB (phí rút tiền %, phí trung gian %, bảng phí web).
func (s *BetReceiptService) getUserFeeConfig() (tiers []PhiWebTier, feeRutTienWeb, feeRutTienNgoai, feeTrungGianPct float64, err error) {
	fw, fn, ft, jsonBytes, err := s.betReceiptRepo.GetUserFeeConfig()
	if err != nil {
		return nil, 0, 0, 0, err
	}
	if len(jsonBytes) > 0 {
		if err := json.Unmarshal(jsonBytes, &tiers); err != nil {
			log.Printf("Service - ⚠️ Parse fee_web_tiers JSON thất bại: %v", err)
			tiers = defaultPhiWebTiers()
		}
	} else {
		tiers = defaultPhiWebTiers()
	}
	return tiers, fw, fn, ft, nil
}

// GetPublicUserFeeConfig trả về config tính tiền cho UI user (công khai, không auth): tỷ giá + phí rút tiền %, phí trung gian %, bảng phí web.
func (s *BetReceiptService) GetPublicUserFeeConfig() (exchangeRate, feeRutTienPctWeb, feeRutTienPctNgoai, feeTrungGianPct float64, feeWebTiers []PhiWebTier, err error) {
	exchangeRate, err = s.GetCurrentExchangeRate()
	if err != nil || exchangeRate <= 0 {
		exchangeRate = 3550
	}
	tiers, fw, fn, ft, err := s.getUserFeeConfig()
	if err != nil {
		tiers = defaultPhiWebTiers()
		fw, fn, ft = 2, 1, 6
	}
	return exchangeRate, fw, fn, ft, tiers, nil
}

// GetCurrentExchangeRate lấy tỷ giá trả user (exchange_rate) từ bảng current_exchange_rate
func (s *BetReceiptService) GetCurrentExchangeRate() (float64, error) {
	rate, _, err := s.getExchangeRates()
	if err != nil {
		return 3550.0, nil
	}
	return rate, nil
}

// GetCurrentExchangeRates trả về tỷ giá trả user và tỷ giá admin nhận (bên trung trả). Dùng cho API và UI config.
func (s *BetReceiptService) GetCurrentExchangeRates() (exchangeRate, adminReceiveRate float64, err error) {
	return s.getExchangeRates()
}

// getExchangeRates lấy cả tỷ giá trả user và tỷ giá admin nhận (bên trung trả). Trả về (exchange_rate, admin_receive_rate, error).
func (s *BetReceiptService) getExchangeRates() (exchangeRate, adminReceiveRate float64, err error) {
	ex, ar, _, err := s.getFullConfig()
	if err != nil {
		return 3550.0, 3850.0, err
	}
	return ex, ar, nil
}

// getFullConfig lấy config: exchange_rate, admin_receive_rate, admin_keep_pct. Phí kèo web/ngoài tính từ phí rút + phí trung gian.
func (s *BetReceiptService) getFullConfig() (exchangeRate, adminReceiveRate, adminKeepPct float64, err error) {
	queryFull := `
		SELECT COALESCE(exchange_rate, 3550), COALESCE(admin_receive_rate, 3850), COALESCE(admin_keep_pct, 60)
		FROM current_exchange_rate
		WHERE id = 1
	`
	err = s.betReceiptRepo.GetDB().QueryRow(queryFull).Scan(&exchangeRate, &adminReceiveRate, &adminKeepPct)
	if err == nil {
		if exchangeRate <= 0 {
			exchangeRate = 3550.0
		}
		if adminReceiveRate <= 0 {
			adminReceiveRate = 3850.0
		}
		if adminKeepPct <= 0 || adminKeepPct > 100 {
			adminKeepPct = 60.0
		}
		return exchangeRate, adminReceiveRate, adminKeepPct, nil
	}
	queryFallback := `
		SELECT COALESCE(exchange_rate, 3550), COALESCE(admin_receive_rate, 3850)
		FROM current_exchange_rate
		WHERE id = 1
	`
	err2 := s.betReceiptRepo.GetDB().QueryRow(queryFallback).Scan(&exchangeRate, &adminReceiveRate)
	if err2 != nil {
		log.Printf("Service - ❌ Lỗi lấy config (dùng mặc định): %v", err2)
		return 3550.0, 3850.0, 60.0, nil
	}
	if exchangeRate <= 0 {
		exchangeRate = 3550.0
	}
	if adminReceiveRate <= 0 {
		adminReceiveRate = 3850.0
	}
	return exchangeRate, adminReceiveRate, 60.0, nil
}

// GetFullConfig trả về config cho API (exchange_rate, admin_receive_rate, admin_keep_pct).
func (s *BetReceiptService) GetFullConfig() (exchangeRate, adminReceiveRate, adminKeepPct float64, err error) {
	return s.getFullConfig()
}

// UpdateConfig cập nhật config: tỷ giá, admin_keep_pct, và config tính tiền user (phí rút tiền %, phí trung gian %, bảng phí web).
func (s *BetReceiptService) UpdateConfig(exchangeRate, adminReceiveRate, adminKeepPct, feeRutTienPctWeb, feeRutTienPctNgoai, feeTrungGianPct float64, feeWebTiersJSON []byte) error {
	query := `
		UPDATE current_exchange_rate
		SET exchange_rate = $1, admin_receive_rate = $2, admin_keep_pct = $3,
		    fee_rut_tien_pct_web = $4, fee_rut_tien_pct_ngoai = $5, fee_trung_gian_pct = $6, fee_web_tiers = COALESCE($7::jsonb, fee_web_tiers), updated_at = NOW()
		WHERE id = 1
	`
	if feeWebTiersJSON == nil {
		feeWebTiersJSON = []byte("[]")
	}
	_, err := s.betReceiptRepo.GetDB().Exec(query, exchangeRate, adminReceiveRate, adminKeepPct,
		feeRutTienPctWeb, feeRutTienPctNgoai, feeTrungGianPct, feeWebTiersJSON)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật config: %v", err)
		return err
	}
	log.Printf("Service - ✅ Đã cập nhật config: trả=%.2f, nhận=%.2f, admin giữ=%.2f%%, phí rút web=%.2f%%, ngoài=%.2f%%, trung gian=%.2f%%",
		exchangeRate, adminReceiveRate, adminKeepPct, feeRutTienPctWeb, feeRutTienPctNgoai, feeTrungGianPct)
	return nil
}

// UpdateBetReceiptStatus cập nhật status của đơn hàng
// Khi status = "DONE", tự động tính "Công thực nhận" (ActualAmountCNY)
func (s *BetReceiptService) UpdateBetReceiptStatus(id string, req *models.UpdateBetReceiptStatusRequest, performedBy *string) (*models.BetReceipt, error) {
	log.Printf("Service - Cập nhật status cho đơn hàng ID: %s, Status mới: %s", id, req.Status)

	// 1. Lấy thông tin đơn hàng hiện tại
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return nil, errors.New("Không tìm thấy đơn hàng")
	}

	// Lưu dữ liệu cũ để ghi log
	oldBetReceiptData, _ := betReceiptToMap(betReceipt)

	// 2. Lấy config hiện tại.
	// - Kèo web: lợi nhuận tiền kèo chỉ tính theo phí trung gian (%)
	// - Kèo ngoài: giữ nguyên, tính theo (phí rút ngoài + phí trung gian) (%)
	exchangeRate, adminReceiveRate, _, configErr := s.getFullConfig()
	tiers, _, feeRutTienNgoai, feeTrungGianPct, _ := s.getUserFeeConfig()
	phiWebLookup := lookupPhiWebFromTiers(tiers, betReceipt.WebBetAmountCNY)
	derivedFeeWebPct := feeTrungGianPct
	derivedExternalPct := feeRutTienNgoai + feeTrungGianPct
	if derivedFeeWebPct <= 0 {
		// Mặc định phí trung gian (theo config public fallback): 6%
		derivedFeeWebPct = 6.0
	}
	if derivedExternalPct <= 0 {
		// Mặc định phí kèo ngoài = phí rút ngoài (1%) + phí trung gian (6%) = 7%
		derivedExternalPct = 7.0
	}
	if configErr != nil {
		exchangeRate, adminReceiveRate = 3550.0, 3850.0
	}
	if exchangeRate <= 0 {
		exchangeRate = 3550.0
	}

	// Lưu status cũ để kiểm tra xem có cần tính lại wallet không
	oldStatus := betReceipt.Status

	// 3. Xử lý theo từng status
	if req.Status == models.BetReceiptStatusDone {
		// DONE: không cho phép cắt tiền
		betReceipt.UserCutCNY = 0
		// Status = "DONE": Set ActualReceivedCNY = WebBetAmountCNY ban đầu và tính ActualAmountCNY
		betReceipt.ActualReceivedCNY = betReceipt.WebBetAmountCNY // ActualReceivedCNY = WebBetAmountCNY khi DONE
		actualAmountCNY, _ := s.CalculateActualAmountCNY(betReceipt.BetType, betReceipt.WebBetAmountCNY)
		betReceipt.ActualAmountCNY = actualAmountCNY
		log.Printf("Service - ✅ Status = DONE, set ActualReceivedCNY = WebBetAmountCNY = %.2f, Công thực nhận: %.2f cho đơn hàng ID: %s",
			betReceipt.WebBetAmountCNY, actualAmountCNY, id)
	} else if req.Status == models.BetReceiptStatusCancelled {
		// Status = "HỦY BỎ": Yêu cầu nhập ActualReceivedCNY
		if req.ActualReceivedCNY == nil {
			return nil, errors.New("Khi chọn status 'Hủy bỏ', phải nhập 'Tiền kèo thực nhận' (ActualReceivedCNY)")
		}
		// Lý do hủy bỏ
		if req.CancelReason == nil || strings.TrimSpace(*req.CancelReason) == "" {
			return nil, errors.New("Khi chọn status 'Hủy bỏ', phải nhập 'Lý do hủy bỏ'")
		}
		betReceipt.CancelReason = strings.TrimSpace(*req.CancelReason)

		// Tiền cắt (tệ) - optional
		userCut := 0.0
		if req.UserCutCNY != nil {
			userCut = *req.UserCutCNY
		}
		if userCut < 0 {
			return nil, errors.New("Tiền cắt phải ≥ 0")
		}

		actualReceivedCNY := *req.ActualReceivedCNY
		betReceipt.ActualReceivedCNY = actualReceivedCNY
		// KHÔNG thay đổi WebBetAmountCNY (giữ nguyên giá trị ban đầu)

		// Tính ActualAmountCNY dựa trên ActualReceivedCNY (coi như WebBetAmountCNY để tính)
		// Nếu ActualReceivedCNY = 0 thì ActualAmountCNY = 0
		if actualReceivedCNY == 0 {
			betReceipt.ActualAmountCNY = 0
			betReceipt.UserCutCNY = 0
			log.Printf("Service - ℹ️ Status = HỦY BỎ, ActualReceivedCNY = 0, set ActualAmountCNY = 0 cho đơn hàng ID: %s", id)
		} else {
			actualAmountCNY, _ := s.CalculateActualAmountCNY(betReceipt.BetType, actualReceivedCNY)
			if userCut > actualAmountCNY {
				return nil, errors.New("Tiền cắt không được lớn hơn Công thực nhận")
			}
			betReceipt.ActualAmountCNY = actualAmountCNY
			betReceipt.UserCutCNY = userCut
			log.Printf("Service - ✅ Status = HỦY BỎ, ActualReceivedCNY = %.2f, Công thực nhận: %.2f cho đơn hàng ID: %s",
				actualReceivedCNY, actualAmountCNY, id)
		}
	} else if req.Status == models.BetReceiptStatusCompensation {
		// Status = "ĐỀN": Yêu cầu nhập CompensationCNY và CancelReason (lý do đền)
		if req.CompensationCNY == nil {
			return nil, errors.New("Khi chọn status 'Đền', phải nhập 'Tiền đền' (CompensationCNY)")
		}
		if req.CancelReason == nil || *req.CancelReason == "" {
			return nil, errors.New("Khi chọn status 'Đền', phải nhập 'Lý do đền' (CancelReason)")
		}

		// Tiền cắt (tệ) - optional (cắt thêm để bù lỗ)
		userCut := 0.0
		if req.UserCutCNY != nil {
			userCut = *req.UserCutCNY
		}
		if userCut < 0 {
			return nil, errors.New("Tiền cắt phải ≥ 0")
		}

		compensationCNY := *req.CompensationCNY
		// Validation: Tiền đền phải > 0
		if compensationCNY <= 0 {
			return nil, errors.New("Tiền đền phải lớn hơn 0")
		}

		betReceipt.CompensationCNY = compensationCNY
		betReceipt.CancelReason = *req.CancelReason
		betReceipt.UserCutCNY = userCut
		// KHÔNG thay đổi WebBetAmountCNY và ActualReceivedCNY (giữ nguyên giá trị)
		betReceipt.ActualAmountCNY = -compensationCNY // Giá trị ÂM để trừ tiền
		log.Printf("Service - ✅ Status = ĐỀN, CompensationCNY = %.2f, ActualAmountCNY (âm): %.2f cho đơn hàng ID: %s",
			compensationCNY, betReceipt.ActualAmountCNY, id)
		log.Printf("Service - ✅ Status = ĐỀN, Lý do đền: %s cho đơn hàng ID: %s", betReceipt.CancelReason, id)
	} else {
		// Khi status không phải "DONE", "HỦY BỎ", hoặc "ĐỀN"
		betReceipt.UserCutCNY = 0
		// Nếu đổi từ "DONE" hoặc "HỦY BỎ" sang status khác, reset ActualReceivedCNY về 0 và xóa lý do hủy
		if oldStatus == models.BetReceiptStatusDone || oldStatus == models.BetReceiptStatusCancelled {
			betReceipt.ActualReceivedCNY = 0
			betReceipt.CancelReason = "" // Xóa lý do hủy khi đổi sang status khác
			log.Printf("Service - ℹ️ Đổi từ %s sang %s, reset ActualReceivedCNY = 0 và xóa lý do hủy cho đơn hàng ID: %s", oldStatus, req.Status, id)
		}
		// Nếu đổi từ "ĐỀN" sang status khác, reset CompensationCNY về 0
		if oldStatus == models.BetReceiptStatusCompensation {
			betReceipt.CompensationCNY = 0
			log.Printf("Service - ℹ️ Đổi từ %s sang %s, reset CompensationCNY = 0 cho đơn hàng ID: %s", oldStatus, req.Status, id)
		}
		// Không hiển thị "Công thực nhận"
		betReceipt.ActualAmountCNY = 0
		log.Printf("Service - ℹ️ Status không phải DONE/HỦY BỎ/ĐỀN, set Công thực nhận = 0 cho đơn hàng ID: %s", id)
	}

	// 4. Cập nhật các trường khác nếu có (chỉ khi không phải "HỦY BỎ", "DONE", và "ĐỀN" vì đã xử lý ở trên)
	// Lưu ý: Nếu đổi từ "DONE" hoặc "HỦY BỎ" sang status khác, ActualReceivedCNY đã được reset về 0 ở phần trên
	// Nếu đổi từ "ĐỀN" sang status khác, CompensationCNY đã được reset về 0 ở phần trên
	// và sẽ không bị override ở đây (vì khi đổi status, thường không gửi các giá trị này trong request)
	if req.Status != models.BetReceiptStatusCancelled && req.Status != models.BetReceiptStatusDone && req.Status != models.BetReceiptStatusCompensation {
		if req.ActualReceivedCNY != nil {
			betReceipt.ActualReceivedCNY = *req.ActualReceivedCNY
		}
		// CompensationCNY chỉ có giá trị khi status = "ĐỀN", các status khác luôn là 0
		// Không cho phép override CompensationCNY khi status không phải "ĐỀN"
		betReceipt.CompensationCNY = 0
		log.Printf("Service - ✅ Status không phải ĐỀN, set CompensationCNY = 0 cho đơn hàng ID: %s", id)
	}
	// 4.5. Xử lý thời gian hoàn thành:
	// - Nếu status là "HỦY BỎ", "DONE", "ĐỀN", "CHỜ DUYỆT", hoặc "CHỜ TRỌNG TÀI": set thời gian hoàn thành
	// - Nếu status không phải các status trên: xóa thời gian hoàn thành (set về NULL)
	// - Nếu trước đó status là "CHỜ DUYỆT" hoặc "CHỜ TRỌNG TÀI" (đã có CompletedAt),
	//   khi chuyển sang DONE/HỦY BỎ/ĐỀN thì giữ nguyên ngày cũ (không cập nhật lại)
	if req.Status == models.BetReceiptStatusDone || req.Status == models.BetReceiptStatusCancelled || req.Status == models.BetReceiptStatusCompensation ||
		req.Status == models.BetReceiptStatusChoChapNhan || req.Status == models.BetReceiptStatusWaitingRef {
		// Kiểm tra nếu trước đó là "Chờ chấp nhận" hoặc "CHỜ TRỌNG TÀI" và đã có CompletedAt
		// Khi chuyển sang DONE/HỦY BỎ/ĐỀN thì giữ nguyên ngày cũ
		if (oldStatus == models.BetReceiptStatusChoChapNhan || oldStatus == models.BetReceiptStatusWaitingRef) &&
			betReceipt.CompletedAt != nil &&
			(req.Status == models.BetReceiptStatusDone || req.Status == models.BetReceiptStatusCancelled || req.Status == models.BetReceiptStatusCompensation) {
			// Giữ nguyên CompletedAt cũ (không cập nhật lại)
			log.Printf("Service - ℹ️ Giữ nguyên thời gian hoàn thành cũ cho đơn hàng ID: %s (từ %s sang %s)", id, oldStatus, req.Status)
		} else {
			// Nếu có CompletedAt trong request, dùng nó (thường là nil, sẽ set mới)
			if req.CompletedAt != nil {
				betReceipt.CompletedAt = req.CompletedAt
			} else {
				// Set thời gian mới khi chuyển sang các status này
				now := time.Now()
				betReceipt.CompletedAt = &now
				log.Printf("Service - ✅ Set thời gian hoàn thành mới cho đơn hàng ID: %s với status: %s", id, req.Status)
			}
		}
	} else {
		// Status không phải các status trên -> xóa thời gian hoàn thành
		betReceipt.CompletedAt = nil
		log.Printf("Service - ✅ Xóa thời gian hoàn thành cho đơn hàng ID: %s khi chuyển sang status: %s", id, req.Status)
	}

	// 4.6. Xử lý thời gian bắt đầu cày:
	// - Bắt đầu tính khi kèo chuyển sang "ĐANG THỰC HIỆN"
	// - Admin chuyển từ "Chờ chấp nhận" sang "ĐANG THỰC HIỆN" -> bắt đầu tính giờ
	if req.Status == models.BetReceiptStatusInProgress &&
		oldStatus == models.BetReceiptStatusChoChapNhan &&
		betReceipt.StartedAt == nil {
		now := time.Now()
		betReceipt.StartedAt = &now
		log.Printf("Service - ✅ Set thời gian bắt đầu cày cho đơn hàng ID: %s", id)
	}

	// 4.7. Xử lý thời gian còn lại (Deadline):
	// Deadline không bao giờ bị thay đổi khi update status, chỉ có thể thay đổi khi bấm nút chỉnh sửa
	// Giữ nguyên giá trị TimeRemainingHours từ DB hiện tại (không thay đổi)
	log.Printf("Service - ℹ️ Giữ nguyên Deadline (thoi_gian_con_lai_gio) cho đơn hàng ID: %s khi chuyển sang status: %s", id, req.Status)

	// 5. Cập nhật status vào database TRƯỚC (để khi tính lại wallet, status đã được update)
	betReceipt.Status = req.Status

	// Khi admin chuyển từ "Chờ chấp nhận" sang "ĐANG THỰC HIỆN": gán admin (id_admin_duyet) để đơn thuộc admin đó
	if req.Status == models.BetReceiptStatusInProgress && oldStatus == models.BetReceiptStatusChoChapNhan && performedBy != nil && betReceipt.AssignedAdminID == nil {
		betReceipt.AssignedAdminID = performedBy
		log.Printf("Service - ✅ Admin chấp nhận đơn: assigned_admin_id = %s cho đơn hàng ID: %s", *performedBy, id)
	}

	// 5. Lưu vào database
	if err := s.betReceiptRepo.UpdateStatus(betReceipt); err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật status: %v", err)
		return nil, errors.New("Lỗi khi cập nhật status: " + err.Error())
	}

	// 5.1 Bảng lợi nhuận snapshot: ghi khi đơn DONE/HỦY BỎ/ĐỀN, xóa khi đổi trạng thái ngược lại
	completedStatuses := map[string]bool{models.BetReceiptStatusDone: true, models.BetReceiptStatusCancelled: true, models.BetReceiptStatusCompensation: true}
	wasCompleted := completedStatuses[oldStatus]
	nowCompleted := completedStatuses[betReceipt.Status]
	if nowCompleted {
		if err := s.betReceiptRepo.UpsertProfitSnapshot(betReceipt, exchangeRate, adminReceiveRate, derivedFeeWebPct, derivedExternalPct, phiWebLookup); err != nil {
			log.Printf("Service - ⚠️ UpsertProfitSnapshot thất bại (không chặn request): %v", err)
		}
	} else if wasCompleted {
		if err := s.betReceiptRepo.DeleteProfitSnapshotByBetReceiptID(betReceipt.ID); err != nil {
			log.Printf("Service - ⚠️ DeleteProfitSnapshotByBetReceiptID thất bại (không chặn request): %v", err)
		}
	}

	// Thông báo: admin tổng update -> chỉ gửi cho admin được gán đơn; admin thường update -> chỉ gửi cho admin tổng. Nội dung hiện ai cập nhật.
	if s.notificationService != nil && oldStatus != req.Status && performedBy != nil {
		go func() {
			performerUser, errPerformer := s.userRepo.FindByID(*performedBy)
			performerName := "Admin"
			performerRole := "admin"
			if errPerformer == nil && performerUser != nil {
				if performerUser.Name != "" {
					performerName = performerUser.Name
				}
				performerRole = performerUser.Role
			}
			title := "Trạng thái đơn hàng thay đổi"
			message := fmt.Sprintf("%s đã cập nhật trạng thái đơn %s từ %s sang %s", performerName, betReceipt.TaskCode, oldStatus, req.Status)

			dataMap := map[string]interface{}{
				"bet_receipt_id":  betReceipt.ID,
				"task_code":       betReceipt.TaskCode,
				"old_status":      oldStatus,
				"new_status":      req.Status,
				"updated_by_id":   *performedBy,
				"updated_by_name": performerName,
			}
			dataBytes, _ := json.Marshal(dataMap)
			dataStr := string(dataBytes)

			var targetUserIDs []string
			if performerRole == "admin_tong" {
				// Admin tổng cập nhật -> chỉ gửi cho admin được gán đơn (nếu có)
				if betReceipt.AssignedAdminID != nil && *betReceipt.AssignedAdminID != "" && *betReceipt.AssignedAdminID != *performedBy {
					targetUserIDs = append(targetUserIDs, *betReceipt.AssignedAdminID)
				}
			} else {
				// Admin thường cập nhật -> gửi cho tất cả admin tổng
				adminTongList, err := s.userRepo.GetAdminTong(100, 0)
				if err != nil {
					log.Printf("NotificationService - ⚠️ Không lấy được danh sách admin tổng: %v", err)
					return
				}
				for _, u := range adminTongList {
					if u.ID != "" && u.ID != *performedBy {
						targetUserIDs = append(targetUserIDs, u.ID)
					}
				}
			}
			for _, uid := range targetUserIDs {
				_, _ = s.notificationService.Create(&models.CreateNotificationRequest{
					UserID:  uid,
					Type:    "order_status_changed",
					Title:   title,
					Message: message,
					Data:    &dataStr,
				})
			}
			log.Printf("NotificationService - ✅ Đã gửi thông báo cập nhật đơn (người cập nhật: %s) tới %d người nhận", performerName, len(targetUserIDs))
		}()
	}

	// 6. Tính lại wallet SAU KHI đã update status vào database
	// - Status mới = DONE, HỦY BỎ, hoặc ĐỀN (DONE và HỦY BỎ cộng tiền, ĐỀN trừ tiền)
	// - Status cũ = DONE, HỦY BỎ, hoặc ĐỀN và status mới ≠ DONE, ≠ HỦY BỎ, và ≠ ĐỀN (tính lại wallet)
	if req.Status == models.BetReceiptStatusDone || req.Status == models.BetReceiptStatusCancelled || req.Status == models.BetReceiptStatusCompensation ||
		oldStatus == models.BetReceiptStatusDone || oldStatus == models.BetReceiptStatusCancelled || oldStatus == models.BetReceiptStatusCompensation {
		// Tính lại tổng "Công thực nhận" từ tất cả bet receipts có status = "DONE", "HỦY BỎ", hoặc "ĐỀN"
		// (ĐỀN có ActualAmountCNY âm nên sẽ tự động trừ đi)
		// và cập nhật wallet theo tổng này (đảm bảo wallet luôn phản ánh đúng tổng từ database)
		if err := s.walletRepo.RecalculateTotalReceived(betReceipt.UserID, exchangeRate); err != nil {
			log.Printf("Service - ❌ Lỗi tính lại wallet: %v", err)
			return nil, errors.New("Lỗi khi cập nhật wallet: " + err.Error())
		}
		log.Printf("Service - ✅ Đã tính lại wallet cho user ID: %s từ tất cả bet receipts có status = DONE, HỦY BỎ, hoặc ĐỀN",
			betReceipt.UserID)
	}

	// Ghi log lịch sử (UPDATE status)
	if s.historyRepo != nil {
		go func() {
			newBetReceiptData, _ := betReceiptToMap(betReceipt)
			changedFields := repository.FindChangedFields(oldBetReceiptData, newBetReceiptData)

			historyReq := &models.CreateHistoryRequest{
				BetReceiptID:  id,
				Action:        models.HistoryActionUpdate,
				PerformedBy:   performedBy,
				OldData:       oldBetReceiptData,
				NewData:       newBetReceiptData,
				ChangedFields: changedFields,
				Description:   "Cập nhật status: " + oldStatus + " -> " + req.Status,
			}

			if err := s.createHistory(historyReq); err != nil {
				log.Printf("Service - ⚠️ Không thể ghi lịch sử: %v", err)
			}
		}()
	}

	log.Printf("Service - ✅ Đã cập nhật status thành công cho đơn hàng ID: %s", id)
	if s.hub != nil {
		s.hub.BroadcastBetReceiptUpdated(nil)
	}
	return betReceipt, nil
}

// Helper function: Convert BetReceipt to map[string]interface{}
func betReceiptToMap(betReceipt *models.BetReceipt) (map[string]interface{}, error) {
	data, err := json.Marshal(betReceipt)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// Helper function: Create history record
func (s *BetReceiptService) createHistory(req *models.CreateHistoryRequest) error {
	historyService := NewBetReceiptHistoryService(s.historyRepo)
	return historyService.CreateHistory(req)
}

// RecalculateActualAmountCNY tính lại "Công thực nhận" (ActualAmountCNY) cho một đơn hàng đã xử lý
// Chỉ áp dụng cho các đơn hàng có status = DONE, HỦY BỎ, hoặc ĐỀN
func (s *BetReceiptService) RecalculateActualAmountCNY(id string) (*models.BetReceipt, error) {
	log.Printf("Service - 🔄 Bắt đầu tính lại Công thực nhận cho đơn hàng ID: %s", id)

	// 1. Lấy thông tin đơn hàng hiện tại
	betReceipt, err := s.betReceiptRepo.FindByID(id)
	if err != nil {
		log.Printf("Service - ❌ Không tìm thấy đơn hàng với ID: %s", id)
		return nil, errors.New("Không tìm thấy đơn hàng")
	}

	// 2. Kiểm tra status có phải là đơn hàng đã xử lý không
	processedStatuses := []string{models.BetReceiptStatusDone, models.BetReceiptStatusCancelled, models.BetReceiptStatusCompensation}
	isProcessed := false
	for _, status := range processedStatuses {
		if betReceipt.Status == status {
			isProcessed = true
			break
		}
	}

	if !isProcessed {
		log.Printf("Service - ❌ Đơn hàng ID: %s có status '%s' chưa được xử lý. Chỉ tính lại tệ cho đơn hàng có status DONE, HỦY BỎ, hoặc ĐỀN", id, betReceipt.Status)
		return nil, errors.New("Chỉ có thể tính lại tệ cho đơn hàng đã xử lý (DONE, HỦY BỎ, hoặc ĐỀN)")
	}

	// 3. Tính lại ActualAmountCNY dựa trên status
	var newActualAmountCNY float64
	exchangeRate := 3550.0 // Tỷ giá mặc định

	if betReceipt.Status == models.BetReceiptStatusDone {
		// DONE: Tính dựa trên WebBetAmountCNY
		newActualAmountCNY, _ = s.CalculateActualAmountCNY(betReceipt.BetType, betReceipt.WebBetAmountCNY)
		betReceipt.ActualReceivedCNY = betReceipt.WebBetAmountCNY
		log.Printf("Service - ✅ Status = DONE, tính lại ActualAmountCNY = %.2f (từ WebBetAmountCNY = %.2f)", newActualAmountCNY, betReceipt.WebBetAmountCNY)
	} else if betReceipt.Status == models.BetReceiptStatusCancelled {
		// HỦY BỎ: Tính dựa trên ActualReceivedCNY
		if betReceipt.ActualReceivedCNY == 0 {
			newActualAmountCNY = 0
		} else {
			newActualAmountCNY, _ = s.CalculateActualAmountCNY(betReceipt.BetType, betReceipt.ActualReceivedCNY)
		}
		log.Printf("Service - ✅ Status = HỦY BỎ, tính lại ActualAmountCNY = %.2f (từ ActualReceivedCNY = %.2f)", newActualAmountCNY, betReceipt.ActualReceivedCNY)
	} else if betReceipt.Status == models.BetReceiptStatusCompensation {
		// ĐỀN: ActualAmountCNY = -CompensationCNY
		newActualAmountCNY = -betReceipt.CompensationCNY
		log.Printf("Service - ✅ Status = ĐỀN, tính lại ActualAmountCNY = %.2f (âm của CompensationCNY = %.2f)", newActualAmountCNY, betReceipt.CompensationCNY)
	}

	// 4. Lưu tỷ giá nếu chưa có
	if betReceipt.ExchangeRate == 0 {
		betReceipt.ExchangeRate = exchangeRate
	}

	// 5. Lưu ActualAmountCNY cũ để tính lại wallet
	oldActualAmountCNY := betReceipt.ActualAmountCNY
	betReceipt.ActualAmountCNY = newActualAmountCNY

	// 6. Cập nhật vào database (dùng UpdateStatus để cập nhật ActualAmountCNY)
	err = s.betReceiptRepo.UpdateStatus(betReceipt)
	if err != nil {
		log.Printf("Service - ❌ Lỗi cập nhật ActualAmountCNY: %v", err)
		return nil, errors.New("Lỗi khi cập nhật Công thực nhận: " + err.Error())
	}

	// 7. Tính lại wallet cho user (vì ActualAmountCNY đã thay đổi)
	// Tính lại từ đầu dựa trên tất cả đơn hàng
	if oldActualAmountCNY != newActualAmountCNY {
		log.Printf("Service - 🔄 ActualAmountCNY thay đổi: %.2f -> %.2f, tính lại wallet cho user %s", oldActualAmountCNY, newActualAmountCNY, betReceipt.UserID)

		// Tính lại wallet từ đầu (recalculate từ tất cả đơn hàng)
		// RecalculateWallet sẽ tự tạo wallet nếu chưa có
		err = s.walletRepo.RecalculateWallet(betReceipt.UserID, betReceipt.ExchangeRate)
		if err != nil {
			log.Printf("Service - ❌ Lỗi tính lại wallet: %v", err)
			return nil, errors.New("Lỗi khi tính lại wallet: " + err.Error())
		}

		log.Printf("Service - ✅ Đã tính lại wallet cho user %s", betReceipt.UserID)
	}

	log.Printf("Service - ✅ Tính lại Công thực nhận thành công - ID: %s, ActualAmountCNY: %.2f", id, newActualAmountCNY)

	return betReceipt, nil
}

// TopUserMonthlyResponse - Response DTO cho top user theo tháng
type TopUserMonthlyResponse struct {
	UserID    string  `json:"user_id"`
	UserName  string  `json:"user_name"`
	AmountCNY float64 `json:"amount_cny"`
	AvatarURL *string `json:"avatar_url"`
}

// GetTop5UsersByMonthlyReceivedAmount lấy top 5 users theo số tiền đã nhận trong tháng
// month: format "YYYY-MM" (ví dụ: "2026-01")
func (s *BetReceiptService) GetTop5UsersByMonthlyReceivedAmount(month string) ([]*TopUserMonthlyResponse, error) {
	results, err := s.betReceiptRepo.GetTop5UsersByMonthlyReceivedAmount(month)
	if err != nil {
		log.Printf("Service - ❌ Lỗi khi lấy top 5 users: %v", err)
		return nil, err
	}

	// Convert repository results to service response
	response := make([]*TopUserMonthlyResponse, len(results))
	for i, result := range results {
		response[i] = &TopUserMonthlyResponse{
			UserID:    result.UserID,
			UserName:  result.UserName,
			AmountCNY: result.AmountCNY,
			AvatarURL: result.AvatarURL,
		}
	}

	log.Printf("Service - ✅ Đã lấy %d top users cho tháng %s", len(response), month)
	return response, nil
}

// GetMonthlyTotalByUserID tính tổng số tiền đã nhận theo tháng cho user cụ thể
// month: format "YYYY-MM" (ví dụ: "2026-01"), nếu rỗng thì tính tất cả
// userID: ID của user cần tính
func (s *BetReceiptService) GetMonthlyTotalByUserID(userID string, month string) (float64, error) {
	total, err := s.betReceiptRepo.GetMonthlyTotalByUserID(userID, month)
	if err != nil {
		log.Printf("Service - ❌ Lỗi khi tính tổng theo tháng cho user %s, tháng %s: %v", userID, month, err)
		return 0, err
	}

	log.Printf("Service - ✅ Đã tính tổng cho user %s, tháng %s: %.2f ¥", userID, month, total)
	return total, nil
}

// AdminProfitByMonthResponse - Lợi nhuận admin theo tháng (tổng tất cả admin) - dùng cho API
type AdminProfitByMonthResponse struct {
	Month     string  `json:"month"`      // "YYYY-MM"
	ProfitCNY float64 `json:"profit_cny"` // Lợi nhuận (¥)
	ProfitVND float64 `json:"profit_vnd"` // Lợi nhuận (VND)
}

// GetAdminProfitByMonth lấy lợi nhuận admin theo tháng từ bảng admin_profit_snapshot (tổng tất cả admin).
func (s *BetReceiptService) GetAdminProfitByMonth() ([]*AdminProfitByMonthResponse, error) {
	rows, err := s.betReceiptRepo.GetAdminProfitByMonthFromSnapshot()
	if err != nil {
		log.Printf("Service - ❌ Lỗi khi lấy lợi nhuận admin theo tháng: %v", err)
		return nil, err
	}
	out := make([]*AdminProfitByMonthResponse, len(rows))
	for i, r := range rows {
		out[i] = &AdminProfitByMonthResponse{Month: r.Month, ProfitCNY: r.ProfitCNY, ProfitVND: r.ProfitVND}
	}
	log.Printf("Service - ✅ Đã lấy %d tháng lợi nhuận admin", len(out))
	return out, nil
}

// AdminProfitStatsByAdminResponse - Thống kê & lợi nhuận theo admin (API)
type AdminProfitStatsByAdminResponse struct {
	AdminID               string  `json:"admin_id"`
	AdminName             string  `json:"admin_name"`
	VaiTro                string  `json:"vai_tro"` // "admin" | "admin_tong"
	SoDonWeb              int64   `json:"so_don_web"`
	TongTienKeoWeb        float64 `json:"tong_tien_keo_web"`
	TienLoiNhuanKeoWeb    float64 `json:"tien_loi_nhuan_keo_web"`
	SoDonNgoai            int64   `json:"so_don_ngoai"`
	TongTienKeoNgoai      float64 `json:"tong_tien_keo_ngoai"`
	TienLoiNhuanKeoNgoai  float64 `json:"tien_loi_nhuan_keo_ngoai"`
	TongLoiNhuanTienKeo   float64 `json:"tong_loi_nhuan_tien_keo"`
	TongLoiNhuanTienCat   float64 `json:"tong_loi_nhuan_tien_cat"`
	TongLoiNhuanChenhLech float64 `json:"tong_loi_nhuan_chenh_lech"`
	SoDonHuy              int64   `json:"so_don_huy"`
	SoKeoDen              int64   `json:"so_keo_den"`
	TongTienDenTe         float64 `json:"tong_tien_den_te"`           // Tổng tiền đền (¥) - bảng thống kê toàn tệ
	TienLoiNhuanTienCatTe float64 `json:"tien_loi_nhuan_tien_cat_te"` // Lợi nhuận tiền cắt (¥) - bảng thống kê toàn tệ
	TienThamHutDen        float64 `json:"tien_tham_hut_den"`
	TongLoiNhuan          float64 `json:"tong_loi_nhuan"`
}

// AdminProfitSplitRow - Một dòng bảng phân chia lợi nhuận: tổng lợi nhuận, tiền điều chuyển (âm=nộp, dương=thu), tiền thực nhận
type AdminProfitSplitRow struct {
	AdminID        string  `json:"admin_id"`
	AdminName      string  `json:"admin_name"`
	VaiTro         string  `json:"vai_tro"`
	TongLoiNhuan   float64 `json:"tong_loi_nhuan"`   // Tổng lợi nhuận (từ đơn của admin đó)
	TienDieuChuyen float64 `json:"tien_dieu_chuyen"` // Âm: admin thường nộp; Dương: admin tổng thu về
	TienThucNhan   float64 `json:"tien_thuc_nhan"`   // Tiền thực nhận sau phân chia
}

// GetAdminProfitStatsByAdmin lấy thống kê và lợi nhuận theo từng admin từ bảng admin_profit_snapshot (đã tính khi đơn DONE/HỦY BỎ/ĐỀN).
// Đồng thời tính bảng phân chia: tiền điều chuyển (admin thường âm, admin tổng dương) và tiền thực nhận theo admin_keep_pct.
func (s *BetReceiptService) GetAdminProfitStatsByAdmin(month string) ([]*AdminProfitStatsByAdminResponse, []*AdminProfitSplitRow, error) {
	_, _, adminKeepPct, configErr := s.getFullConfig()
	if configErr != nil {
		adminKeepPct = 60.0
	}
	if adminKeepPct <= 0 || adminKeepPct > 100 {
		adminKeepPct = 60.0
	}
	keepRatio := adminKeepPct / 100.0
	payRatio := 1.0 - keepRatio

	rows, err := s.betReceiptRepo.GetAdminProfitStatsByAdminFromSnapshot(month)
	if err != nil {
		log.Printf("Service - ❌ Lỗi khi lấy thống kê lợi nhuận theo admin: %v", err)
		return nil, nil, err
	}
	out := make([]*AdminProfitStatsByAdminResponse, len(rows))
	for i, r := range rows {
		vaiTro := r.VaiTro
		if vaiTro != "admin_tong" {
			vaiTro = "admin"
		}
		out[i] = &AdminProfitStatsByAdminResponse{
			AdminID:               r.AdminID,
			AdminName:             r.AdminName,
			VaiTro:                vaiTro,
			SoDonWeb:              r.SoDonWeb,
			TongTienKeoWeb:        r.TongTienKeoWeb,
			TienLoiNhuanKeoWeb:    r.TienLoiNhuanKeoWeb,
			SoDonNgoai:            r.SoDonNgoai,
			TongTienKeoNgoai:      r.TongTienKeoNgoai,
			TienLoiNhuanKeoNgoai:  r.TienLoiNhuanKeoNgoai,
			TongLoiNhuanTienKeo:   r.TongLoiNhuanTienKeo,
			TongLoiNhuanTienCat:   r.TongLoiNhuanTienCat,
			TongLoiNhuanChenhLech: r.TongLoiNhuanChenhLech,
			SoDonHuy:              r.SoDonHuy,
			SoKeoDen:              r.SoKeoDen,
			TongTienDenTe:         r.TongTienDenTe,
			TienLoiNhuanTienCatTe: r.TienLoiNhuanTienCatTe,
			TienThamHutDen:        r.TienThamHutDen,
			TongLoiNhuan:          r.TongLoiNhuan,
		}
	}

	// Tổng tiền admin thường nộp cho admin tổng (40% lợi nhuận của từng admin thường)
	var totalNopFromAdmin float64
	for _, r := range rows {
		if r.VaiTro != "admin_tong" {
			totalNopFromAdmin += r.TongLoiNhuan * payRatio
		}
	}

	splitRows := make([]*AdminProfitSplitRow, 0, len(rows))
	for _, r := range rows {
		vaiTro := r.VaiTro
		if vaiTro != "admin_tong" {
			vaiTro = "admin"
		}
		var tienDieuChuyen, tienThucNhan float64
		if r.VaiTro == "admin_tong" {
			tienDieuChuyen = totalNopFromAdmin
			tienThucNhan = r.TongLoiNhuan + totalNopFromAdmin
		} else {
			tienDieuChuyen = -r.TongLoiNhuan * payRatio
			tienThucNhan = r.TongLoiNhuan * keepRatio
		}
		splitRows = append(splitRows, &AdminProfitSplitRow{
			AdminID:        r.AdminID,
			AdminName:      r.AdminName,
			VaiTro:         vaiTro,
			TongLoiNhuan:   r.TongLoiNhuan,
			TienDieuChuyen: tienDieuChuyen,
			TienThucNhan:   tienThucNhan,
		})
	}
	log.Printf("Service - ✅ Đã lấy %d admin thống kê lợi nhuận, %d dòng phân chia", len(out), len(splitRows))
	return out, splitRows, nil
}
