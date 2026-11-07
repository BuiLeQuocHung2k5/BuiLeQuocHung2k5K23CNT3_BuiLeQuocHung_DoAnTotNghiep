# Database

## Usage/statistics — xác minh 2026-11-07 (TASK-015)

- Schema.sql và SELECT COLUMNS hiện tại xác nhận LichSuSuDung có usage_id PK, user_id NOT NULL, copy_id nullable, action_type VARCHAR(50), action_date DATETIME, details JSON. Theo FK trong schema đã đối chiếu SQL-007: user CASCADE, copy SET NULL; không có cột actor hoặc FK borrow_id. DuBaoTanSuat/NhatKyHeThong chỉ khảo sát metadata, không đọc/ghi dữ liệu hoặc suy diễn đã có tính năng dự báo/audit.
- Ứng dụng TASK-015 định nghĩa action_type login/borrow/return, details chỉ source/version/borrow_id do service tạo. Mượn/trả dùng connection/transaction cũ, lỗi history rollback toàn batch; login chỉ trả token sau INSERT thành công. GET không ghi event. Không tự backfill hoặc mở POST ghi sự kiện từ client; response không SELECT details JSON legacy.
- SELECT tên role-permission xác nhận report_view/forecast_view cho admin/librarian. Dùng report_view xem toàn bộ history/thống kê, reader own theo SQL và /me luôn own. Không thêm quyền/seed. Stats user đếm activity chỉ event có cấu trúc source=libriflow-api/version=1; đếm phiếu từ PhieuMuon độc lập, không nhân chéo với event/copy.
- Kiểm tra thực tế chỉ đọc: overview và borrow series trong range 2026-11-01..2026-11-07 trả tất cả count 0/0 bucket; 7 SELECT probe WHERE 1=0 kiểm tra usage count/page, user count/page và ba cách nhóm borrows đạt, không trả bản ghi nghiệp vụ. HTTP loopback health/health-db 200, năm endpoint mới thiếu JWT 401; đóng server/pool sau smoke. Không login thành công trên DB chính vì giờ login có ghi usage.
- 150/150 unit/safety đạt, cú pháp 65 file/diff-check đạt; ghi log/transaction chỉ mock. Chưa xác minh số liệu khác 0/khóa/rollback/concurrency thật trên DB test độc lập. UTC legacy/coverage chưa xác minh; log không bất biến vì FK CASCADE/SET NULL, JSON borrow_id không có FK. COUNT/page riêng có thể lệch khi ghi đồng thời; chưa tối ưu chỉ mục hoặc chạy tải lớn. Nguồn và thiết kế dự báo: Backend/docs/{usage-history-api,statistics-api,forecast-data-design}.md.

## Quá hạn/tiền phạt — xác minh 2026-11-07 (TASK-014)

- Đọc schema.sql và SELECT information_schema.COLUMNS xác nhận Phat: fine_id PK, borrow_detail_id FK bắt buộc, fine_rule_id FK nullable, fine_type late/damage/lost/other, amount DECIMAL(12,2), reason VARCHAR(255), assessed_at, payment_status unpaid/paid/waived, paid_at. QuyDinhPhat: rule_type late/damage/lost, amount DECIMAL(12,2), unit per_day/fixed, is_active. FK/CHECK/khóa của bản thiết kế tham chiếu schema.sql và lần đối chiếu SQL-007; TASK-014 chỉ xác minh lại metadata cột/quyền/cấu hình, không chạy DDL.
- Schema không có UNIQUE(detail,type), tiền tệ, người thu hoặc audit thanh toán. API khóa parent → detail → rule → kiểm tra Phat bằng locking read trước INSERT; mọi writer phải tuân theo khóa detail. Payment khóa khoản phạt; không update lịch sử mượn/trả, không auto fine/overdue. Mức tiền lấy rule đang active, không mặc định trong source; công thức và giới hạn tại Backend/docs/fines-api.md, không suy diễn đây là ràng buộc SQL mới.
- SELECT role-permission chỉ lấy tên xác nhận admin/librarian có fine_manage và borrow_manage. SELECT GROUP BY loại/unit/active cho QuyDinhPhat trả 0 nhóm: hiện chưa có quy định, không tạo giả. Không đọc dữ liệu người dùng hoặc khoản phạt thật. Không thêm quyền hoặc cấu hình tiền phạt trên DB chính.
- Đã probe 6 SELECT list/count/detail của fine/overdue bằng SELECT derived table WHERE 1=0, cú pháp MySQL đạt, không trả bản ghi nghiệp vụ. Đây không phải kiểm thử INSERT/UPDATE/transaction/khóa hay công thức trên DB thật. Mock/safety đạt 126/126; integration độc lập chưa có/chưa chạy. Múi giờ legacy chưa xác minh; không tự chuyển đổi. Schema, seed và SQL gốc giữ nguyên trong TASK-014.

## Integration isolation — xác minh 2026-11-06 (TASK-013)

- Chưa có TEST_DB_NAME/HOST/PORT/USER/PASSWORD/SERVER_UUID/MAIN_SERVER_UUID trong môi trường task; chỉ kiểm tra có/không, không in giá trị. npm run test:integration dừng tại MISSING_TEST_DB_NAME trước khi tạo kết nối. MySQL integration **CHƯA CHẠY**, không có kết quả ghi/transaction/concurrency thật mới.
- Test chỉ nhận hai tên hardcoded libriflow_integration_test/libriflow_ci_test, loại trừ tên DB chính từ env/.env và libriflow; không fallback connection ứng dụng. Bắt buộc pin UUID test khác main do người vận hành xác nhận, rồi SELECT kiểm tra DATABASE()/UUID thực tế và SHOW GRANTS giới hạn test-schema. NODE_ENV không đủ để chạy. Marker setup có schema/seed fingerprint, không tự cập nhật.
- Setup riêng chỉ được gọi thủ công trên database test đã tồn tại/trống, không CREATE/DROP DATABASE; bỏ CREATE DATABASE/USE khỏi source trong RAM, tạo 16 bảng app + 2 control tables chỉ trong DB test. SQL gốc/schema/seed không sửa. Marker/scope/privilege/query guard kiểm tra trước ghi; runtime cấm DELETE/DDL/cross-schema và nhiều statement.
- Fixture theo prefix/run ID, kiểm tra ownership trước dùng lại; manifest chỉ ID/status trong control table. Không cleanup/xóa hoặc sửa dữ liệu run khác. Staff fixture chỉ được thêm librarian trên chính tài khoản mới tạo trong DB test, không có tác động DB chính.
- 98/98 unit/safety đạt; không có lỗi nghiệp vụ mới được chứng minh bằng MySQL thật. App-factory refactor đảm bảo mọi model/health dùng pool được truyền; không đổi nghiệp vụ. Chạy schema/seed/setup/15 scenario và xác minh InnoDB thật còn **Chưa xác minh**. Hướng dẫn: Backend/docs/integration-tests.md.

## Mượn/trả — xác minh 2026-11-06 (TASK-012)

- Nguồn: PhieuMuon/ChiTietPhieuMuon/BanSaoSach/NguoiDung trong schema và seed. SELECT metadata xác nhận enum phiếu borrowed/partially_returned/returned/overdue/cancelled, detail borrowed/returned/lost, copy available/borrowed/lost/maintenance và user active/inactive/locked. SELECT liên kết quyền xác nhận admin/librarian có borrow_manage/return_process. Không đọc tài khoản/hash hoặc phiếu thật, không thêm quyền/bảng.
- Create: khóa NguoiDung FOR SHARE, khóa copy theo ID số tăng dần FOR UPDATE; kiểm tra active/available/good và không có loan mở trước INSERT header/detail/UPDATE copy. Ngày hẹn UTC ISO kiểm tra lại theo UTC_TIMESTAMP sau khi lấy khóa. Một lỗi rollback toàn phiếu.
- Return: khóa header -> copy tăng dần -> detail locking read; rà membership và loan mở duy nhất, không trả lặp/sai phiếu. Cập nhật returned_at/condition_after/status, copy good->available hoặc damaged->maintenance, header returned/partially_returned trong transaction. Không xóa/ghi đè lịch sử cũ hoặc tạo Phat/LichSuSuDung tự động; lost/cancelled/bất nhất giữ fail-closed.
- Phạm vi đọc SQL: reader WHERE user_id từ JWT trên COUNT/list/detail; user_id query reader bị từ chối. Staff có borrow_manage lọc theo quyền. Detail một SELECT JOIN, không JOIN profile người dùng. Header mới dùng UTC DATETIME rõ ràng (UTC_TIMESTAMP khi ghi, DATE_FORMAT khi đọc), timezone phiếu legacy **Chưa xác minh**, không tự chuyển đổi.
- Giới hạn API 1–100 copy/phiếu, không cho copy damaged mượn, không tính overdue/fine tự động là chính sách an toàn của API, không phải thay constraint DB. Phiếu legacy quá lớn/trùng/trống hoặc lost cần rà riêng. Schema chưa có UNIQUE active-loan/copy nên mọi writer cần tuân theo khóa copy; concurrency thật **Chưa xác minh**.
- Kiểm tra MySQL thật chỉ SELECT metadata/quyền/đồng hồ và câu SELECT model có thêm WHERE 1=0 (không lấy nội dung phiếu). Smoke app dùng principal mô phỏng, probe rỗng/guard chặn transaction: health/catalog 200, circulation 401/403, reader probe 200/404. Không test ghi hoặc thực thi migration/seed trên DB chính.

## category_manage — xác minh 2026-11-06 (TASK-011)

- Người dùng đã duyệt quyền category_manage cho admin/librarian, không gán reader. Seed được thêm đúng một quyền; quyền/role/reader grant cũ giữ nguyên. Schema 16 bảng và SQL gốc không sửa.
- Căn cứ khóa: QuyenHan(permission_id PK auto, name VARCHAR(100) UNIQUE, description), VaiTro(role_id PK auto, name VARCHAR(50) UNIQUE), VaiTro_QuyenHan PK(role_id, permission_id) + FK. Migration 001 dùng hai INSERT IGNORE trong transaction, tra ID bằng name; không UPDATE/DELETE/DDL, không tạo role hoặc dùng ID cố định.
- SELECT trước/sau smoke test trên DB chính xác nhận category_manage có 0 bản ghi, không có role liên kết; số bảng cơ sở vẫn 16. Không chạy migration/seed hoặc đọc dữ liệu tài khoản/hash. Role/permission từ SELECT thật kết hợp principal mô phỏng xác nhận API ghi 403 trước lấy transaction connection; thiếu token 401. Health và GET catalog thật vẫn 200.
- Code thay chốt 503 TASK-010 bằng authorize(category_manage), fail-closed 403 khi DB chưa cài quyền/liên kết. API không tự cấp quyền. Validation/UNIQUE/FK/khóa chống xóa danh mục có sách giữ nguyên, HTTP đã test bằng mock.
- Tính idempotent của migration mới được kiểm tra tĩnh theo UNIQUE(name), PK ghép và INSERT IGNORE; chạy migration hai lần/rollback lỗi trên MySQL độc lập: **Chưa xác minh** vì chưa có môi trường thử nghiệm được chỉ định. Hướng dẫn chọn schema/kiểm tra trước-sau tại Backend/sql/README.md.

## Danh mục/bản sao — xác minh 2026-11-06 (TASK-010)

- Đọc schema/seed và SELECT QuyenHan/VaiTro_QuyenHan: có copy_manage cho admin/librarian, reader chỉ book_view; không có quyền quản lý danh mục. API ghi danh mục giữ fail-closed, không tự sửa quyền/seed hoặc dùng quyền sách thay thế. Không đọc dữ liệu người dùng/hash.
- SELECT information_schema.COLUMNS/KEY_COLUMN_USAGE/STATISTICS xác nhận DanhMuc.name UNIQUE (100 ký tự), BanSaoSach.barcode UNIQUE (50 ký tự), isbn nullable UNIQUE (20 ký tự), hai enum good/damaged và available/borrowed/lost/maintenance; các FK liên quan khớp schema. NON_UNIQUE metadata trả chuỗi do cấu hình BIGINT; kiểm tra chuẩn hóa số trước so sánh.
- DELETE DanhMuc trong model khóa parent, kiểm tra Sach bằng locking read, chặn có sách thay vì để ON DELETE SET NULL làm mất liên kết. Lớp model/service có test mock; API ghi chưa được mở do thiếu quyền.
- Bản sao: tạo khóa chia sẻ Sach trước INSERT; sửa/xóa khóa copy, kiểm tra lượt mượn chưa hoàn tất. Chính sách API an toàn: không đổi book_id sau tạo, không cho sửa/xóa copy borrowed/lost, POST/PUT chỉ available/maintenance; các chuyển trạng thái lưu thông dành cho module sau. Đây là giới hạn API, không phải thay schema.
- Xóa bản sao chặn mọi ChiTietPhieuMuon và LichSuSuDung, không xóa cascade hoặc tự tách lịch sử. GET public không trả note, không JOIN người dùng/lịch sử mượn. ISBN UNIQUE theo schema được giữ nguyên, kể cả giới hạn nhiều bản sao cùng ISBN khác null.
- Chỉ kiểm tra đọc trên DB chính: danh sách/lọc/tìm kiếm/404/400 và health đạt; các write request trong smoke test bị chặn 401/503, getConnection bị chặn để không mở transaction ghi. Admin trong smoke gate là principal mô phỏng, không đọc tài khoản thật. Schema/seed/SQL gốc giữ nguyên nội dung.
- CRUD ghi/khóa nhiều connection trên MySQL độc lập và tích hợp mượn/trả: **Chưa xác minh**, đã test mô phỏng. Không thực thi SQL tạo bảng/seed hoặc thay đổi dữ liệu hiện tại.

## Nguồn và phạm vi xác minh
- Ngày 2026-11-04: kết nối thành công qua pool hiện tại; chỉ dùng `SELECT` trên `information_schema.SCHEMATA`, `TABLES`, `COLUMNS`, `KEY_COLUMN_USAGE`, lọc schema bằng `DATABASE()`.
- Schema đang kết nối có charset `utf8mb4`, collation `utf8mb4_unicode_ci`, 16 bảng cơ sở. Không đọc bản ghi nghiệp vụ hay giá trị bí mật cấu hình.
- `Backend/sql/create-database.sql` chỉ khai báo tạo schema trống. Từ ngày 2026-11-05 có bản tách cấu trúc/seed tại `Backend/sql/schema.sql` và `Backend/sql/seeds/initial-permissions.sql`; xem kết quả đối chiếu bên dưới. Lịch sử tạo database thực tế/migration: **Chưa xác minh**.

## Bảng và khóa chính thực tế
| Bảng | Khóa chính |
| --- | --- |
| `bansaosach` | `copy_id` |
| `bosach` | `series_id` |
| `chitietphieumuon` | `borrow_detail_id` |
| `danhmuc` | `category_id` |
| `dubaotansuat` | `forecast_id` |
| `lichsusudung` | `usage_id` |
| `nguoidung` | `user_id` |
| `nguoidung_vaitro` | (`user_id`, `role_id`) |
| `nhatkyhethong` | `log_id` |
| `phat` | `fine_id` |
| `phieumuon` | `borrow_id` |
| `quydinhphat` | `fine_rule_id` |
| `quyenhan` | `permission_id` |
| `sach` | `book_id` |
| `vaitro` | `role_id` |
| `vaitro_quyenhan` | (`role_id`, `permission_id`) |

## Khóa ngoại thực tế
Mỗi mục là `bảng.cột → bảng.cột`, đã xác minh qua `KEY_COLUMN_USAGE`:
- `bansaosach.book_id → sach.book_id`.
- `sach.category_id → danhmuc.category_id`; `sach.series_id → bosach.series_id`.
- `phieumuon.user_id → nguoidung.user_id`.
- `chitietphieumuon.borrow_id → phieumuon.borrow_id`; `chitietphieumuon.copy_id → bansaosach.copy_id`.
- `phat.borrow_detail_id → chitietphieumuon.borrow_detail_id`; `phat.fine_rule_id → quydinhphat.fine_rule_id`.
- `nguoidung_vaitro.user_id → nguoidung.user_id`; `nguoidung_vaitro.role_id → vaitro.role_id`.
- `vaitro_quyenhan.role_id → vaitro.role_id`; `vaitro_quyenhan.permission_id → quyenhan.permission_id`.
- `lichsusudung.user_id → nguoidung.user_id`; `lichsusudung.copy_id → bansaosach.copy_id`.
- `dubaotansuat.user_id → nguoidung.user_id`; `nhatkyhethong.user_id → nguoidung.user_id`.

## Kết nối và giới hạn
- Nguồn: `Backend/src/config/database.js`. Biến cấu hình: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; không lưu giá trị cấu hình thực tế ở đây.
- Pool: tối đa 10 kết nối, hàng đợi 50, timeout kết nối 10 giây; `DB_PORT` được kiểm tra khoảng 1–65535. Health check dùng `SELECT 1`.
- Từ BOOK-001 (2026-11-05), pool bật `supportBigNumbers`/`bigNumberStrings`; module sách trả ID dạng chuỗi để bảo toàn BIGINT UNSIGNED. Không thay đổi schema hoặc `.env`.
- Quy tắc nghiệp vụ và bản ghi seed thực tế: **Chưa xác minh**. Metadata FK/cascade, index, CHECK, trigger/event/routine đã được kiểm tra lại ngày 2026-11-05 theo phần dưới.
- Không chạy tệp tạo database hoặc thay đổi schema/dữ liệu trong đợt khảo sát này.

## Tệp SQL từ GitHub — xác minh 2026-11-05
- `libriflow_database.sql` có DDL 16 bảng, dùng tên bảng PascalCase. MySQL hiện dùng `lower_case_table_names=1`, giải thích tên chữ thường trong metadata. Khả năng chạy trên môi trường phân biệt hoa/thường: **Chưa xác minh**. Kết quả đối chiếu cấu trúc hiện tại xem bên dưới.
- Có 5 câu `INSERT IGNORE`: tạo 3 vai trò, 11 quyền và gán quyền cho vai trò; không có lệnh chèn tài khoản/người dùng hay dữ liệu mượn trả. Cột `NguoiDung.password` là khai báo cấu trúc, không phải giá trị mật khẩu.
- Đã đọc toàn tệp và rà các mẫu bí mật; không phát hiện mật khẩu, token, private key, URL chứa thông tin đăng nhập hoặc dữ liệu cá nhân. Đây là kết quả rà soát tĩnh, không phải kiểm thử SQL.
- Giữ nguyên tệp, không thực thi; SHA-256: `8a2885e022ac8024f76a8ec64a7840fec41b7bdd499b6fd461d8a32e63fe5e40`. Nguồn lịch sử: `origin/main` tại `eded2dd`; tác giả/quy trình tạo schema thực tế vẫn **Chưa xác minh**.

## Chuẩn hóa SQL — xác minh 2026-11-05

- Ba bản `../libriflow_database.sql`, `libriflow_database.sql`, `Backend/sql/libriflow_database.sql` giống nội dung sau chuẩn hóa xuống dòng. Bản gốc dự án: 9.501 byte, CRLF, hash như trên; hai bản còn lại: 9.285 byte, LF, SHA-256 `566cd55b82c407408d5fc16de0ef6db0e7f79b980ceccccae49e890885942b43`.
- Nguồn tách là `Backend/sql/libriflow_database.sql`; tạo `schema.sql` và `seeds/initial-permissions.sql` cùng thư mục, giữ nguyên DDL/seed; không đổi ba file gốc. Hướng dẫn: `Backend/sql/README.md`.
- SELECT trên `information_schema` gồm SCHEMATA, TABLES, COLUMNS, KEY_COLUMN_USAGE, REFERENTIAL_CONSTRAINTS, TABLE_CONSTRAINTS, CHECK_CONSTRAINTS và STATISTICS: 16 bảng InnoDB, 96 cột, 16 PK, 16 FK, 6 UNIQUE, 3 CHECK được thực thi, 46 chỉ mục kể cả chỉ mục tự sinh. Kiểu/ENUM, thứ tự cột, NULL, DEFAULT, AUTO_INCREMENT, ON UPDATE, charset/collation, PK, FK/cascade, CHECK và chỉ mục khớp DDL sau chuẩn hóa biểu diễn MySQL và tên bảng theo cấu hình server.
- MySQL 8.0.40; schema `libriflow`, `utf8mb4_unicode_ci`. Metadata không thấy trigger, routine hoặc event trong schema với quyền kết nối hiện tại.
- Không đọc bản ghi nghiệp vụ/phân quyền. Không thực thi schema/seed. Kiểm thử cú pháp trên database mới và hoạt động trên môi trường phân biệt hoa/thường: **Chưa xác minh**.

## Module sách — xác minh 2026-11-05 (BOOK-001)

- Nguồn cột/ràng buộc: `Backend/sql/schema.sql`, bảng Sach và BanSaoSach. Metadata KEY_COLUMN_USAGE hiện tại xác nhận `bansaosach.book_id` tham chiếu `sach`. Không sửa SQL hay schema.
- API sách dùng title/author bắt buộc; category_id/series_id/publisher/description/publication_year có thể null. Sach không có UNIQUE/ENUM riêng. Validation chi tiết và giới hạn kiểm thử tại `Backend/docs/books-api.md`.
- DELETE khóa Sach bằng SELECT FOR UPDATE trong transaction, kiểm tra BanSaoSach rồi chỉ DELETE Sach; FK RESTRICT là chốt chặn cuối. PUT cũng khóa sách, không dùng affectedRows=0 để suy ra 404.
- Đợt kiểm thử đọc thật: bảng Sach không có bản ghi tại thời điểm kiểm tra; chỉ SELECT/GET, không in dữ liệu. POST/PUT/DELETE và cạnh tranh FK thực tế: **Chưa xác minh trên MySQL thật**, đã kiểm thử mô phỏng. Không đọc dữ liệu người dùng hoặc bản ghi phân quyền.

## JWT/RBAC — xác minh 2026-11-05 (AUTH-001)

- Nguồn: NguoiDung/VaiTro/QuyenHan/NguoiDung_VaiTro/VaiTro_QuyenHan trong schema và seed hiện có; không thêm bảng hoặc sửa SQL. SELECT metadata xác nhận trạng thái active/inactive/locked. SELECT tên role/quyền và liên kết xác nhận reader chỉ book_view, librarian có book_create/book_update nhưng không book_delete, admin có ba quyền ghi sách.
- Register chỉ nhận name/email/password/phone, hash bcrypt cost 12 trước khi model INSERT vào cột password; transaction tìm reader rồi thêm NguoiDung và NguoiDung_VaiTro. Thiếu reader trả 503/rollback, trùng email trả 409/rollback. Không cho client đặt role/status.
- Login chỉ so sánh hash bcrypt, không chấp nhận plaintext hoặc tự migrate hash cũ. Middleware đọc profile/status/roles/permissions bằng JOIN mỗi request; không lấy quyền từ JWT. Me chỉ trả profile của chính tài khoản, không trả hash.
- Task chỉ SELECT metadata và bảng phân quyền, không đọc bản ghi người dùng/hash trên MySQL chính; kiểm thử auth thành công/ghi dùng model/connection mô phỏng. Register/login thật và cạnh tranh unique/FK trên database thử nghiệm độc lập: **Chưa xác minh**.
