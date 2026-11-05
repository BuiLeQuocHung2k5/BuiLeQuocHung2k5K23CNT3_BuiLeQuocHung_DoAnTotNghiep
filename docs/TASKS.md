# Theo dõi task

## AUTH-001 — JWT, RBAC và bảo vệ API sách (2026-11-05)
- Trạng thái: hoàn tất code/tài liệu và kiểm thử mô phỏng/đọc thật; không ghi MySQL chính. Đọc đủ tài liệu/source/schema/seed, giữ các thay đổi chưa commit từ SQL-007 và BOOK-001.
- File tạo: `Backend/src/routes/auth.routes.js`, `controllers/auth.controller.js`, `services/auth.service.js`, `models/auth.model.js`, `middlewares/auth.js`, `utils/auth-validation.js`, `utils/jwt.js` (đường dẫn rút gọn đều dưới Backend/src); `Backend/test/auth.test.js`, `Backend/docs/auth-api.md`.
- File sửa: `Backend/src/app.js`, `Backend/src/routes/book.routes.js`, `Backend/src/middlewares/error-handler.js`, `Backend/test/books.test.js`, `Backend/.env.example`, `Backend/package.json`, `Backend/package-lock.json`, `Backend/README.md`, `Backend/docs/books-api.md` và 5 tài liệu trong `docs/`. Không sửa `.env`, schema, seed, SQL gốc hoặc Git/remote; không commit/push.
- Triển khai: register reader trong transaction, bcrypt cost 12 (12 ký tự tối thiểu/72 byte tối đa); không nhận role/status; login/me/logout; JWT HS256 15 phút chỉ sub/iat/exp/iss/aud, kiểm tra issuer/audience/algorithm/expiry/subject. Secret chỉ từ môi trường, thiếu hoặc ngắn trả 503 trước lookup/ghi. Authenticate tải lại account status + RBAC từ DB mỗi request, authorize từng quyền seed book_create/book_update/book_delete. GET sách public; logout stateless, không thu hồi server; không refresh token/bảng mới. Login 10 và register 5 request/IP/15 phút, memory store.
- Dependency: thêm bcryptjs 3.0.3, jsonwebtoken 9.0.3, express-rate-limit 8.7.3. Lần npm install sandbox bị chặn mạng (npm ping EACCES), đã dừng tiến trình chờ và cài lại với quyền mạng được duyệt, thành công. Không chạy audit fix --force.
- Kiểm thử: `npm.cmd test` đạt 40/40, dùng bcrypt/JWT/middleware thật với model/connection mô phỏng. Bao phủ đăng ký/hash/reader/duplicate, chặn role injection, password sai/hash không hỗ trợ, JWT hết hạn/sai signature/algorithm/issuer/audience/thiếu expiry, 401/403, từng quyền sách, khóa/xóa account, thay đổi quyền, logout vẫn còn token hợp lệ, config thiếu, login rate limit và regression 25 kiểm thử sách có Bearer.
- Kiểm tra thật chỉ đọc: SELECT metadata 5 bảng RBAC và status enum; SELECT vai trò/quyền xác nhận reader=book_view, librarian create/update nhưng không delete, admin có ba quyền sách. Không đọc người dùng/hash. App thật/DB thật: health/health-db/GET books HTTP 200; me/logout và ba endpoint ghi thiếu token HTTP 401. App smoke test tiêm cấu hình thiếu secret và chặn getConnection: register HTTP 503 trước ghi. Đã dừng server/đóng pool. `npm run db` kết nối thành công.
- Kiểm tra khác: node --check toàn bộ source/test và git diff --check đạt; có cảnh báo LF/CRLF theo config Git. Nội dung schema/seed và hash SQL gốc giữ nguyên. npm audit có 2 moderate dev nodemon/minimatch, các phiên bản giống HEAD; npm audit --omit=dev có 0 cảnh báo.
- Chưa chạy: register/login thành công/CRUD ghi trên MySQL thật hoặc database thử nghiệm độc lập, concurrency unique/FK thật, tải lớn/multi-instance, HTTPS/proxy/production. Không tự sửa hash/tài khoản hoặc seed dữ liệu chính.
- Tồn tại/bước tiếp theo: người vận hành cần cấu hình JWT_SECRET ngẫu nhiên ngoài repo; bộ đếm rate limit reset khi restart; chưa có email verification/reset password/refresh/revocation theo phạm vi. Đề xuất kiểm thử lifecycle auth/RBAC trên DB thử nghiệm độc lập khi được duyệt. Cảnh báo dev dependency để task riêng; không public API.

## BOOK-001 — API quản lý sách (2026-11-05)
- Trạng thái: hoàn tất triển khai module và kiểm thử không phá hủy; CRUD ghi thật chỉ dành cho database thử nghiệm độc lập, chưa thực hiện trong task này.
- Căn cứ: đọc schema.sql, source, package.json và tài liệu bắt buộc; Git ban đầu có các thay đổi từ SQL-007, giữ nguyên. Sach có 7 cột nhập, 2 FK nullable, không UNIQUE/ENUM riêng. SELECT metadata hiện tại xác nhận BanSaoSach.book_id tham chiếu Sach.
- File tạo: `Backend/src/routes/book.routes.js`, `controllers/book.controller.js`, `services/book.service.js`, `models/book.model.js`, `middlewares/error-handler.js`, `utils/http-error.js`, `utils/book-validation.js` (các đường dẫn rút gọn đều dưới Backend/src); `Backend/test/books.test.js`, `Backend/docs/books-api.md`.
- File sửa: `Backend/src/app.js`, `Backend/src/config/database.js`, `Backend/src/server.js`, `Backend/package.json`, `Backend/README.md`, `docs/PROJECT_CONTEXT.md`, `docs/DATABASE.md`, `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/HANDOFF.md`. Không thêm dependency; không sửa .env, schema.sql hoặc SQL gốc. Các file SQL untracked từ task trước không thuộc thay đổi module.
- Hành vi: GET list/detail, POST, PUT thay thế đầy đủ, DELETE; phân trang/search title/author/publisher; SQL có tham số; ID BIGINT trả chuỗi; transaction khóa sách khi sửa/xóa, chặn xóa có bản sao và giữ FK RESTRICT. Middleware trả JSON cho validation, JSON/URL lỗi, FK, UNIQUE, dữ liệu sai và lỗi DB, không lộ SQL/stack. Server bind 127.0.0.1; chưa auth, chỉ phát triển cục bộ. Thêm `db` alias và `test`, giữ start/dev/db:check.
- Kiểm thử tự động: `npm.cmd test` đạt 25/25 (Node test runner; route/controller/service thật với model mô phỏng, model với connection mô phỏng). Bao phủ lifecycle, 404, 400/413/415, ID lớn/Unicode/TEXT, SQL có tham số và escape wildcard, 409, rollback/release khi FK race, update không đổi, ẩn lỗi SQL.
- Kiểm thử thật chỉ đọc: chạy server.js trên cổng loopback tạm, GET health/health-db/list/trailing-slash/phân trang/search ký tự đặc biệt đều 200; detail ID không tồn tại 404, ID lỗi 400. Bảng Sach trống nên chưa có GET detail thành công với dữ liệu thật. `npm.cmd --prefix Backend run db` kết nối thành công. Đã dừng server và đóng pool; không gửi POST/PUT/DELETE tới MySQL chính.
- Kiểm tra khác: node --check toàn bộ src/test đạt, git diff --check đạt (có cảnh báo cấu hình LF/CRLF). Hash bản SQL nguồn và nội dung schema.sql so với DDL gốc không đổi. Không cài thư viện, stage, commit hoặc push.
- Chưa kiểm thử: ghi CRUD trên MySQL độc lập, cạnh tranh nhiều connection thật, nodemon chạy lâu dài, tải lớn và môi trường phân biệt hoa/thường. Không coi mock là kiểm chứng SQL ghi đã thực thi thành công.
- Tồn tại/bước tiếp theo: API chưa có auth, không production; COUNT/list không cùng snapshot khi có ghi đồng thời; giữ PascalCase theo schema. Đề xuất người dùng cho phép chuẩn bị database thử nghiệm riêng để chạy lifecycle CRUD thật. Không tự thực hiện task tiếp theo.

## SQL-007 — Chuẩn hóa SQL và tài liệu database (2026-11-05)
- Trạng thái: hoàn tất phạm vi file/tài liệu và kiểm thử không phá hủy theo yêu cầu; không thực thi schema/seed.
- Căn cứ: ba bản SQL giống nội dung sau chuẩn hóa CRLF/LF; bản trong `Backend/sql` và bản ngoài dự án giống byte (9.285 byte), bản gốc dự án dùng CRLF (9.501 byte). Hash nguồn ghi tại `DATABASE.md`.
- File tạo: `Backend/sql/schema.sql`, `Backend/sql/seeds/initial-permissions.sql`, `Backend/sql/README.md`. File sửa: `Backend/README.md`, `docs/PROJECT_CONTEXT.md`, `docs/DATABASE.md`, `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/HANDOFF.md`. File nguồn `Backend/sql/libriflow_database.sql` đã untracked từ trước task; không ghi đè/xóa các bản gốc.
- Kiểm tra DB: chỉ SELECT metadata qua pool hiện có; MySQL 8.0.40, `lower_case_table_names=1`, 16 bảng/96 cột/16 PK/16 FK/6 UNIQUE/3 CHECK được thực thi/46 chỉ mục. Đối chiếu kiểu, ENUM, NULL, DEFAULT, thứ tự cột, AUTO_INCREMENT, ON UPDATE, charset/collation, khóa, cascade, CHECK và chỉ mục khớp DDL sau chuẩn hóa biểu diễn server. Không thấy trigger/routine/event trong metadata với quyền kết nối hiện tại. Không đọc dữ liệu nghiệp vụ hoặc bản ghi seed.
- Kiểm tra file: SHA-256 ba bản gốc không đổi; kiểm tra tĩnh dấu nháy/ngoặc và tách câu lệnh đạt. 18 câu schema giữ nguyên DDL/USE; 5 INSERT giữ nguyên, seed thêm USE; bỏ SHOW TABLES dùng quan sát. Trình kiểm tra đầu báo 32 dòng trống chưa phân loại; đã rà lại, không có khai báo không rỗng chưa phân loại. Không có parser MySQL độc lập trong PATH; chưa xác nhận cú pháp bằng thực thi.
- Kiểm tra API: app thật trên cổng loopback tạm, `/api/health` và `/api/health/db` đều HTTP 200/JSON đúng; pool kết nối MySQL thật. Đã đóng server/pool sau kiểm thử. `git diff --check` đạt; Git có cảnh báo chuyển LF sang CRLF của README theo cấu hình hiện có.
- Rà SQL tĩnh: chỉ seed bảng vai trò/quyền/liên kết; không thấy dữ liệu người dùng, email thực, token theo mẫu, private key hoặc URL chứa mật khẩu. Không in giá trị `.env`; không sửa source ứng dụng, `.env`, Git hoặc DB.
- Chưa chạy: tạo database mới, schema, seed, migration, đối chiếu bản ghi quyền, thử tải hoặc môi trường phân biệt hoa/thường. Không cài thư viện, commit hoặc push.
- Tồn tại/bước tiếp theo: script khởi tạo chưa phải migration; cần kiểm thử schema/seed trên database thử nghiệm riêng khi được người dùng cho phép rõ ràng. Vấn đề repository lồng nhau và xác nhận push từ các task trước không được xử lý trong phạm vi này.

## RESTORE-001 — Tạo lại thư mục khung backend (2026-11-05)
- Trạng thái: hoàn tất theo yêu cầu người dùng; tạo lại 6 thư mục rỗng `Backend/src/{controllers,middlewares,models,routes,services,utils}` đã xóa ở CLEAN-001.
- File sửa: `docs/TASKS.md`, `docs/HANDOFF.md`; không thêm file vào các thư mục, không sửa source hay DB. Giữ các thay đổi tài liệu chưa commit từ task trước.
- Kiểm tra: cả 6 đường dẫn tồn tại, là thư mục và rỗng; source/SQL không có diff, `git diff --check` đạt. Không chạy ứng dụng/test vì chỉ tạo thư mục rỗng.
- Tồn tại: Git không theo dõi thư mục rỗng; chưa thêm `.gitkeep` vì yêu cầu hiện tại chỉ tạo lại thư mục rỗng.
- Bước tiếp theo: sử dụng các thư mục khi triển khai nghiệp vụ; push của GIT-001 vẫn chờ xác nhận riêng. Không commit hoặc push trong task này.

## CLEAN-001 — Rà soát thư mục thừa (2026-11-05)
- Trạng thái: hoàn tất; xóa 6 thư mục rỗng `Backend/src/{controllers,middlewares,models,routes,services,utils}` sau khi xác minh không có tệp ẩn, không phải liên kết và không được source/cấu hình hiện tại tham chiếu.
- File sửa: `docs/TASKS.md`, `docs/HANDOFF.md`; không xóa tệp source. Các thư mục rỗng không được Git theo dõi nên việc xóa không tạo diff source.
- Kiểm tra: Git ban đầu sạch trên `main` tại `791dee4`; liệt kê thư mục, đọc source và tìm tham chiếu bằng `rg` (không có kết quả); mọi tệp Git theo dõi đều tồn tại. Sau dọn, xác minh 6 thư mục không còn, source/SQL không đổi và `git diff --check` đạt.
- Giữ `Frontend/` rỗng theo bố cục đã thống nhất; giữ `.git`, dependency `Backend/node_modules`, các thư mục chứa source, SQL và tài liệu. Không thấy thư mục trùng `LibriFlow/`.
- Chưa chạy: ứng dụng/test hoặc truy vấn DB vì chỉ xóa thư mục rỗng. Không commit hoặc push.
- Tồn tại/bước tiếp theo: không có vấn đề mới; yêu cầu xác nhận push của GIT-001 vẫn đang chờ, task dọn thư mục không phải xác nhận push.

## GIT-001 — Hợp nhất lịch sử local/GitHub (2026-11-05)
- Trạng thái: đã hoàn tất merge local và fast-forward `main` tới merge commit `fdb7037`; chưa push, chờ người dùng xác nhận.
- Căn cứ ban đầu: `integrate-github`, `main`, `backup-local-main` tại `a7ff7e0`; `MERGE_HEAD` và `origin/main` tại `eded2dd`; merge không có conflict, 17 tệp mới staged.
- Đối chiếu: 16 tệp `LibriFlow/` có blob index giống bản gốc; nội dung working tree giống sau chuẩn hóa CRLF/LF, không có tệp phụ trong thư mục trùng. Giữ nguyên các tệp gốc và SQL.
- File thay đổi trong merge: thêm `.gitignore`, giữ thêm `libriflow_database.sql` từ GitHub; sửa `docs/PROJECT_CONTEXT.md`, `docs/DATABASE.md`, `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/HANDOFF.md`; bỏ 16 bản sao `LibriFlow/` khỏi kết quả hợp nhất.
- Kiểm tra đã chạy: status/remote/staged/refs/log; đọc toàn SQL (DDL và seed vai trò/quyền, không dữ liệu người dùng); rà 17 blob duy nhất trong lịch sử hai nhánh theo mẫu bí mật và đường dẫn nhạy cảm, không phát hiện vấn đề chưa xử lý. Mẫu mật khẩu trong README là placeholder. `.env` và `node_modules` local đã được ignore.
- Kết quả local: `fdb7037` có hai parent `a7ff7e0` và `eded2dd`; `merge-base --is-ancestor` đạt với cả hai lịch sử, `backup-local-main` vẫn ở `a7ff7e0`. `main` đã fast-forward thành công; status sạch sau merge. Toàn bộ 16 tệp gốc còn tồn tại, source và SQL không đổi; cây kết quả có 18 tệp theo dõi. `git diff --cached --check` đạt; các mẫu ignore đã kiểm tra ở gốc và thư mục con, `.env.example` không bị ignore.
- Chưa chạy: SQL, truy vấn DB và kiểm thử ứng dụng vì không sửa logic; chưa push. Không chạy lại fetch trong task này; `origin/main` là bản fetch hiện có, phải kiểm tra remote mới nhất trước push.
- Tồn tại: chưa đối chiếu đầy đủ SQL với DB thực tế; xác nhận push còn chờ người dùng.
- Bước tiếp theo: commit cập nhật bàn giao trên `integrate-github`, fast-forward `main` theo commit tài liệu; xin người dùng xác nhận trước push. Khi được duyệt, kiểm tra remote mới nhất rồi dùng `git push origin main`; nếu remote thay đổi không tương thích, dừng và báo, tuyệt đối không force.

## CTX-001 — Thiết lập chia sẻ ngữ cảnh (2026-11-04)
- Trạng thái: đã tạo tài liệu, chờ người dùng duyệt; chưa được duyệt.
- Phạm vi: khảo sát source/thư mục, đọc metadata database, tạo hướng dẫn và tài liệu bàn giao.
- File tạo: `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/DATABASE.md`, `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/HANDOFF.md`.
- Kiểm tra: Git ban đầu sạch; đọc source backend và cấu trúc frontend; truy vấn metadata chỉ đọc thành công, xác minh 16 bảng cùng PK/FK. Lần gọi Node inline đầu lỗi trích dẫn PowerShell trước khi chạy truy vấn; đã chạy lại qua stdin thành công.
- Kiểm tra tài liệu: đủ sáu tệp, liên kết nội bộ tồn tại, `git diff --check` đạt; Git chỉ liệt kê tài liệu mới, không có thay đổi tệp source đã theo dõi.
- Chưa chạy: server/API HTTP, bộ test ứng dụng (không có script test); task chỉ tạo tài liệu.
- Tồn tại: repo chưa có DDL tạo các bảng thực tế; nghiệp vụ chi tiết và nguồn schema **Chưa xác minh**.
- Bước tiếp theo: người dùng duyệt bộ tài liệu; sau duyệt, nhận task cụ thể và xác minh lại phần liên quan trước khi triển khai.

Task tiếp theo ghi cùng các trường: mã/ngày, trạng thái, phạm vi, file tạo/sửa, kiểm tra và kết quả, phần chưa kiểm tra, tồn tại, bước tiếp theo. Bàn giao mới nhất xem `HANDOFF.md`.
