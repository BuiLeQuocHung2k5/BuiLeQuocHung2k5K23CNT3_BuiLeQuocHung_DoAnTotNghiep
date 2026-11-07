# LibriFlow Backend — MySQL

Backend kết nối trực tiếp tới MySQL Server bằng `mysql2/promise`. MySQL Workbench dùng để quản lý cùng server và schema đó.

Backend có JWT/RBAC, vẫn chỉ dùng phát triển cục bộ và chưa sẵn sàng production. Server chỉ bind `127.0.0.1`; không mở public API. Chỉ kiểm thử các thao tác ghi trên database thử nghiệm độc lập, không dùng database chính. Từ TASK-015, đăng nhập thành công cũng ghi lịch sử sử dụng; không dùng login trên DB chính để smoke test chỉ đọc.

## Integration test MySQL độc lập (TASK-013)

TASK-013 đạt 98/98 unit/safety; TASK-014 bổ sung kiểm thử phạt/quá hạn (kết quả mới nhất bên dưới). Integration thật hiện **CHƯA CHẠY** vì thiếu cấu hình TEST_DB_*. `npm.cmd run test:integration` từ chối chạy trước kết nối/ghi khi không đủ guard; không tự dùng libriflow, tạo database hoặc chạy setup.

Hai lệnh riêng: `npm.cmd run test:integration:setup` chỉ chuẩn bị database test đã tồn tại/trống; `npm.cmd run test:integration` chạy 15 scenario MySQL thật sau khi xác minh allowlist tên DB, UUID khác instance chính, account chỉ có quyền test-schema, marker/fingerprint và DATABASE() thực tế. Không sửa `.env`, không fallback pool chính, không cleanup dữ liệu. [Hướng dẫn cấu hình và kiểm thử](docs/integration-tests.md).

`src/app-factory.js` nhận database tường minh cho tất cả model/health, không import cấu hình DB; `src/app.js` tiếp tục là wrapper cấu hình ứng dụng. Không thay đổi endpoint hoặc nghiệp vụ mượn/trả trong task này.

## Xác thực và phân quyền

`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`. Đăng ký chỉ gán reader theo seed; mật khẩu bcrypt cost 12; JWT HS256 có hạn 15 phút, chỉ chứa định danh và claim chuẩn. Middleware đọc lại status/roles/permissions từ DB mỗi request. Logout stateless yêu cầu client xóa token, không thu hồi token trên server.

Cấu hình `JWT_SECRET` ngẫu nhiên tối thiểu 32 byte trong môi trường server; không có secret mặc định. Không sửa `.env` thật trong task này. Thiếu cấu hình: auth trả 503 an toàn, public health/GET sách vẫn chạy. Cách tạo secret không in giá trị, request/response và Postman: [Auth API](docs/auth-api.md).

## Danh mục và bản sao sách (TASK-010, 2026-11-06)

- `GET /api/categories`, `GET /api/categories/:id`: danh mục public, có phân trang/tìm kiếm.
- `POST /api/categories`, `PUT/DELETE /api/categories/:id`: từ TASK-011 yêu cầu Bearer + category_manage. Seed gán cho admin/librarian, không gán reader; thiếu token 401, thiếu quyền DB 403 kể cả admin. Migration `sql/migrations/001_add_category_manage.sql` đã tạo nhưng **chưa chạy trên DB thật**, không tự cấp quyền khi startup. [Hướng dẫn danh mục](docs/categories-api.md), [migration thủ công](sql/README.md).
- `GET /api/book-copies`, `GET /api/book-copies/:id`, `GET /api/books/:id/copies`: public, phân trang/lọc, ẩn note nội bộ.
- `POST /api/book-copies`, `PUT/DELETE /api/book-copies/:id`: Bearer + copy_manage, quyền có trong seed cho admin/librarian. Chặn sửa/xóa bản sao borrowed/lost/lượt mượn chưa hoàn tất; chặn xóa mọi lịch sử mượn/sử dụng; không chuyển bản sao sang sách khác. Chuyển trạng thái mượn/trả dành cho module sau. [Hướng dẫn bản sao](docs/book-copies-api.md).

TASK-013 đạt 98/98 unit/safety, TASK-014 giữ nguyên các test đó; không thêm dependency. Chỉ thử ghi trên mock hoặc database thử nghiệm độc lập; không thử trên MySQL chính. Schema/SQL gốc giữ nguyên; seed được bổ sung category_manage theo TASK-011, không thay quyền cũ. Chưa kiểm thử chạy migration lặp lại trên MySQL độc lập; DB chính chưa có quyền này tại lần SELECT xác minh TASK-011 ngày 2026-11-06.

## Mượn và trả sách (TASK-012)

- `POST /api/borrows`: Bearer + borrow_manage, lập phiếu cho người mượn active với 1–100 copy available/good; transaction khóa copy theo thứ tự ID, một mục sai rollback toàn bộ.
- `GET /api/borrows`, `GET /api/borrows/:id`: Bearer; borrow_manage xem toàn bộ, reader không có quyền đó chỉ xem phiếu của chính mình bằng WHERE user_id lấy từ JWT, không tin query user_id.
- `POST /api/borrows/:id/return`: Bearer + return_process; trả một phần hoặc toàn bộ phần chưa trả, cập nhật detail/copy/header cùng transaction. Trả damaged chuyển copy maintenance; không tạo tiền phạt, xóa lịch sử, xử lý lost hoặc tự đánh dấu overdue.

Schema/seed không đổi; quyền mượn/trả đã có cho admin/librarian trong DB. Không sửa `.env`, không chạy ghi trên DB chính. Tại mốc TASK-012 đạt 89/89 và TASK-013 đạt 98/98; kết quả hiện tại xem TASK-015 bên dưới, integration thật chưa chạy. Xem [API mượn/trả và Postman](docs/borrows-api.md) về request, UTC DATETIME, khóa, rollback và các ca fail-closed.

## Quá hạn và tiền phạt (TASK-014, 2026-11-07)

- `GET /api/overdues`, `GET /api/borrows/:id/overdue`: JWT; borrow_manage đọc toàn bộ, reader chỉ đọc của mình. Quá hạn tính theo hạn trả UTC và chi tiết borrowed/chưa trả; GET không sửa trạng thái.
- `GET /api/fines`, `GET /api/fines/:id`: JWT; fine_manage đọc toàn bộ, reader chỉ đọc của mình. List có phân trang/lọc.
- `POST /api/fines`, `PATCH /api/fines/:id/payment`: bắt buộc fine_manage thực tế từ DB. Tạo chỉ nhận borrow_detail_id, fine_rule_id và reason; không nhận amount/trạng thái client tự đặt. Thanh toán chỉ nhận `{"payment_status":"paid"}` và lấy thời gian server.

Chỉ chốt phạt sau khi trả bản sao: late/per_day tính ceil(số giây trễ / 86400) × mức tiền cấu hình, late/fixed một lần; damage/fixed cần good → damaged. Dùng tiền thập phân chính xác, transaction/khóa để chặn phạt trùng và thanh toán lặp. Chưa tạo phạt lost/other hoặc miễn/giảm. Luồng trả sách không tự tạo phạt, không cron, không sửa schema/seed.

SELECT ngày 2026-11-07: fine_manage có cho admin/librarian, **QuyDinhPhat chưa có dữ liệu**. API tạo phạt từ chối rule không tồn tại/inactive/không hỗ trợ; không tự đặt mức tiền hoặc thêm dữ liệu. Múi giờ legacy và chính sách tiền tệ cần xác minh trước vận hành.

Tại mốc TASK-014, `npm.cmd test`: **126/126 đạt** (98 cũ + 28 mới). Cú pháp và diff-check đạt; 6 SELECT mới đã probe trên MySQL không trả bản ghi nghiệp vụ. Ghi/rollback/cạnh tranh chỉ kiểm thử mock, **chưa chạy MySQL integration**. Không thêm dependency, không sửa `.env`, không ghi DB chính. [Tiền phạt và Postman](docs/fines-api.md), [Quá hạn và Postman](docs/overdues-api.md).

## Lịch sử và thống kê (TASK-015, 2026-11-07)

`GET /api/usage-history`, `GET /api/usage-history/me`: JWT, reader chỉ own; report_view được xem toàn bộ, /me luôn own kể cả admin. Lọc ngày UTC/action_type, phân trang limit tối đa 100; không trả details JSON hoặc hồ sơ riêng tư. `GET /api/statistics/overview`, `/api/statistics/borrows`, `/api/statistics/users` bắt buộc report_view thực tế từ DB. Khoảng ngày mặc định 30 ngày, tối đa 366; mượn nhóm ngày/tuần/tháng, user có phân trang. GET không ghi log và chỉ SELECT số liệu thật.

Ghi event login sau khi xác thực/ký JWT thành công; borrow/return theo từng bản sao cho người mượn, cùng transaction nghiệp vụ. Ghi lịch sử lỗi sẽ rollback mượn/trả hoặc từ chối login; không ghi token/mật khẩu/ghi chú tùy ý. Không có API POST event công khai. Không sửa seed/schema hoặc ghi DuBaoTanSuat/NhatKyHeThong.

Mục tiêu dự báo đề xuất: **số phiếu mượn/người/ngày**, phân biệt số phiếu và số bản sao; active_days là chỉ số phụ từ log mới, không phải lượt đến thư viện. Chưa triển khai mô hình hoặc dữ liệu dự báo.

`npm.cmd test`: **150/150 đạt** (126 cũ + 24 mới), cú pháp 65 file đạt. SELECT overview/borrow series thật trả count 0/series rỗng; 7 SELECT probe khác đạt cú pháp không trả bản ghi nghiệp vụ. Ghi/rollback chỉ test mock; MySQL integration vẫn chưa chạy. [Lịch sử/Postman](docs/usage-history-api.md), [Thống kê/Postman](docs/statistics-api.md), [Thiết kế dữ liệu dự báo](docs/forecast-data-design.md).

## Module sách

`routes → controllers → services → models` xử lý lần lượt định tuyến, HTTP/validation, kết quả nghiệp vụ và truy vấn pool. `middlewares/error-handler.js` chuẩn hóa lỗi; `utils/book-validation.js` kiểm tra dữ liệu theo `sql/schema.sql`.

- `GET /api/books` (cả trailing slash): danh sách, `page`, `limit`, `search` theo title/author/publisher.
- `GET /api/books/:id`: chi tiết.
- `POST /api/books`: tạo sách, cần Bearer + book_create.
- `PUT /api/books/:id`: cần book_update; thay thế đầy đủ, bắt buộc title/author; trường tùy chọn bị bỏ qua thành null.
- `DELETE /api/books/:id`: cần book_delete; chặn xóa khi có bản sao/dữ liệu liên quan, không cascade.

Hướng dẫn request/response, validation và quy trình Postman: [API sách](docs/books-api.md).

Kiểm thử tự động không ghi vào MySQL: `npm.cmd test` (Node.js 22 trở lên; môi trường xác minh Node.js 24). Module auth dùng bcryptjs, jsonwebtoken, express-rate-limit (đã ghi package-lock.json). `npm.cmd run db` là alias của `npm.cmd run db:check`; `npm.cmd start` và `npm.cmd run dev` vẫn được giữ.

## Cấu hình

1. Mở connection trong MySQL Workbench. Dùng cùng Hostname, Port và Username cho `DB_HOST`, `DB_PORT`, `DB_USER` trong `.env`.
2. Khi cần dựng database mới và đã xác nhận đúng môi trường, chạy `sql/schema.sql` rồi `sql/seeds/initial-permissions.sql` trong SQL Editor của Workbench. Script đầu tạo database và 16 bảng; script sau khởi tạo vai trò/quyền. Xem [hướng dẫn SQL](sql/README.md) trước khi thực thi. Không chạy lại các script trên database hiện tại để kiểm thử; chúng không phải migration. `sql/create-database.sql` chỉ là script cũ tạo schema trống.
3. Điền mật khẩu MySQL vào `DB_PASSWORD` và tên schema vào `DB_NAME` trong `.env`. Nếu chưa có `.env`, sao chép từ `.env.example`. Đặt mật khẩu trong dấu nháy kép nếu có ký tự `#`. Không commit `.env`.

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD="your_mysql_password"
DB_NAME=libriflow
```

Chạy từ thư mục `Backend`:

```powershell
npm.cmd install
npm.cmd run db:check
npm.cmd run dev
```

Kết nối thành công sẽ in `MySQL connected successfully`. API chỉ bắt đầu lắng nghe sau khi kiểm tra database thành công.

- `GET http://localhost:3000/api/health`: kiểm tra API.
- `GET http://localhost:3000/api/health/db`: kiểm tra database bằng `SELECT 1`; trả HTTP 200 khi kết nối được, HTTP 503 nếu mất kết nối.

## Truy vấn trong Backend

```javascript
import pool from "./config/database.js";

// Dùng tham số để truyền dữ liệu vào truy vấn.
const [rows] = await pool.execute("SELECT ? AS value", ["LibriFlow"]);
```

## Lỗi thường gặp

- `ER_ACCESS_DENIED_ERROR`: kiểm tra username và mật khẩu.
- `ER_BAD_DB_ERROR`: tạo schema hoặc sửa `DB_NAME` theo schema hiện có.
- `ECONNREFUSED`: kiểm tra dịch vụ MySQL đang chạy, hostname và port.

Các biến môi trường đã được đặt ngoài ứng dụng được ưu tiên hơn `.env`. Đường dẫn `.env` được xác định theo vị trí module nên cũng có thể chạy `node Backend/src/server.js` từ thư mục gốc dự án.
