# FE-09 — Kho sách và bản sao

Xác minh 2026-11-21. Hoàn tất phần Frontend theo API hiện hữu; chờ nghiệm thu.

- Tại `/app/sach`, mở **Chi tiết** để xem thông tin đầu sách và bảng bản sao, phân trang 10 bản sao/lượt, tải lại, loading/empty/error/retry. Đóng chi tiết giữ nguyên tìm kiếm và trang danh sách sách.
- Người có `copy_manage` được thêm, sửa mã vạch/ISBN/tình trạng/trạng thái/ghi chú và xóa sau xác nhận. Admin không được bỏ qua permission; bản sao borrowed/lost chỉ xem. Chỉ chọn available/maintenance và good/damaged theo Backend; không bổ sung nghiệp vụ mượn/trả.
- Thông báo Toast, validation, chặn gửi lặp, hủy chờ khi rời trang, giữ phiên khi 403 và kế thừa xử lý 401 FE06. Mất kết quả ghi thì khóa gửi lại, yêu cầu đóng form/tải lại. Backend tiếp tục quyết định khóa mượn và lịch sử liên quan.
- Ghi chú nội bộ không được trả bởi GET, trong khi PUT thay thế cả ghi chú: form sửa nêu rõ và yêu cầu đồng ý thay thế/xóa ghi chú cũ trước khi lưu. Không giả lập hoặc tuyên bố giữ ghi chú chưa đọc được. Không hiển thị vị trí lưu trữ vì contract không cung cấp.

## API và nguồn đối chiếu

- GET `/api/books/:id/copies` cho danh sách công khai, page/limit; POST `/api/book-copies`, PUT/DELETE `/api/book-copies/:id` cần `copy_manage` và Bearer.
- Contract/validation/khóa: `Backend/src/routes/ban-sao-sach.routes.js`, `controllers/ban-sao-sach.controller.js`, `utils/kiem-tra-danh-muc-ban-sao.js`, `services/ban-sao-sach.service.js`, `models/ban-sao-sach.model.js`. Chỉ đọc source; không truy cập database.

## File thay đổi

- Thêm `src/chuc-nang/sach/QuanLyBanSao.jsx`, `dich-vu-ban-sao.js`, `QuanLyBanSao.test.jsx`.
- Sửa `TrangQuanLySach.jsx`, `TrangQuanLySach.test.jsx` (thêm response bản sao rỗng cho adapter test cũ), `src/kieu-dang/sach.css`.
- Tạo tài liệu này; cập nhật `docs/TASKS.md`, `docs/HANDOFF.md` ở gốc. Không dependency mới, không sửa Backend/database/env/auth/route; giữ các thay đổi Git có sẵn, không commit/push.

## Kiểm tra và giới hạn

- Baseline 274/274 tests đạt. Sáu test mới bao phủ danh sách, grant, thêm/sửa/xóa, xác nhận ghi chú, validation và lỗi/retry. Lượt hồi quy đầu: 274 cũ + 2 mới đạt, 4 test mới thất bại vì fixture thiếu status active; đã sửa fixture, chạy riêng 6/6 đạt.
- Hồi quy cuối `npm.cmd run test:run -- --maxWorkers=1`: **280/280 tests tại 16 file đạt**, 0 fail/skip. `npm.cmd run lint` và `npm.cmd run build`: đạt.
- SHA-256 toàn bộ file Backend ngoài node_modules/.git khớp đầu task. Không chạy SQL, migration, seed hoặc tạo tài khoản.
- Chưa kiểm chứng browser trực quan/resize/AT hoặc CRUD với Backend/MySQL thật. Khảo sát không thấy listener cổng 3000; không khởi động Backend hay dùng main để thử ghi.
- Tiếp theo: nghiệm thu `/app/sach` → chi tiết → bản sao trong browser với Backend dev riêng, JWT và tài khoản có/không `copy_manage`. Không tự triển khai FE-10.
