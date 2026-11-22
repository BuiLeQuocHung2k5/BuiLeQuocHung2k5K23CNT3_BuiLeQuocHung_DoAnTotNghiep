-- MySQL 8.0, phiên riêng, bật dừng khi lỗi. Chọn clone/demo hoặc sao lưu và thử phục hồi trước.
-- Dừng các writer. SET @fe14_schema='tên_schema_đã_kiểm_tra', @fe14_da_sao_luu=1;
-- Không dùng --force. Nếu SIGNAL: ngắt phiên để nhả khóa, cột cũ vẫn còn.
-- Sau khi xử lý nguyên nhân, chỉ dọn procedure của lần chạy này trước khi chạy lại.
DELIMITER $$
CREATE PROCEDURE fe14_chuyen_isbn()
cong_viec: BEGIN
  DECLARE co_cu INT;
  DECLARE co_moi INT;
  IF NOT (DATABASE() <=> @fe14_schema) OR DATABASE() IS NULL OR COALESCE(@fe14_da_sao_luu,0) <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Can chon dung schema va xac nhan backup hoac clone doc lap';
  END IF;
  SELECT COUNT(*) INTO co_cu FROM information_schema.columns
    WHERE table_schema=DATABASE() AND LOWER(table_name)='bansaosach' AND column_name='isbn';
  SELECT COUNT(*) INTO co_moi FROM information_schema.columns
    WHERE table_schema=DATABASE() AND LOWER(table_name)='sach' AND column_name='isbn';
  IF co_moi=1 THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND LOWER(table_name)='sach'
      AND column_name='isbn' AND column_type='varchar(20)' AND is_nullable='YES')
      OR NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND LOWER(table_name)='sach'
        AND non_unique=0 GROUP BY index_name HAVING COUNT(*)=1 AND MIN(column_name)='isbn' AND MAX(sub_part) IS NULL) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Kiem tra lai kieu va UNIQUE cua Sach.isbn';
    END IF;
    IF co_cu=0 THEN LEAVE cong_viec; END IF;
  ELSEIF co_cu=0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Khong tim thay cot ISBN nguon';
  END IF;

  CREATE TEMPORARY TABLE fe14_gia_tri (book_id BIGINT UNSIGNED NOT NULL, ma VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL);
  IF EXISTS (SELECT 1 FROM BanSaoSach WHERE isbn IS NOT NULL AND NOT REGEXP_LIKE(isbn,'^[0-9Xx -]*$','c')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ISBN cu chua ky tu khong hop le';
  END IF;
  INSERT INTO fe14_gia_tri SELECT book_id,UPPER(REPLACE(REPLACE(isbn,' ',''),'-',''))
    FROM BanSaoSach WHERE isbn IS NOT NULL AND TRIM(isbn)<>'';
  IF EXISTS (SELECT 1 FROM fe14_gia_tri WHERE NOT REGEXP_LIKE(ma,'^([0-9]{9}[0-9X]|97[89][0-9]{10})$','c')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ISBN cu sai dinh dang';
  END IF;
  IF EXISTS (
    WITH RECURSIVE vitri(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM vitri WHERE i<13)
    SELECT ma FROM (SELECT DISTINCT ma FROM fe14_gia_tri) AS ds JOIN vitri ON i<=LENGTH(ma) GROUP BY ma
    HAVING MOD(SUM(IF(SUBSTRING(ma,i,1)='X',10,CAST(SUBSTRING(ma,i,1) AS UNSIGNED))
      * IF(LENGTH(ma)=10,11-i,IF(MOD(i,2)=1,1,3))),IF(LENGTH(ma)=10,11,10)) <> 0
  ) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ISBN cu sai chu so kiem tra'; END IF;
  IF EXISTS (SELECT 1 FROM fe14_gia_tri GROUP BY book_id HAVING COUNT(DISTINCT ma)>1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Xung dot ISBN trong cung dau sach; giu nguyen cot cu';
  END IF;
  IF EXISTS (SELECT 1 FROM fe14_gia_tri GROUP BY ma HAVING COUNT(DISTINCT book_id)>1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Xung dot ISBN giua dau sach/ban sao; giu nguyen cot cu';
  END IF;
  IF co_moi=0 THEN ALTER TABLE Sach ADD COLUMN isbn VARCHAR(20) NULL UNIQUE; END IF;
  IF EXISTS (SELECT 1 FROM fe14_gia_tri JOIN Sach USING(book_id) WHERE Sach.isbn IS NOT NULL AND BINARY Sach.isbn<>BINARY ma) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ISBN dich xung dot; khong ghi de';
  END IF;
  IF EXISTS (SELECT 1 FROM fe14_gia_tri JOIN Sach ON Sach.isbn=ma WHERE Sach.book_id<>fe14_gia_tri.book_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ISBN dich xung dot; khong ghi de';
  END IF;
  UPDATE Sach JOIN fe14_gia_tri USING(book_id) SET Sach.isbn=fe14_gia_tri.ma WHERE Sach.isbn IS NULL;
  IF EXISTS (SELECT 1 FROM BanSaoSach LEFT JOIN Sach ON Sach.book_id=BanSaoSach.book_id
    WHERE BanSaoSach.isbn IS NOT NULL AND TRIM(BanSaoSach.isbn)<>'' AND
    NOT (BINARY Sach.isbn <=> BINARY UPPER(REPLACE(REPLACE(BanSaoSach.isbn,' ',''),'-','')))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Doi chieu that bai; giu cot cua ban sao';
  END IF;
  ALTER TABLE BanSaoSach DROP COLUMN isbn;
  DROP TEMPORARY TABLE fe14_gia_tri;
END$$
DELIMITER ;
LOCK TABLES Sach WRITE, BanSaoSach WRITE;
CALL fe14_chuyen_isbn();
UNLOCK TABLES;
DROP PROCEDURE fe14_chuyen_isbn;
