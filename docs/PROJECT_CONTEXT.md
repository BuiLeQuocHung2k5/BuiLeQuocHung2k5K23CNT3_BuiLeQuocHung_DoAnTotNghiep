# Ngữ cảnh dự án

Xác minh: 2026-11-04, qua source và danh sách tệp/thư mục hiện tại.

- LibriFlow là đồ án quản lý thư viện theo yêu cầu người dùng; phạm vi nghiệp vụ chi tiết: **Chưa xác minh**.
- `Backend/`: Node.js, ES modules; dùng Express, cors, dotenv, mysql2; nodemon cho phát triển (`Backend/package.json`).
- `Frontend/`: hiện trống, chưa có cấu hình hay source; công nghệ frontend: **Chưa xác minh**.

| Tệp | Trách nhiệm đã xác minh |
| --- | --- |
| `Backend/src/server.js` | Kiểm tra kết nối DB trước khi listen; cổng từ `PORT`, mặc định 3000; xử lý lỗi khởi động. |
| `Backend/src/app.js` | Middleware CORS, JSON; định nghĩa hai endpoint health. |
| `Backend/src/config/database.js` | Nạp `Backend/.env`, tạo MySQL pool; kiểm tra bằng `SELECT 1`. |
| `Backend/src/scripts/check-db.js` | Kiểm tra kết nối, đóng pool, trả exit code 1 nếu thất bại. |
| `Backend/sql/create-database.sql` | Chỉ tạo schema, không tạo bảng. Xem `DATABASE.md`. |

API hiện có (`Backend/src/app.js`):
- `GET /api/health`: HTTP 200, thông báo backend hoạt động.
- `GET /api/health/db`: HTTP 200 khi truy vấn DB thành công, HTTP 503 khi lỗi.
- Chưa thấy route nghiệp vụ hoặc xác thực trong source đã khảo sát.

Lệnh khai báo trong `Backend/package.json` (chạy tại `Backend/`): `npm.cmd start`, `npm.cmd run dev`, `npm.cmd run db:check`. Chưa có script test, lint hoặc build.

Trạng thái database thực tế và khoảng trống tái tạo schema: `DATABASE.md`. Kết quả kiểm tra và việc còn lại: `TASKS.md`, `HANDOFF.md`.
