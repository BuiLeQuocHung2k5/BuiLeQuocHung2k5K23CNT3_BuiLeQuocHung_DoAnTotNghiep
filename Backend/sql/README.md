# Chuẩn bị database LibriFlow

Xác minh ngày 2026-11-05 bằng so sánh file và truy vấn SELECT metadata MySQL 8.0.40. Chưa thực thi các script bên dưới.

## Thứ tự thực thi thủ công

Chỉ dùng khi chủ động dựng một database mới trên môi trường đã chọn; không dùng để cập nhật database đang có.

1. Mở `schema.sql` trong MySQL Workbench, kiểm tra connection và thực thi khi được phép. Script tạo database `libriflow`, chọn database này và tạo 16 bảng cùng khóa, chỉ mục và ràng buộc.
2. Mở `seeds/initial-permissions.sql` trên cùng môi trường và thực thi khi được phép. Script tự chọn `libriflow`, thêm vai trò, quyền và liên kết vai trò–quyền bằng 5 câu `INSERT IGNORE`.
3. Cấu hình các biến `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` trong `Backend/.env`; không đưa giá trị thực vào Git. Từ Backend chạy `npm.cmd run db:check`, sau đó `npm.cmd run dev` và kiểm tra `/api/health/db`.

Hai script cố định tên database `libriflow`; không tự lấy `DB_NAME` từ `.env`. Không tạo tài khoản người dùng, dữ liệu sách hoặc giao dịch. Không phải bản sao lưu dữ liệu nghiệp vụ.

## Nguồn và tính nhất quán

- Nguồn tách: `libriflow_database.sql` trong thư mục này. Giữ nguyên tên bảng, cột, kiểu dữ liệu, PK/FK, hành vi cascade, DEFAULT, ENUM, UNIQUE, CHECK và chỉ mục; giữ nguyên nội dung seed. Chỉ bỏ câu `SHOW TABLES` dùng quan sát ở cuối bản gốc và thêm `USE libriflow` vào seed để chọn đúng schema.
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
