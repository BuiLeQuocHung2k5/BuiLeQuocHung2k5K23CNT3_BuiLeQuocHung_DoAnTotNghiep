# Ngữ cảnh dự án

TASK-015 — xác minh 2026-11-07: thêm lịch sử sử dụng và thống kê (Backend/src/{routes,controllers,services,models}/{usage-history,statistics}.*.js, utils/analytics-validation.js). Login thành công ghi một event, mượn/trả ghi mỗi copy cho borrower cùng transaction; lỗi event rollback nghiệp vụ. Không log GET, mật khẩu/JWT/ghi chú. GET usage-history/me luôn own; report_view đọc toàn bộ history/thống kê, reader chỉ own; quyền xác nhận seed + SELECT thực tế. SQL thống kê tách số phiếu/số copy và active_days, range UTC max 366 ngày. 150/150 test đạt (126 cũ + 24 mới), 65 file cú pháp đạt; SELECT overview/series thật count 0/series rỗng và 7 probe SELECT không trả bản ghi nghiệp vụ. Chưa test ghi/rollback MySQL độc lập. Không sửa schema/seed/.env, không ghi DB chính/DuBaoTanSuat/NhatKyHeThong. Hợp đồng: Backend/docs/{usage-history-api,statistics-api,forecast-data-design}.md; bàn giao hiện tại TASK-015 tại HANDOFF.md. Các mục dưới là lịch sử xác minh trước đó.

TASK-014 — xác minh 2026-11-07: thêm module fine/overdue theo Route → Controller → Service → Model, mount trong Backend/src/app-factory.js. JWT cho mọi endpoint; fine_manage quản lý phạt, borrow_manage đọc quá hạn toàn bộ, reader không có quyền quản lý chỉ đọc own qua WHERE SQL. GET không ghi; trả sách giữ nguyên, không auto fine/cron. Chỉ chốt phạt sau trả bằng active rule late fixed/per_day hoặc damage fixed; lost/other/chưa có cấu hình giữ fail-closed. SELECT metadata/quyền/cấu hình xác nhận fine_manage admin/librarian và QuyDinhPhat trống. 126/126 unit/safety đạt (98 cũ + 28 mới), 6 SELECT probe cú pháp thật không trả bản ghi nghiệp vụ; chưa kiểm thử ghi/khóa trên MySQL độc lập. Nguồn/hợp đồng: Backend/docs/fines-api.md, overdues-api.md; bàn giao mới nhất HANDOFF.md. Không sửa schema/seed/.env hoặc ghi DB chính.

TASK-013 — xác minh 2026-11-06: thêm integration/safety.mjs, setup.mjs, run.mjs và scenarios.mjs, npm test:integration/setup, test/integration-safety.test.js. src/app-factory.js bắt buộc database dependency và không import cấu hình DB; app.js giữ wrapper/pool bình thường. 98/98 unit/safety đạt, giữ 89 test cũ. MySQL integration **CHƯA CHẠY**, chưa có TEST_DB_*; preflight từ chối MISSING_TEST_DB_NAME trước kết nối/ghi. Không tạo DB hoặc setup, không sửa .env/schema/seed/Git. Hướng dẫn và 15 scenario thật chưa chạy tại Backend/docs/integration-tests.md. Đây là trạng thái bàn giao mới nhất; các task dưới giữ lịch sử.

TASK-012 — xác minh 2026-11-06: thêm `Backend/src/{routes,controllers,services,models}/borrow.*.js`, `utils/borrow-validation.js`, mount `/api/borrows`. POST lập phiếu cần borrow_manage, POST `/:id/return` cần return_process; GET cần JWT, reader chỉ own và staff có borrow_manage đọc theo quyền. Quyền đã có trong seed/DB, không thêm quyền/schema. Request ghi dùng transaction/khóa copy theo ID; không tạo tiền phạt hoặc xóa lịch sử. 89/89 test đạt (69 cũ + 20 mới); ghi/concurrency chỉ mock, chưa chạy MySQL độc lập. Hợp đồng/Postman/giới hạn UTC và legacy: `Backend/docs/borrows-api.md`. Đây là trạng thái mới nhất; các mục TASK trước bên dưới giữ lịch sử xác minh.

Xác minh source danh mục/bản sao: 2026-11-06; các mục khác giữ phạm vi xác minh đã ghi riêng.

- LibriFlow là đồ án quản lý thư viện theo yêu cầu người dùng; phạm vi nghiệp vụ chi tiết: **Chưa xác minh**.
- `Backend/`: Node.js, ES modules; dùng Express, cors, dotenv, mysql2; nodemon cho phát triển (`Backend/package.json`).
- `Frontend/`: hiện trống, chưa có cấu hình hay source; công nghệ frontend: **Chưa xác minh**.

| Tệp | Trách nhiệm đã xác minh |
| --- | --- |
| `Backend/src/server.js` | Kiểm tra kết nối DB trước khi listen; cổng từ `PORT`, mặc định 3000; xử lý lỗi khởi động. |
| `Backend/src/app.js`, `Backend/src/app-factory.js` | app.js là wrapper pool ứng dụng; factory thuần bắt buộc database dependency cho tất cả model/health, không import database.js. Giữ router/middleware và khả năng tiêm model khi unit test. Integration chỉ dùng factory thuần. |
| `Backend/src/{routes,controllers,services,models}/*book*` | Module CRUD Sach, phân trang/tìm kiếm, validation và transaction chặn xóa sách có bản sao. Nguồn hợp đồng: `Backend/docs/books-api.md`. |
| `Backend/src/{routes,controllers,services,models}/auth.*.js` | Register reader/login/me/logout, bcrypt, JWT; authenticate/authorize tại `middlewares/auth.js`. Hợp đồng: `Backend/docs/auth-api.md`, xác minh 2026-11-05. |
| `Backend/src/config/database.js` | Nạp `Backend/.env`, tạo MySQL pool; kiểm tra bằng `SELECT 1`. |
| `Backend/src/{routes,controllers,services,models}/{category,book-copy}.*.js` | Module danh mục/bản sao, transaction bảo toàn quan hệ/lịch sử; ghi dùng category_manage/copy_manage từ DB. Hướng dẫn: `Backend/docs/{categories,book-copies}-api.md`. |
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

TASK-010 (2026-11-06): thêm GET list/detail categories và book-copies, GET books/:id/copies. GET public, không SELECT hoặc trả note bản sao. Ghi bản sao cần copy_manage; ghi danh mục tạm khóa vì seed/DB không có quyền phù hợp (401 thiếu token, 503 với tài khoản active đã xác thực, không có admin bypass). Tổng 63 test đạt, không thêm dependency. Chỉ SELECT/GET trên DB chính, ghi kiểm thử mock. Chưa kiểm thử ghi/concurrency trên DB độc lập; xem TASKS.md.

TASK-011 (2026-11-06) thay chốt tạm của TASK-010 bằng category_manage: seed thêm quyền cho admin/librarian, reader không đổi; migration additive `Backend/sql/migrations/001_add_category_manage.sql` được tạo, không tự chạy. Code mở POST/PUT/DELETE danh mục với JWT/RBAC; DB chính được SELECT xác nhận chưa có quyền/liên kết, nên vẫn 403 cho người dùng active chưa được cấp quyền (không còn chốt tạm 503). 69/69 test đạt; chưa thực thi migration hoặc ghi trên DB độc lập. Quyền triển khai trên DB chính chưa được cấp trong task này.
