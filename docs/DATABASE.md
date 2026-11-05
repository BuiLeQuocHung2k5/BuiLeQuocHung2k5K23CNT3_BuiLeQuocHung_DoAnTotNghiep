# Database

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
