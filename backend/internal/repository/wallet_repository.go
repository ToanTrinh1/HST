package repository

import (
	"database/sql"
	"fullstack-backend/internal/models"
	"time"
)

type WalletRepository struct {
	db *sql.DB
}

func NewWalletRepository(db *sql.DB) *WalletRepository {
	return &WalletRepository{db: db}
}

// GetAllWallets lấy tất cả wallets với thông tin user (join với nguoi_dung)
// Dùng LEFT JOIN để lấy tất cả users, kể cả chưa có wallet
// Cột ten từ nguoi_dung sẽ được map vào user.Name
func (r *WalletRepository) GetAllWallets(limit, offset int) ([]*models.Wallet, []*models.User, error) {
	query := `
		SELECT 
			COALESCE(tk.id, '') as wallet_id,
			nd.id as user_id,
			COALESCE(tk.tong_cong_thuc_nhan_te, 0) as tong_cong_thuc_nhan_te,
			COALESCE(tk.tong_da_rut_te, 0) as tong_da_rut_te,
			COALESCE(tk.tong_cong_thuc_nhan_vnd, 0) as tong_cong_thuc_nhan_vnd,
			COALESCE(tk.tong_coc_vnd, 0) as tong_coc_vnd,
			COALESCE(tk.tong_da_rut_vnd, 0) as tong_da_rut_vnd,
			COALESCE(tk.so_du_hien_tai_vnd, 0) as so_du_hien_tai_vnd,
			COALESCE(tk.thoi_gian_cap_nhat, NOW()) as thoi_gian_cap_nhat,
			nd.id,
			nd.email,
			nd.ten,
			nd.vai_tro,
			nd.thoi_gian_tao,
			nd.thoi_gian_cap_nhat
		FROM nguoi_dung nd
		LEFT JOIN tien_keo tk ON tk.id_nguoi_dung = nd.id
		WHERE nd.vai_tro = 'user'
		ORDER BY nd.ten ASC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	wallets := []*models.Wallet{}
	users := []*models.User{}

	for rows.Next() {
		wallet := &models.Wallet{}
		user := &models.User{}

		var walletID sql.NullString
		var walletUpdatedAt sql.NullTime

		err := rows.Scan(
			&walletID,
			&wallet.UserID,
			&wallet.TotalReceivedCNY,
			&wallet.TotalWithdrawnCNY,
			&wallet.TotalReceivedVND,
			&wallet.TotalDepositVND,
			&wallet.TotalWithdrawnVND,
			&wallet.CurrentBalanceVND,
			&walletUpdatedAt,
			&user.ID,
			&user.Email,
			&user.Name, // Map từ nd.ten trong database
			&user.Role,
			&user.CreatedAt,
			&user.UpdatedAt,
		)

		if err != nil {
			return nil, nil, err
		}

		// Nếu wallet chưa tồn tại, tạo wallet mặc định
		if !walletID.Valid || walletID.String == "" {
			wallet.ID = "" // Wallet chưa có trong DB
			wallet.UserID = user.ID
			wallet.TotalReceivedCNY = 0
			wallet.TotalWithdrawnCNY = 0
			wallet.TotalReceivedVND = 0
			wallet.TotalDepositVND = 0
			wallet.TotalWithdrawnVND = 0
			wallet.CurrentBalanceVND = 0
			wallet.UpdatedAt = time.Now() // Set thời gian hiện tại nếu wallet chưa có
		} else {
			wallet.ID = walletID.String
			if walletUpdatedAt.Valid {
				wallet.UpdatedAt = walletUpdatedAt.Time
			} else {
				wallet.UpdatedAt = time.Now()
			}
		}

		wallets = append(wallets, wallet)
		users = append(users, user)
	}

	return wallets, users, nil
}

// GetWalletByUserID lấy wallet theo user ID
func (r *WalletRepository) GetWalletByUserID(userID string) (*models.Wallet, error) {
	query := `
		SELECT 
			id,
			id_nguoi_dung,
			tong_cong_thuc_nhan_te,
			tong_da_rut_te,
			tong_cong_thuc_nhan_vnd,
			tong_coc_vnd,
			tong_da_rut_vnd,
			so_du_hien_tai_vnd,
			thoi_gian_cap_nhat
		FROM tien_keo
		WHERE id_nguoi_dung = $1
	`

	wallet := &models.Wallet{}
	err := r.db.QueryRow(query, userID).Scan(
		&wallet.ID,
		&wallet.UserID,
		&wallet.TotalReceivedCNY,
		&wallet.TotalWithdrawnCNY,
		&wallet.TotalReceivedVND,
		&wallet.TotalDepositVND,
		&wallet.TotalWithdrawnVND,
		&wallet.CurrentBalanceVND,
		&wallet.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		// Wallet chưa tồn tại, trả về nil
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return wallet, nil
}

// CreateWallet tạo wallet mới cho user
// ID sẽ được database tự động generate (DEFAULT gen_random_uuid()::text)
func (r *WalletRepository) CreateWallet(wallet *models.Wallet) error {
	query := `
		INSERT INTO tien_keo (
			id_nguoi_dung, tong_cong_thuc_nhan_te, tong_da_rut_te,
			tong_cong_thuc_nhan_vnd, tong_coc_vnd, tong_da_rut_vnd,
			so_du_hien_tai_vnd, thoi_gian_cap_nhat
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		RETURNING id, thoi_gian_cap_nhat
	`

	err := r.db.QueryRow(
		query,
		wallet.UserID,
		wallet.TotalReceivedCNY,
		wallet.TotalWithdrawnCNY,
		wallet.TotalReceivedVND,
		wallet.TotalDepositVND,
		wallet.TotalWithdrawnVND,
		wallet.CurrentBalanceVND,
	).Scan(&wallet.ID, &wallet.UpdatedAt)

	return err
}

// AddToTotalReceivedCNY cộng thêm vào tong_cong_thuc_nhan_te và tong_cong_thuc_nhan_vnd
// exchangeRate: tỷ giá VND/CNY (mặc định 3550)
func (r *WalletRepository) AddToTotalReceived(userID string, amountCNY float64, exchangeRate float64) error {
	// Tính amountVND
	amountVND := amountCNY * exchangeRate

	// Kiểm tra wallet có tồn tại không
	wallet, err := r.GetWalletByUserID(userID)
	if err != nil {
		return err
	}

	if wallet == nil {
		// Wallet chưa tồn tại, tạo mới
		wallet = &models.Wallet{
			ID:                "", // Sẽ được generate bởi database
			UserID:            userID,
			TotalReceivedCNY:  amountCNY,
			TotalWithdrawnCNY: 0,
			TotalReceivedVND:  amountVND,
			TotalDepositVND:   0,
			TotalWithdrawnVND: 0,
			CurrentBalanceVND: amountVND, // Số dư = tổng nhận (chưa có cọc và rút)
		}
		return r.CreateWallet(wallet)
	}

	// Wallet đã tồn tại, update
	query := `
		UPDATE tien_keo
		SET 
			tong_cong_thuc_nhan_te = tong_cong_thuc_nhan_te + $1,
			tong_cong_thuc_nhan_vnd = tong_cong_thuc_nhan_vnd + $2,
			so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + tong_coc_vnd - tong_da_rut_vnd,
			thoi_gian_cap_nhat = NOW()
		WHERE id_nguoi_dung = $3
	`

	_, err = r.db.Exec(query, amountCNY, amountVND, userID)
	return err
}

// RecalculateTotalReceived tính lại tổng "Công thực nhận" từ tất cả bet receipts có status = "DONE", "HỦY BỎ", hoặc "ĐỀN"
// TotalReceivedCNY = tổng ActualAmountCNY (cong_thuc_nhan_te) từ tất cả bet receipts có status = "DONE", "HỦY BỎ", hoặc "ĐỀN"
// TotalReceivedVND = tổng (ActualAmountCNY * exchange_rate) - dùng tỷ giá riêng của từng đơn hàng
// (ĐỀN có ActualAmountCNY âm nên sẽ tự động trừ đi khi tính tổng)
// ActualReceivedCNY (tien_keo_web_thuc_nhan_te) và CompensationCNY (tien_den_te) chỉ dùng để hiển thị, không dùng để tính wallet
func (r *WalletRepository) RecalculateTotalReceived(userID string, exchangeRate float64) error {
	// Tính tổng ActualAmountCNY và TotalReceivedVND (dùng tỷ giá riêng của từng đơn hàng)
	query := `
		SELECT 
			COALESCE(SUM(cong_thuc_nhan_te), 0) as total_actual_amount_cny,
			COALESCE(SUM(cong_thuc_nhan_te * COALESCE(exchange_rate, $1)), 0) as total_actual_amount_vnd
		FROM thong_tin_nhan_keo
		WHERE id_nguoi_dung = $2 AND (tien_do_hoan_thanh = 'DONE' OR tien_do_hoan_thanh = 'HỦY BỎ' OR tien_do_hoan_thanh = 'ĐỀN')
	`

	var totalActualAmountCNY float64
	var totalActualAmountVND float64
	err := r.db.QueryRow(query, exchangeRate, userID).Scan(&totalActualAmountCNY, &totalActualAmountVND)
	if err != nil {
		return err
	}

	// Dùng totalActualAmountVND đã tính từ query (đã nhân với exchange_rate riêng của từng đơn hàng)
	totalVND := totalActualAmountVND

	// Kiểm tra wallet có tồn tại không
	wallet, err := r.GetWalletByUserID(userID)
	if err != nil {
		return err
	}

	if wallet == nil {
		// Wallet chưa tồn tại, tạo mới với tổng từ bet receipts
		wallet = &models.Wallet{
			ID:                "", // Sẽ được generate bởi database
			UserID:            userID,
			TotalReceivedCNY:  totalActualAmountCNY, // Tổng ActualAmountCNY (cong_thuc_nhan_te) từ tất cả bet receipts có status = DONE
			TotalWithdrawnCNY: 0,
			TotalReceivedVND:  totalVND,
			TotalDepositVND:   0,
			TotalWithdrawnVND: 0,
			CurrentBalanceVND: totalVND, // Số dư = tổng nhận (chưa có cọc và rút)
		}
		return r.CreateWallet(wallet)
	}

	// Wallet đã tồn tại, update với tổng mới từ bet receipts
	// TotalReceivedCNY = tổng ActualAmountCNY (cong_thuc_nhan_te) từ tất cả bet receipts có status = "DONE", "HỦY BỎ", hoặc "ĐỀN"
	// (ĐỀN có ActualAmountCNY âm nên sẽ tự động trừ đi khi tính tổng)
	// ActualReceivedCNY (tien_keo_web_thuc_nhan_te) và CompensationCNY (tien_den_te) chỉ dùng để hiển thị, không dùng để tính wallet
	// Lưu ý: Chỉ update tong_cong_thuc_nhan_te và tong_cong_thuc_nhan_vnd
	// Các trường khác (tong_coc_vnd, tong_da_rut_vnd) giữ nguyên
	updateQuery := `
		UPDATE tien_keo
		SET 
			tong_cong_thuc_nhan_te = $1,
			tong_cong_thuc_nhan_vnd = $2,
			so_du_hien_tai_vnd = $2 + tong_coc_vnd - tong_da_rut_vnd,
			thoi_gian_cap_nhat = NOW()
		WHERE id_nguoi_dung = $3
	`

	_, err = r.db.Exec(updateQuery, totalActualAmountCNY, totalVND, userID)
	return err
}

// AddToTotalDepositVND cộng thêm vào tong_coc_vnd và tính lại so_du_hien_tai_vnd
// Khi nạp tiền (deposit), CHỈ cộng vào tong_coc_vnd, KHÔNG cộng vào tong_cong_thuc_nhan_vnd
// tong_cong_thuc_nhan_vnd chỉ được cập nhật khi bet receipt chuyển sang DONE hoặc HỦY BỎ
func (r *WalletRepository) AddToTotalDepositVND(userID string, amountVND float64) error {
	// Kiểm tra wallet có tồn tại không
	wallet, err := r.GetWalletByUserID(userID)
	if err != nil {
		return err
	}

	if wallet == nil {
		// Wallet chưa tồn tại, tạo mới
		wallet = &models.Wallet{
			ID:                "", // Sẽ được generate bởi database
			UserID:            userID,
			TotalReceivedCNY:  0,
			TotalWithdrawnCNY: 0,
			TotalReceivedVND:  0, // tong_cong_thuc_nhan_vnd = 0 (chưa có bet receipt DONE)
			TotalDepositVND:   amountVND,
			TotalWithdrawnVND: 0,
			CurrentBalanceVND: amountVND, // Số dư = tong_coc_vnd (vì chưa có tong_cong_thuc_nhan_vnd và tong_da_rut_vnd)
		}
		return r.CreateWallet(wallet)
	}

	// Wallet đã tồn tại, update
	// CHỈ cộng vào tong_coc_vnd, KHÔNG cộng vào tong_cong_thuc_nhan_vnd
	// so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + tong_coc_vnd - tong_da_rut_vnd
	// Trong PostgreSQL, khi SET nhiều cột, các giá trị được tính từ giá trị CŨ
	// Vì vậy cần tính: so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + (tong_coc_vnd + $1) - tong_da_rut_vnd
	updateQuery := `
		UPDATE tien_keo
		SET 
			tong_coc_vnd = tong_coc_vnd + $1,
			so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + (tong_coc_vnd + $1) - tong_da_rut_vnd,
			thoi_gian_cap_nhat = NOW()
		WHERE id_nguoi_dung = $2
	`

	_, err = r.db.Exec(updateQuery, amountVND, userID)
	return err
}

// AddToTotalWithdrawnVND cộng thêm vào tong_da_rut_vnd và tính lại so_du_hien_tai_vnd
// tong_da_rut_vnd = tong_da_rut_vnd + amountVND
// so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + tong_coc_vnd - tong_da_rut_vnd (tính lại)
func (r *WalletRepository) AddToTotalWithdrawnVND(userID string, amountVND float64) error {
	// Kiểm tra wallet có tồn tại không
	wallet, err := r.GetWalletByUserID(userID)
	if err != nil {
		return err
	}

	if wallet == nil {
		// Wallet chưa tồn tại, tạo mới với số dư âm (cho phép rút tiền ngay cả khi chưa có wallet)
		wallet = &models.Wallet{
			ID:                "", // Sẽ được generate bởi database
			UserID:            userID,
			TotalReceivedCNY:  0,
			TotalWithdrawnCNY: 0,
			TotalReceivedVND:  0,
			TotalDepositVND:   0,
			TotalWithdrawnVND: amountVND, // Số tiền rút đầu tiên
			CurrentBalanceVND: -amountVND, // Số dư âm (cho phép rút tiền vượt quá số dư)
		}
		return r.CreateWallet(wallet)
	}

	// Wallet đã tồn tại, update
	// tong_da_rut_vnd = tong_da_rut_vnd + amountVND
	// so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + tong_coc_vnd - (tong_da_rut_vnd + amountVND) (tính lại với giá trị mới)
	// Trong PostgreSQL, khi SET nhiều cột, các giá trị được tính từ giá trị CŨ của các cột
	// Vì vậy cần trừ trực tiếp: so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + tong_coc_vnd - (tong_da_rut_vnd + $1)
	updateQuery := `
		UPDATE tien_keo
		SET 
			tong_da_rut_vnd = tong_da_rut_vnd + $1,
			so_du_hien_tai_vnd = tong_cong_thuc_nhan_vnd + tong_coc_vnd - (tong_da_rut_vnd + $1),
			thoi_gian_cap_nhat = NOW()
		WHERE id_nguoi_dung = $2
	`

	_, err = r.db.Exec(updateQuery, amountVND, userID)
	return err
}

// RecalculateWallet tính toán lại wallet từ dữ liệu thực tế trong database
// Method này hữu ích khi cần đồng bộ lại wallet sau khi xóa/sửa trực tiếp trong database
// Tổng hợp từ:
// - tong_coc_vnd: SUM từ lich_su_nop_tien
// - tong_da_rut_vnd: SUM từ lich_su_rut_tien
// - tong_cong_thuc_nhan_vnd: tính từ thong_tin_nhan_keo (status = DONE)
// - so_du_hien_tai_vnd: tính lại từ công thức
// exchangeRate: Tỷ giá VND/CNY (mặc định 3550)
func (r *WalletRepository) RecalculateWallet(userID string, exchangeRate float64) error {
	// 1. Tính tổng từ deposits (lich_su_nop_tien)
	var totalDepositVND float64
	depositQuery := `
		SELECT COALESCE(SUM(so_tien_coc_vnd), 0)
		FROM lich_su_nop_tien
		WHERE id_nguoi_dung = $1
	`
	err := r.db.QueryRow(depositQuery, userID).Scan(&totalDepositVND)
	if err != nil {
		return err
	}

	// 2. Tính tổng từ withdrawals (lich_su_rut_tien)
	var totalWithdrawnVND float64
	withdrawalQuery := `
		SELECT COALESCE(SUM(so_tien_rut_vnd), 0)
		FROM lich_su_rut_tien
		WHERE id_nguoi_dung = $1
	`
	err = r.db.QueryRow(withdrawalQuery, userID).Scan(&totalWithdrawnVND)
	if err != nil {
		return err
	}

	// 3. Tính tổng từ bet receipts (thong_tin_nhan_keo) - chỉ tính những cái có status = DONE, HỦY BỎ, ĐỀN
	// Dùng tỷ giá riêng của từng đơn hàng
	var totalReceivedCNY float64
	var totalReceivedVND float64
	betReceiptQuery := `
		SELECT 
			COALESCE(SUM(cong_thuc_nhan_te), 0) as total_cny,
			COALESCE(SUM(cong_thuc_nhan_te * COALESCE(exchange_rate, $1)), 0) as total_vnd
		FROM thong_tin_nhan_keo
		WHERE id_nguoi_dung = $2 AND tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')
	`
	err = r.db.QueryRow(betReceiptQuery, exchangeRate, userID).Scan(&totalReceivedCNY, &totalReceivedVND)
	if err != nil {
		return err
	}

	// 5. Tính lại current balance
	currentBalanceVND := totalReceivedVND + totalDepositVND - totalWithdrawnVND

	// 6. Kiểm tra wallet có tồn tại không
	wallet, err := r.GetWalletByUserID(userID)
	if err != nil {
		return err
	}

	if wallet == nil {
		// Wallet chưa tồn tại, tạo mới
		wallet = &models.Wallet{
			ID:                "",
			UserID:            userID,
			TotalReceivedCNY:  totalReceivedCNY,
			TotalWithdrawnCNY: 0, // Chưa có field này trong withdrawals
			TotalReceivedVND:  totalReceivedVND,
			TotalDepositVND:   totalDepositVND,
			TotalWithdrawnVND: totalWithdrawnVND,
			CurrentBalanceVND: currentBalanceVND,
		}
		return r.CreateWallet(wallet)
	}

	// 7. Update wallet với các giá trị đã tính lại
	updateQuery := `
		UPDATE tien_keo
		SET 
			tong_cong_thuc_nhan_te = $1,
			tong_cong_thuc_nhan_vnd = $2,
			tong_coc_vnd = $3,
			tong_da_rut_vnd = $4,
			so_du_hien_tai_vnd = $5,
			thoi_gian_cap_nhat = NOW()
		WHERE id_nguoi_dung = $6	
	`

	_, err = r.db.Exec(updateQuery, totalReceivedCNY, totalReceivedVND, totalDepositVND, totalWithdrawnVND, currentBalanceVND, userID)
	return err
}

// GetTotalCurrentBalanceVND tính tổng so_du_hien_tai_vnd từ tất cả wallets
// Chỉ tính cho users có vai_tro = 'user'
func (r *WalletRepository) GetTotalCurrentBalanceVND() (float64, error) {
	query := `
		SELECT COALESCE(SUM(COALESCE(tk.so_du_hien_tai_vnd, 0)), 0) as total_current_balance_vnd
		FROM nguoi_dung nd
		LEFT JOIN tien_keo tk ON tk.id_nguoi_dung = nd.id
		WHERE nd.vai_tro = 'user'
	`

	var total float64
	err := r.db.QueryRow(query).Scan(&total)
	if err != nil {
		return 0, err
	}

	return total, nil
}
