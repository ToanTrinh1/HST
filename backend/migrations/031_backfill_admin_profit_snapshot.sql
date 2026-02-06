-- Backfill admin_profit_snapshot từ các đơn đã DONE/HỦY BỎ/ĐỀN, dùng config toàn cục (current_exchange_rate).
-- Công thức giống logic Go: khi đơn done/hủy/đền dùng config hiện tại tính một lần rồi lưu.

INSERT INTO admin_profit_snapshot (
    bet_receipt_id,
    admin_id,
    completed_at,
    month,
    status,
    loai_keo,
    tien_keo_te,
    tien_thuc_nhan_te,
    cong_thuc_nhan_te,
    tien_cat_te,
    profit_keo_cny,
    profit_keo_vnd,
    profit_tien_cat_vnd,
    profit_chenh_lech_vnd,
    profit_den_tham_hut_vnd,
    total_profit_vnd
)
SELECT
    ttnk.id,
    ttnk.id_admin_duyet,
    ttnk.thoi_gian_hoan_thanh,
    TO_CHAR(ttnk.thoi_gian_hoan_thanh, 'YYYY-MM'),
    ttnk.tien_do_hoan_thanh,
    ttnk.loai_keo,
    COALESCE(ttnk.tien_keo_web_te, 0),
    COALESCE(ttnk.tien_keo_web_thuc_nhan_te, 0),
    COALESCE(ttnk.cong_thuc_nhan_te, 0),
    COALESCE(ttnk.tien_cat_te, 0),
    -- profit_keo_cny: fee * amount (chỉ DONE, HỦY BỎ) — dùng config toàn cục
    CASE WHEN ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ') THEN
        (CASE WHEN ttnk.loai_keo = 'web' THEN COALESCE(cer.fee_web_pct, 8)/100.0 ELSE COALESCE(cer.fee_external_pct, 7)/100.0 END)
        * (CASE WHEN ttnk.tien_do_hoan_thanh = 'DONE' THEN ttnk.tien_keo_web_te ELSE COALESCE(ttnk.tien_keo_web_thuc_nhan_te, 0) END)
    ELSE 0 END,
    -- profit_keo_vnd
    CASE WHEN ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ') THEN
        (CASE WHEN ttnk.loai_keo = 'web' THEN COALESCE(cer.fee_web_pct, 8)/100.0 ELSE COALESCE(cer.fee_external_pct, 7)/100.0 END)
        * (CASE WHEN ttnk.tien_do_hoan_thanh = 'DONE' THEN ttnk.tien_keo_web_te ELSE COALESCE(ttnk.tien_keo_web_thuc_nhan_te, 0) END)
        * COALESCE(cer.admin_receive_rate, 3850)
    ELSE 0 END,
    -- profit_tien_cat_vnd (HỦY BỎ, ĐỀN)
    CASE WHEN ttnk.tien_do_hoan_thanh IN ('HỦY BỎ', 'ĐỀN') THEN COALESCE(ttnk.tien_cat_te, 0) * COALESCE(cer.admin_receive_rate, 3850) ELSE 0 END,
    -- profit_chenh_lech_vnd (DONE, HỦY BỎ)
    CASE WHEN ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ') THEN (COALESCE(cer.admin_receive_rate, 3850) - COALESCE(cer.exchange_rate, 3550)) * COALESCE(ttnk.cong_thuc_nhan_te, 0) ELSE 0 END,
    -- profit_den_tham_hut_vnd (ĐỀN)
    CASE WHEN ttnk.tien_do_hoan_thanh = 'ĐỀN' THEN (COALESCE(cer.admin_receive_rate, 3850) - COALESCE(cer.exchange_rate, 3550)) * ABS(COALESCE(ttnk.cong_thuc_nhan_te, 0)) ELSE 0 END,
    -- total_profit_vnd
    (
        CASE WHEN ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ') THEN
            (CASE WHEN ttnk.loai_keo = 'web' THEN COALESCE(cer.fee_web_pct, 8)/100.0 ELSE COALESCE(cer.fee_external_pct, 7)/100.0 END)
            * (CASE WHEN ttnk.tien_do_hoan_thanh = 'DONE' THEN ttnk.tien_keo_web_te ELSE COALESCE(ttnk.tien_keo_web_thuc_nhan_te, 0) END)
            * COALESCE(cer.admin_receive_rate, 3850)
        ELSE 0 END
        + CASE WHEN ttnk.tien_do_hoan_thanh IN ('HỦY BỎ', 'ĐỀN') THEN COALESCE(ttnk.tien_cat_te, 0) * COALESCE(cer.admin_receive_rate, 3850) ELSE 0 END
        + CASE WHEN ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ') THEN (COALESCE(cer.admin_receive_rate, 3850) - COALESCE(cer.exchange_rate, 3550)) * COALESCE(ttnk.cong_thuc_nhan_te, 0) ELSE 0 END
        - CASE WHEN ttnk.tien_do_hoan_thanh = 'ĐỀN' THEN (COALESCE(cer.admin_receive_rate, 3850) - COALESCE(cer.exchange_rate, 3550)) * ABS(COALESCE(ttnk.cong_thuc_nhan_te, 0)) ELSE 0 END
    )
FROM thong_tin_nhan_keo ttnk
CROSS JOIN current_exchange_rate cer
WHERE cer.id = 1
  AND ttnk.tien_do_hoan_thanh IN ('DONE', 'HỦY BỎ', 'ĐỀN')
  AND ttnk.thoi_gian_hoan_thanh IS NOT NULL
ON CONFLICT (bet_receipt_id) DO NOTHING;
