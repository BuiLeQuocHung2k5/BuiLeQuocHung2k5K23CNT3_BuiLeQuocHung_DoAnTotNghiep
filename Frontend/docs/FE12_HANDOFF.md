# FE-12 — Giao diện Admin

Xác minh **2026-11-21**. Hoàn tất phần giao diện khả thi; **quản trị danh sách/CRUD tài khoản còn bị chặn bởi API Backend chưa có**. Dừng chờ nghiệm thu, chưa triển khai FE13.

## Trang và quyền

- **/app/admin**: guard/menu FE07 theo role admin thật từ /auth/me. Lời chào, name/email/status hiện tại, liên kết hồ sơ chỉ xem FE11; không dump principal hoặc hiển thị password/hash/JWT.
- Lối tắt sách dùng trang công khai trong vùng đăng nhập, không tự thêm book_view gate. Lối tắt mượn/trả cần borrow_manage; người dùng cần user_manage. Không có liên kết thống kê vì chưa có trang tương ứng; không Admin bypass.
- Có **3 số tổng đơn giản** (đầu sách, bản sao, tài khoản) từ GET /api/statistics/overview khi có report_view, không biểu đồ/phân tích FE13. Dữ liệu lấy trực tiếp từ books_total/copies_total/users_total, kiểm số nguyên không âm; loading/error/retry và cấu hình thiếu không biến thành số 0 giả. 403 giữ phiên, 401 theo FE06.
- **/app/nguoi-dung**: guard/menu cần user_manage độc lập role. Trang thông báo rõ dịch vụ chưa hỗ trợ, không mô phỏng danh sách trống, tìm kiếm, form hoặc nút CRUD. Có liên kết hồ sơ cá nhân và danh mục sách.

## Giới hạn Backend đã xác minh

[Mount](../../Backend/src/app-factory.js), [auth routes](../../Backend/src/routes/xac-thuc.routes.js), [auth controller](../../Backend/src/controllers/xac-thuc.controller.js) và [API gaps](04_API_GAPS_AND_RISKS.md) xác nhận chưa có user list/search/detail/admin create/update/delete, đổi trạng thái/role/quyền hoặc reset password. user_manage có tên trong catalog nhưng chưa có endpoint sử dụng cho CRUD người dùng.

Không dùng POST /auth/register thay tạo user Admin; không dùng /statistics/users hoặc forecast/users/:id làm API hồ sơ/danh sách người dùng. Trang Admin chỉ dùng tổng hợp từ [statistics/overview](../../Backend/src/routes/thong-ke.routes.js), quyền report_view, không dùng số liệu đó làm danh sách tài khoản. Hồ sơ hiện tại tái sử dụng principal GET /auth/me FE06, không API mới.

Vì vậy **chưa đạt nghiệm thu các luồng danh sách/tìm kiếm/chi tiết/thêm/sửa/role/status người dùng**; cần task Backend riêng cung cấp contract/quyền trước khi nối giao diện. Không sửa Backend/database để mở các chức năng này.

## File và kiểm tra

- Tạo src/chuc-nang/quan-tri/{TrangAdmin,TrangNguoiDung}.jsx và quan-tri.test.jsx; không thêm service/framework/CSS/library.
- Sửa cau-hinh-tuyen.js, DinhTuyenKhung.jsx cho hai route; hai test menu FE07 cập nhật mục Tổng quan Admin mới, giữ ca bảo mật. Tạo tài liệu này, cập nhật TASKS/HANDOFF gốc.
- Baseline tham chiếu **292**, cuối **296/296 tại 19 file**, 0 fail/skip; 4 test mới về identity/secrets, link/quyền, guard, unsupported APIs và aggregate/403. Targeted ban đầu 3/3 trước khi thêm test aggregate; cả 4 đạt trong full suite.
- Lệnh từ Frontend: npm.cmd run test:run -- --maxWorkers=1; npm.cmd run lint; npm.cmd run build -- --logLevel=warn. Tất cả đạt.
- Hai production SPA shells trả 200, preview đóng; không coi HTTP shell là UI/guard pass. Chưa browser/AT/resize hoặc API/MySQL E2E: host/native pipe unavailable, TCP3000 đóng, chưa có dev account được bàn giao.
- 107/107 file Backend giữ SHA-256; giữ FE06–11 runtime/ảnh/API layer/env/package, HEAD/index và thay đổi có sẵn. Không truy vấn/ghi DB, tạo account, stage/commit/push.

Tiếp theo: nghiệm thu giao diện hiện có; bổ sung API quản trị người dùng bằng nhiệm vụ Backend riêng nếu muốn hoàn thành CRUD, rồi kiểm tích hợp trên môi trường dev cô lập. Không tự FE13.
