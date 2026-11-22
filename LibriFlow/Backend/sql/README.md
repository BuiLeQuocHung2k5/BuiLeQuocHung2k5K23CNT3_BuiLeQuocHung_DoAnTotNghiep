# Chuẩn bị database LibriFlow

## ISBN đầu sách trong FE-14 · 22/11/2026

Schema khởi tạo hiện đặt ISBN nullable/unique ở `Sach` và giữ barcode unique ở `BanSaoSach`. Các bản SQL gốc là bản lịch sử. Dùng lệnh ở [README gốc](../../README.md) khi chuẩn bị demo.

Database cũ cần mở một phiên riêng trên bản sao độc lập hoặc sau khi đã kiểm tra khả năng phục hồi bản sao lưu. Dừng các tiến trình ghi, chọn đúng schema, bật dừng khi lỗi, kiểm tra `SELECT DATABASE()` và đặt hai biến xác nhận theo đầu file migration. Chạy toàn bộ script trong cùng phiên. Migration khóa hai bảng, kiểm tra checksum, hai chiều xung đột và dữ liệu đích trước khi bỏ cột nguồn. Khi gặp lỗi, đóng phiên để nhả khóa và kiểm tra dữ liệu. Ngày 21/11 đã thử chuyển và chạy lại trên schema thử riêng. Database chính vẫn giữ cấu trúc trước FE-14. [Migration 002](migrations/002_isbn_dau_sach.sql)

Xác minh ngày 2026-11-05 bằng so sánh file và truy vấn SELECT metadata MySQL 8.0.40. Chưa thực thi các script bên dưới.

## Migration 001 — category_manage (TASK-011, 2026-11-06)

`migrations/001_add_category_manage.sql` dành cho database đã có schema và vai trò admin/librarian. Chỉ có transaction và hai INSERT IGNORE: thêm QuyenHan(name, description), rồi tra role_id/permission_id bằng tên để thêm VaiTro_QuyenHan cho admin/librarian. Không cấp cho reader, không tạo role, không UPDATE/DELETE/DDL, không sửa dữ liệu quyền có sẵn. UNIQUE QuyenHan.name và PK ghép VaiTro_QuyenHan(role_id, permission_id) ngăn bản ghi trùng khi chạy lại.

**Chưa thực thi migration trong task này**, kể cả trên database chính. Kiểm tra tĩnh và test code đạt; idempotence bằng việc chạy SQL hai lần trên MySQL độc lập còn chưa xác minh. Không có script tự chạy migration khi khởi động server hoặc npm test.

Khi được phép triển khai thủ công:

1. Mở một phiên SQL riêng trong Workbench, không có transaction dang dở; chọn đúng connection/schema đích. Trước tiên thử trên database thử nghiệm độc lập có cùng schema.
2. Chạy SELECT dưới đây để xác nhận schema đang chọn và hai role bắt buộc. Migration không có USE, không lấy DB_NAME từ .env và không tự chuyển sang database chính.
3. Sau khi xác nhận đúng môi trường và đủ hai role, mở/chạy riêng file migration. Bật dừng khi gặp lỗi; nếu lỗi, rollback transaction trước khi làm tiếp. Không chạy lại toàn bộ schema hoặc seed để cập nhật database đang có.
4. Xem cảnh báo INSERT IGNORE và SELECT xác minh sau chạy. Cần có đúng một quyền category_manage và liên kết với admin/librarian; không tự xóa liên kết bất thường nếu phát hiện. Role thiếu thì dừng, không tự tạo hoặc gán role khác.
5. Chạy lại trên database thử nghiệm, đối chiếu số bản ghi/quyền cũ không đổi. Chỉ triển khai database chính trong một bước riêng được người dùng cho phép; task hiện tại không cho phép bước đó.

```sql
SELECT DATABASE() AS selected_database;
SELECT role_id, name FROM VaiTro WHERE name IN ('admin', 'librarian');
SELECT permission_id, name FROM QuyenHan WHERE name = 'category_manage';
SELECT r.name AS role_name, p.name AS permission_name
FROM VaiTro r
JOIN VaiTro_QuyenHan rp ON rp.role_id = r.role_id
JOIN QuyenHan p ON p.permission_id = rp.permission_id
WHERE p.name = 'category_manage'
ORDER BY r.name;
```

Code category hiện yêu cầu category_manage từ DB. Chưa cài quyền/liên kết thì người dùng đã xác thực vẫn nhận 403 FORBIDDEN, không có fallback admin. Khi quyền được cài đúng, request tiếp theo tự đọc quyền mới, không cần đổi JWT. GET vẫn public.

## Thứ tự thực thi thủ công

Chỉ dùng khi chủ động dựng một database mới trên môi trường đã chọn; không dùng để cập nhật database đang có.

1. Mở `schema.sql` trong MySQL Workbench, kiểm tra connection và thực thi khi được phép. Script tạo database `libriflow`, chọn database này và tạo 16 bảng cùng khóa, chỉ mục và ràng buộc.
2. Mở `seeds/initial-permissions.sql` trên cùng môi trường và thực thi khi được phép. Script tự chọn `libriflow`, thêm vai trò, quyền và liên kết vai trò–quyền bằng 5 câu `INSERT IGNORE`.
3. Cấu hình các biến `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` trong `Backend/.env`; không đưa giá trị thực vào Git. Từ Backend chạy `npm.cmd run db:check`, sau đó `npm.cmd run dev` và kiểm tra `/api/health/db`.

Hai script cố định tên database `libriflow`; không tự lấy `DB_NAME` từ `.env`. Không tạo tài khoản người dùng, dữ liệu sách hoặc giao dịch. Không phải bản sao lưu dữ liệu nghiệp vụ.

## Nguồn và tính nhất quán

- Nguồn tách ban đầu: `libriflow_database.sql` trong thư mục này; schema/SQL gốc vẫn giữ nguyên. TASK-011 chỉ bổ sung category_manage vào seed và danh sách quyền librarian; admin vẫn nhận qua CROSS JOIN, reader không đổi. Seed hiện có 12 quyền, khác bản gốc 11 quyền có chủ đích theo yêu cầu đã duyệt. Không dùng seed hiện tại như bản sao nguyên byte của SQL gốc.
- Ba file gốc ở thư mục cha dự án, gốc dự án và thư mục này có nội dung giống nhau sau khi chuẩn hóa CRLF/LF. Bản gốc dự án dùng CRLF; hai bản còn lại dùng LF. Không sửa hoặc xóa các bản gốc.
- `create-database.sql` là script cũ chỉ tạo database trống; giữ lại để tham chiếu. Không cần chạy trước `schema.sql`.
- Metadata hiện tại: 16 bảng, 96 cột, 16 PK, 16 FK, 6 UNIQUE, 3 CHECK đang được thực thi và 46 chỉ mục kể cả PK/UNIQUE/chỉ mục FK tự sinh. Các thuộc tính đã đối chiếu khớp script sau khi tính đến chuẩn hóa kiểu của MySQL và tên bảng.
- MySQL hiện dùng `lower_case_table_names=1`, nên lưu tên bảng chữ thường dù script dùng PascalCase. Trên hệ thống phân biệt hoa/thường, phải xác minh cách đặt tên trước khi triển khai; chưa kiểm thử môi trường đó.

## Giới hạn

- Yêu cầu MySQL 8.0.16 trở lên để thực thi CHECK; môi trường đã đối chiếu là 8.0.40.
- `IF NOT EXISTS` không sửa cấu trúc bảng đã tồn tại. Đây là script khởi tạo, không phải migration.
- `INSERT IGNORE` không cập nhật quyền đã tồn tại và có thể bỏ qua một số lỗi; cần xem cảnh báo khi thực thi thủ công. Các liên kết quyền được chọn theo tên vai trò/quyền như bản gốc.
- Chưa đối chiếu bản ghi quyền thực tế vì đợt kiểm tra chỉ đọc metadata. Không chạy schema hoặc seed trên database hiện tại để kiểm thử.
- Chưa có bộ phân tích cú pháp MySQL độc lập trong môi trường kiểm tra. Đã kiểm tra tĩnh cách tách câu lệnh, cân bằng dấu nháy/ngoặc và đối chiếu cấu trúc với metadata; chưa xác nhận bằng việc thực thi trên database mới.
