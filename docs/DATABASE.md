# Database

## Nguồn và phạm vi xác minh
- Ngày 2026-11-04: kết nối thành công qua pool hiện tại; chỉ dùng `SELECT` trên `information_schema.SCHEMATA`, `TABLES`, `COLUMNS`, `KEY_COLUMN_USAGE`, lọc schema bằng `DATABASE()`.
- Schema đang kết nối có charset `utf8mb4`, collation `utf8mb4_unicode_ci`, 16 bảng cơ sở. Không đọc bản ghi nghiệp vụ hay giá trị bí mật cấu hình.
- `Backend/sql/create-database.sql` chỉ khai báo tạo schema `libriflow` với charset/collation trên; không đủ tái tạo 16 bảng đang tồn tại. Nguồn tạo bảng và lịch sử migration: **Chưa xác minh**.

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
- Quy tắc nghiệp vụ, dữ liệu seed, trigger/event/routine, hành vi cascade và tính đầy đủ của index/constraint: **Chưa xác minh**. Cần kiểm tra metadata liên quan trước task phụ thuộc các nội dung này.
- Không chạy tệp tạo database hoặc thay đổi schema/dữ liệu trong đợt khảo sát này.
