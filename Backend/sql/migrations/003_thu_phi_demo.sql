-- DB-MIGRATION-01. Chạy qua 003_thu_phi_demo.mjs để kiểm tra UUID, backup và trạng thái.
DELIMITER $$
CREATE TABLE libriflow_demo.PhiDuyTriThe (
 card_fee_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 user_id BIGINT UNSIGNED NOT NULL,
 billing_month DATE NOT NULL,
 amount DECIMAL(12,2) NOT NULL DEFAULT 20000.00,
 due_date DATE NOT NULL,
 payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
 PRIMARY KEY (card_fee_id),
 UNIQUE KEY uq_fee_user_month (user_id,billing_month),
 CONSTRAINT fk_fee_user FOREIGN KEY (user_id) REFERENCES libriflow_demo.NguoiDung(user_id) ON DELETE RESTRICT,
 CONSTRAINT chk_fee_month CHECK (DAYOFMONTH(billing_month)=1),
 CONSTRAINT chk_fee_amount CHECK (amount=20000.00),
 CONSTRAINT chk_fee_due CHECK (due_date >= billing_month),
 CONSTRAINT chk_fee_status CHECK (payment_status IN ('unpaid','paid'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$$

CREATE TABLE libriflow_demo.GiaoDichThu (
 collection_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 card_fee_id BIGINT UNSIGNED NULL,
 fine_id BIGINT UNSIGNED NULL,
 amount DECIMAL(12,2) NOT NULL,
 payment_method ENUM('cash','bank_transfer') NOT NULL,
 collected_by BIGINT UNSIGNED NOT NULL,
 collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (collection_id),
 UNIQUE KEY uq_collection_fee (card_fee_id),
 UNIQUE KEY uq_collection_fine (fine_id),
 KEY idx_collection_collector (collected_by),
 CONSTRAINT fk_collection_fee FOREIGN KEY (card_fee_id) REFERENCES libriflow_demo.PhiDuyTriThe(card_fee_id) ON DELETE RESTRICT,
 CONSTRAINT fk_collection_fine FOREIGN KEY (fine_id) REFERENCES libriflow_demo.Phat(fine_id) ON DELETE RESTRICT,
 CONSTRAINT fk_collection_collector FOREIGN KEY (collected_by) REFERENCES libriflow_demo.NguoiDung(user_id) ON DELETE RESTRICT,
 CONSTRAINT chk_collection_source CHECK ((card_fee_id IS NULL) <> (fine_id IS NULL)),
 CONSTRAINT chk_collection_amount CHECK (amount > 0),
 CONSTRAINT chk_collection_method CHECK (payment_method IN ('cash','bank_transfer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$$

-- InnoDB khóa khoản phải thu khi UPDATE. SIGNAL hoàn tác cả INSERT và UPDATE.
CREATE TRIGGER libriflow_demo.trg_collection_settle AFTER INSERT ON libriflow_demo.GiaoDichThu
FOR EACH ROW
BEGIN
 IF NEW.card_fee_id IS NOT NULL THEN
   UPDATE libriflow_demo.PhiDuyTriThe SET payment_status='paid'
     WHERE card_fee_id=NEW.card_fee_id AND payment_status='unpaid' AND amount=NEW.amount;
 ELSE
   UPDATE libriflow_demo.Phat SET payment_status='paid', paid_at=NEW.collected_at
     WHERE fine_id=NEW.fine_id AND payment_status='unpaid' AND paid_at IS NULL AND amount=NEW.amount;
 END IF;
 IF ROW_COUNT() <> 1 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Full payment of one unpaid charge required';
 END IF;
END$$

CREATE TRIGGER libriflow_demo.trg_collection_no_update BEFORE UPDATE ON libriflow_demo.GiaoDichThu
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Posted collection cannot be edited'$$

CREATE TRIGGER libriflow_demo.trg_collection_no_delete BEFORE DELETE ON libriflow_demo.GiaoDichThu
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Posted collection cannot be deleted'$$
DELIMITER ;
