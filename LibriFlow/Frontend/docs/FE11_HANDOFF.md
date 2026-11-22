# FE-11 — Giao diện độc giả

Xác minh **2026-11-21**. Hoàn tất phần lập trình, **dừng chờ nghiệm thu**; chưa browser/Backend/MySQL end-to-end.

## Trang và quyền

- **/app/doc-gia**: lời chào/tài khoản từ FE06, lối tắt tra cứu/lịch sử/tài khoản; tổng phiếu cá nhân, phiếu còn sách chưa trả và phiếu overdue từ pagination Backend. Không suy số phiếu thành số sách. Mục hạn trả 7 ngày xét **5 phiếu gần đây**, ghi rõ phạm vi và UTC tại lần tải; không tuyên bố bao phủ mọi phiếu.
- **/app/lich-su-muon**: phiếu cá nhân, lọc status, phân trang, loading/empty/error/retry; chi tiết tái sử dụng ChiTietPhieuMuon FE10 ở chế độ chỉ xem, tuyệt đối không có nút lập/trả. DTO chỉ có copy_id/trạng thái/ngày trả, không bịa tên sách/barcode.
- Hai trang trên dùng guard/menu FE07 với **role reader thực từ /auth/me**, kể cả tài khoản nhiều vai trò. Không thêm permission hoặc Admin bypass.
- **/app/tai-khoan**: mọi phiên đăng nhập được xem allowlist name/user_id/email/phone/roles/status từ principal /auth/me FE06; không dump JSON/password/hash/JWT. Không có API sửa hồ sơ/đổi mật khẩu nên chỉ xem; logout Header giữ nguyên.
- **/app/sach**: dùng nguyên FE08/09/ảnh bìa FE10, tìm/danh sách/chi tiết/bản sao công khai; nút ghi chỉ hiện với grant hiện hữu. Không viết lại module sách. Menu quản lý thủ thư/Admin được giữ, thêm tài khoản chung và mục độc giả đúng role.

## Dữ liệu cá nhân

Dùng GET **/api/borrows** và **/api/borrows/:id**, Bearer qua API layer/FE06. Nguồn kiểm chứng: [scope/validator](../../Backend/src/utils/kiem-tra-phieu-muon.js), [controller](../../Backend/src/controllers/phieu-muon.controller.js), [model](../../Backend/src/models/phieu-muon.model.js), [auth](../../Backend/src/services/xac-thuc.service.js).

- Reader không có borrow_manage: **không gửi user_id**, Backend lấy owner từ JWT và WHERE trên COUNT/list/detail.
- Reader có thêm borrow_manage: list bắt buộc gửi **user_id=self** để Backend lọc, không tải toàn bộ rồi lọc ở Frontend. Không nhận owner từ URL/form/tham số ngoài.
- Mọi list/detail được kiểm owner trước khi hiển thị; sai owner thì từ chối **cả phản hồi**, không lọc bỏ hàng để che lỗi scope. Chi tiết chỉ mở từ phiếu cá nhân đã lấy; Backend vẫn quyết định quyền/404. Cache riêng theo user_id và permissions; FE06 xóa cache khi kết thúc phiên.
- Tổng quan dùng 4 GET có scope (5 phiếu gần đây và tổng 3 trạng thái mở), không gọi statistics/report API hoặc thu thập mọi trang. Các số tổng không phải snapshot transaction.
- 401/403 dùng FE06/normalization FE10; 403 báo lỗi và giữ phiên. Không đổi provider/guard/helper/quyền Backend.

## File và kiểm tra

Tạo src/chuc-nang/doc-gia/{TrangDocGia,TrangLichSuMuon,TrangTaiKhoan}.jsx, du-lieu-doc-gia.js, doc-gia.test.jsx và src/kieu-dang/doc-gia.css. Sửa cấu hình route/DinhTuyenKhung; hai test menu FE07 cập nhật assertion theo các mục thật mới, giữ các ca bảo mật. Tạo tài liệu này, cập nhật TASKS/HANDOFF gốc; không thêm dependency.

- Baseline **287/287**, cuối **292/292 tại 18 file**, 0 fail/skip. Thêm 5 mock tests bao phủ điều hướng/read-only/profile allowlist, scope reader/mixed grants, phản hồi sai owner, filter/empty/403 và guard reader/anonymous/staff. Targeted 5/5 đạt.
- Lệnh từ Frontend: npm.cmd run test:run -- --maxWorkers=1; npm.cmd run lint; npm.cmd run build -- --logLevel=warn. Tất cả đạt. ESLint ban đầu phát hiện Date.now trong render; đã dùng thời điểm dữ liệu query cập nhật, không tắt rule.
- Parse/import 82 JS/JSX không lỗi/casing. 5 production SPA shells (3 mới + sách + mượn/trả) trả 200, server preview đã đóng; không coi shell 200 là browser/guard pass.
- Chưa kiểm trực quan/resize/AT, login/read data MySQL thật hoặc cạnh tranh thay đổi grant: browser host/native pipe unavailable, cổng 3000 không mở/chưa có dev account được bàn giao. UTC phiếu do module Backend tạo đã có contract; timezone legacy ngoài module chưa xác minh.
- Không đổi Backend/database/API/env/package, auth runtime, sách/ảnh/bản sao hoặc nghiệp vụ FE10. Giữ HEAD/index và thay đổi FE10 có sẵn; không stage/commit/push.

Tiếp theo: người dùng nghiệm thu bằng browser và Backend dev/MySQL cô lập với reader/mixed-role thực, kiểm phiếu own/ngoài scope, tài khoản và tra cứu sách. Không tự triển khai FE12.
