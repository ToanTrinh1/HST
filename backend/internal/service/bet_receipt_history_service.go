package service

import (
	"encoding/json"
	"fullstack-backend/internal/models"
	"fullstack-backend/internal/repository"
	"log"
)

type BetReceiptHistoryService struct {
	historyRepo *repository.BetReceiptHistoryRepository
}

func NewBetReceiptHistoryService(historyRepo *repository.BetReceiptHistoryRepository) *BetReceiptHistoryService {
	return &BetReceiptHistoryService{
		historyRepo: historyRepo,
	}
}

// CreateHistory tạo bản ghi lịch sử
func (s *BetReceiptHistoryService) CreateHistory(req *models.CreateHistoryRequest) error {
	// Convert old_data, new_data, changed_fields to JSON strings
	var oldDataJSON, newDataJSON, changedFieldsJSON string

	if req.OldData != nil {
		data, err := json.Marshal(req.OldData)
		if err != nil {
			log.Printf("Service - ❌ Lỗi convert old_data to JSON: %v", err)
			return err
		}
		oldDataJSON = string(data)
	}

	if req.NewData != nil {
		data, err := json.Marshal(req.NewData)
		if err != nil {
			log.Printf("Service - ❌ Lỗi convert new_data to JSON: %v", err)
			return err
		}
		newDataJSON = string(data)
	}

	if req.ChangedFields != nil {
		data, err := json.Marshal(req.ChangedFields)
		if err != nil {
			log.Printf("Service - ❌ Lỗi convert changed_fields to JSON: %v", err)
			return err
		}
		changedFieldsJSON = string(data)
	}

	history := &models.BetReceiptHistory{
		BetReceiptID:  req.BetReceiptID,
		Action:        req.Action,
		PerformedBy:   req.PerformedBy,
		OldData:       oldDataJSON,
		NewData:       newDataJSON,
		ChangedFields: changedFieldsJSON,
		Description:   req.Description,
	}

	if err := s.historyRepo.Create(history); err != nil {
		log.Printf("Service - ❌ Lỗi tạo lịch sử: %v", err)
		return err
	}

	log.Printf("Service - ✅ Đã tạo lịch sử thành công cho bet_receipt_id: %s, action: %s", req.BetReceiptID, req.Action)
	return nil
}

// GetAllHistories lấy tất cả lịch sử (có phân trang)
func (s *BetReceiptHistoryService) GetAllHistories(limit, offset int) ([]*models.BetReceiptHistory, error) {
	return s.historyRepo.GetAll(limit, offset)
}

// GetHistoriesByBetReceiptID lấy lịch sử theo bet_receipt_id
func (s *BetReceiptHistoryService) GetHistoriesByBetReceiptID(betReceiptID string) ([]*models.BetReceiptHistory, error) {
	return s.historyRepo.GetByBetReceiptID(betReceiptID)
}


