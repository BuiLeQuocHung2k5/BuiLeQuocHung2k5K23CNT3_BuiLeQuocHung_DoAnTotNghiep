CREATE DATABASE IF NOT EXISTS libriflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE libriflow;

CREATE TABLE IF NOT EXISTS VaiTro (
 role_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(50) NOT NULL UNIQUE,
 description VARCHAR(255),
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS QuyenHan (
 permission_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL UNIQUE,
 description VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS NguoiDung (
 user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE,
 password VARCHAR(255) NOT NULL,
 phone VARCHAR(20),
 avatar VARCHAR(255),
 status ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS NguoiDung_VaiTro (
 user_id BIGINT UNSIGNED NOT NULL,
 role_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY (user_id, role_id),
 CONSTRAINT fk_ndvt_user FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_ndvt_role FOREIGN KEY (role_id) REFERENCES VaiTro(role_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS VaiTro_QuyenHan (
 role_id BIGINT UNSIGNED NOT NULL,
 permission_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY (role_id, permission_id),
 CONSTRAINT fk_vtqh_role FOREIGN KEY (role_id) REFERENCES VaiTro(role_id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_vtqh_permission FOREIGN KEY (permission_id) REFERENCES QuyenHan(permission_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS DanhMuc (
 category_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL UNIQUE,
 description TEXT,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS BoSach (
 series_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 series_name VARCHAR(200) NOT NULL,
 description TEXT,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_bosach_name (series_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Sach (
 book_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 category_id BIGINT UNSIGNED NULL,
 series_id BIGINT UNSIGNED NULL,
 isbn VARCHAR(20) NULL UNIQUE,
 title VARCHAR(255) NOT NULL,
 author VARCHAR(150) NOT NULL,
 publisher VARCHAR(150),
 description TEXT,
 publication_year SMALLINT UNSIGNED,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_sach_category FOREIGN KEY (category_id) REFERENCES DanhMuc(category_id) ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT fk_sach_series FOREIGN KEY (series_id) REFERENCES BoSach(series_id) ON DELETE SET NULL ON UPDATE CASCADE,
 INDEX idx_sach_title (title),
 INDEX idx_sach_author (author)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS BanSaoSach (
 copy_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 book_id BIGINT UNSIGNED NOT NULL,
 barcode VARCHAR(50) NOT NULL UNIQUE,
 condition_status ENUM('good','damaged') NOT NULL DEFAULT 'good',
 availability_status ENUM('available','borrowed','lost','maintenance') NOT NULL DEFAULT 'available',
 note TEXT,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_bansao_sach FOREIGN KEY (book_id) REFERENCES Sach(book_id) ON DELETE RESTRICT ON UPDATE CASCADE,
 INDEX idx_bansao_book (book_id),
 INDEX idx_bansao_status (condition_status, availability_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS PhieuMuon (
 borrow_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 borrow_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 due_date DATETIME NOT NULL,
 status ENUM('borrowed','partially_returned','returned','overdue','cancelled') NOT NULL DEFAULT 'borrowed',
 note TEXT,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_phieumuon_user FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
 INDEX idx_phieumuon_user (user_id),
 INDEX idx_phieumuon_due (due_date, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ChiTietPhieuMuon (
 borrow_detail_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 borrow_id BIGINT UNSIGNED NOT NULL,
 copy_id BIGINT UNSIGNED NOT NULL,
 returned_at DATETIME NULL,
 condition_before ENUM('good','damaged') NOT NULL DEFAULT 'good',
 condition_after ENUM('good','damaged') NULL,
 status ENUM('borrowed','returned','lost') NOT NULL DEFAULT 'borrowed',
 note TEXT,
 CONSTRAINT fk_ctpm_borrow FOREIGN KEY (borrow_id) REFERENCES PhieuMuon(borrow_id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_ctpm_copy FOREIGN KEY (copy_id) REFERENCES BanSaoSach(copy_id) ON DELETE RESTRICT ON UPDATE CASCADE,
 INDEX idx_ctpm_borrow (borrow_id),
 INDEX idx_ctpm_copy (copy_id),
 INDEX idx_ctpm_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS QuyDinhPhat (
 fine_rule_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 rule_type ENUM('late','damage','lost') NOT NULL,
 amount DECIMAL(12,2) NOT NULL,
 unit ENUM('per_day','fixed') NOT NULL DEFAULT 'fixed',
 description VARCHAR(255),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT chk_qdphat_amount CHECK (amount >= 0),
 INDEX idx_qdphat_type (rule_type, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Phat (
 fine_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 borrow_detail_id BIGINT UNSIGNED NOT NULL,
 fine_rule_id BIGINT UNSIGNED NULL,
 fine_type ENUM('late','damage','lost','other') NOT NULL,
 amount DECIMAL(12,2) NOT NULL,
 reason VARCHAR(255),
 assessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 payment_status ENUM('unpaid','paid','waived') NOT NULL DEFAULT 'unpaid',
 paid_at DATETIME NULL,
 CONSTRAINT fk_phat_detail FOREIGN KEY (borrow_detail_id) REFERENCES ChiTietPhieuMuon(borrow_detail_id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_phat_rule FOREIGN KEY (fine_rule_id) REFERENCES QuyDinhPhat(fine_rule_id) ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT chk_phat_amount CHECK (amount >= 0),
 INDEX idx_phat_detail (borrow_detail_id),
 INDEX idx_phat_payment (payment_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS LichSuSuDung (
 usage_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 copy_id BIGINT UNSIGNED NULL,
 action_type VARCHAR(50) NOT NULL,
 action_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 details JSON NULL,
 CONSTRAINT fk_lssd_user FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_lssd_copy FOREIGN KEY (copy_id) REFERENCES BanSaoSach(copy_id) ON DELETE SET NULL ON UPDATE CASCADE,
 INDEX idx_lssd_user_date (user_id, action_date),
 INDEX idx_lssd_action_date (action_type, action_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS DuBaoTanSuat (
 forecast_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 forecast_date DATE NOT NULL,
 predicted_count DECIMAL(12,2) NOT NULL,
 model_version VARCHAR(50),
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_dbts_user FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT chk_dbts_count CHECK (predicted_count >= 0),
 INDEX idx_dbts_user_date (user_id, forecast_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS NhatKyHeThong (
 log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NULL,
 action VARCHAR(100) NOT NULL,
 description TEXT,
 ip_address VARCHAR(45),
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_nkht_user FOREIGN KEY (user_id) REFERENCES NguoiDung(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
 INDEX idx_nkht_created (created_at)
) ENGINE=InnoDB;
