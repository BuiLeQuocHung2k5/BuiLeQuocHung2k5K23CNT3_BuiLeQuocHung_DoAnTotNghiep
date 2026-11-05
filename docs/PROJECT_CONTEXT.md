# Ngữ cảnh dự án

Xác minh source module sách: 2026-11-05; các mục khác giữ phạm vi xác minh đã ghi riêng.

- LibriFlow là đồ án quản lý thư viện theo yêu cầu người dùng; phạm vi nghiệp vụ chi tiết: **Chưa xác minh**.
- `Backend/`: Node.js, ES modules; dùng Express, cors, dotenv, mysql2; nodemon cho phát triển (`Backend/package.json`).
- `Frontend/`: hiện trống, chưa có cấu hình hay source; công nghệ frontend: **Chưa xác minh**.

| Tệp | Trách nhiệm đã xác minh |
| --- | --- |
| `Backend/src/server.js` | Kiểm tra kết nối DB trước khi listen; cổng từ `PORT`, mặc định 3000; xử lý lỗi khởi động. |
| `Backend/src/app.js` | Factory app, middleware CORS/JSON, health, mount router sách và xử lý lỗi tập trung. Cho phép tiêm model mô phỏng khi test. |
| `Backend/src/{routes,controllers,services,models}/*book*` | Module CRUD Sach, phân trang/tìm kiếm, validation và transaction chặn xóa sách có bản sao. Nguồn hợp đồng: `Backend/docs/books-api.md`. |
| `Backend/src/{routes,controllers,services,models}/auth.*.js` | Register reader/login/me/logout, bcrypt, JWT; authenticate/authorize tại `middlewares/auth.js`. Hợp đồng: `Backend/docs/auth-api.md`, xác minh 2026-11-05. |
| `Backend/src/config/database.js` | Nạp `Backend/.env`, tạo MySQL pool; kiểm tra bằng `SELECT 1`. |
| `Backend/src/scripts/check-db.js` | Kiểm tra kết nối, đóng pool, trả exit code 1 nếu thất bại. |
| `Backend/sql/create-database.sql` | Chỉ tạo schema, không tạo bảng. Xem `DATABASE.md`. |
| `Backend/sql/schema.sql`, `Backend/sql/seeds/initial-permissions.sql` | Bản tách DDL 16 bảng và seed phân quyền, đối chiếu metadata ngày 2026-11-05; chưa thực thi. Hướng dẫn: `Backend/sql/README.md`. |
| `libriflow_database.sql` | Tệp từ lịch sử GitHub, kiểm tra ngày 2026-11-05: DDL 16 bảng và seed vai trò/quyền; chưa chạy, chưa đối chiếu đầy đủ với DB thực tế. |

API hiện có (`Backend/src/app.js`):
- `GET /api/health`: HTTP 200, thông báo backend hoạt động.
- `GET /api/health/db`: HTTP 200 khi truy vấn DB thành công, HTTP 503 khi lỗi.
- `GET/POST /api/books`, `GET/PUT/DELETE /api/books/:id`: GET public, ghi cần Bearer + book_create/book_update/book_delete từ DB. Server bind `127.0.0.1`, chỉ phát triển cục bộ.
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`: JWT 15 phút, RBAC đọc DB mỗi request; logout không thu hồi token. JWT_SECRET chỉ từ môi trường, thiếu/yếu cấu hình trả 503; không sửa `.env`.

Lệnh khai báo trong `Backend/package.json` (chạy tại `Backend/`): `npm.cmd start`, `npm.cmd run dev`, `npm.cmd run db:check`, `npm.cmd run db` (alias), `npm.cmd test` (node:test, không ghi vào DB). Chưa có script lint/build. Không thêm dependency cho module sách.

AUTH-001 thêm bcryptjs, jsonwebtoken và express-rate-limit; package-lock đã cập nhật. 40 bài test đạt, không ghi MySQL chính. Nguồn và giới hạn: `TASKS.md`/`Backend/docs/auth-api.md`.

Trạng thái database thực tế và khoảng trống tái tạo schema: `DATABASE.md`. Kết quả kiểm tra và việc còn lại: `TASKS.md`, `HANDOFF.md`.
