# FE-ASSETS-02 + FE-10 — Bàn giao

Xác minh **2026-11-21**. Hoàn tất phần lập trình theo API hiện hữu, **dừng chờ nghiệm thu**. Chưa kiểm chứng browser/Backend/MySQL end-to-end.

## Ảnh bìa

- Đổi public/Anh/BiaSach/doi-gio-hu.jpg.jpg thành doi-gio-hu.jpg; SHA-256 xác nhận cả hai ảnh JPG giữ nguyên byte, không tải/chỉnh sửa ảnh.
- [AnhBiaSach](../src/chuc-nang/sach/AnhBiaSach.jsx) ghép chính xác tên + tác giả sau chuẩn hóa dấu/chữ thường/khoảng trắng: Don Quijote/Miguel de Cervantes, Đồi gió hú/Emily Brontë. API không có trường ảnh; chưa có ID thật được bàn giao nên không bịa book_id hoặc ghép theo thứ tự. Về sau ưu tiên chuyển sang ID thật đã xác minh.
- /app/sach: danh sách **60×90**, chi tiết **160×240**; form mượn tái sử dụng ảnh nhỏ. Có variant thẻ **120×180**. CSS aspect-ratio 2/3, object-fit contain, nền kem/bo nhẹ; không cắt/kéo giãn. Không có ảnh hoặc lỗi tải → SVG mặc định. URL public hỗ trợ BASE_URL.

## Trang mượn/trả

**/app/muon-tra**, Sidebar “Mượn / Trả sách”, guard **borrow_manage** qua FE07; nút trả kiểm thêm **return_process**, không Admin bypass.

- Danh sách, chi tiết, phân trang; lọc status/user_id theo API, không tự thêm search tên. Hiển thị ID độc giả, ngày mượn/hạn trả, 5 trạng thái Backend và ngày/tình trạng trả từng copy; loading/empty/error/retry.
- Lập phiếu: nhập user_id thật, tìm/chọn đầu sách, chọn 1–100 bản sao available/good không trùng, hạn trả tương lai và ghi chú. Giờ nhập theo máy chuyển sang UTC ISO không mili giây. Xem lại độc giả/copy/hạn trả rồi xác nhận mới ghi.
- Trả một/nhiều copy bằng items với good/damaged từng mục; trả toàn bộ bằng return_all:true + condition_after. Có xác nhận trước request, không cho chọn copy returned/lost. Backend quyết định giao dịch/trạng thái hợp lệ.
- Chặn gửi lặp; ghim Bearer theo phiên, AbortSignal, không auto retry/optimistic update. Thành công cập nhật từ phản hồi rồi invalidate/refetch phiếu/sách/bản sao. Kết quả mạng/5xx chưa rõ → khóa gửi lại đến khi đóng/tải lại. 403 giữ phiên; 401/TTL/logout dùng provider FE06 không đổi.

## API và giới hạn

| API | Contract |
| --- | --- |
| GET /api/borrows | JWT; page/limit/status/user_id cho borrow_manage. |
| GET /api/borrows/:id | JWT; header + details, 404 ngoài scope. |
| POST /api/borrows | borrow_manage; user_id/copy_ids/due_date/note; 201 + phiếu. |
| POST /api/borrows/:id/return | return_process; items hoặc return_all/condition_after; 200 + phiếu. |

Chọn sách/copy dùng GET /api/books và /api/books/:id/copies với bộ lọc có thật. Nguồn: Backend src/{routes,controllers,services,models}/phieu-muon.*.js, utils/kiem-tra-phieu-muon.js, [contract](../../Backend/docs/phieu-muon-api.md) và validation bản sao.

**Chưa có API tra cứu độc giả theo tên/email hoặc tên độc giả trong Borrow DTO:** dùng mã đã biết, Backend kiểm tồn tại/active; không giả lập lookup. Chi tiết chỉ trả copy_id, không tên sách/barcode nên không bịa thông tin. Backend cho reader đọc own nhưng FE10 này là trang quản lý cần borrow_manage, chưa có trang phiếu cá nhân; riêng return_process không đủ mở trang. Ngày SQL giữ nguyên từ API; UTC áp dụng phiếu tạo bởi module, timezone legacy ngoài module chưa xác minh.

## File

- Tạo src/chuc-nang/sach/AnhBiaSach.jsx; src/kieu-dang/anh-bia-sach.css.
- Tạo src/chuc-nang/muon-tra/{TrangMuonTra,BieuMauMuon,ChiTietPhieuMuon}.jsx, dich-vu-muon-tra.js, muon-tra.test.jsx; src/kieu-dang/muon-tra.css.
- Sửa TrangQuanLySach.jsx (ảnh), DinhTuyenKhung.jsx và cau-hinh-tuyen.js (route/menu); đổi tên JPG. Tạo tài liệu này, cập nhật TASKS/HANDOFF gốc.
- Không sửa Backend/database/schema/API/env/package/FE06–07/FE09 runtime, không sửa/xóa test cũ. Không stage/commit/push hoặc FE11.

## Kiểm tra

- Baseline 280/280; cuối **287/287 tại 17 file**, 0 fail/skip. Thêm đúng **7 test mock**: ảnh/fallback, list/filter/empty/error, create/review, detail/partial return, return-all/403/409, permission/guard/menu, validation/network chưa rõ. IDs/mock data chỉ trong .test.
- Lệnh từ Frontend: npm.cmd run test:run -- --maxWorkers=1; npm.cmd run lint; npm.cmd run build -- --logLevel=warn. Tất cả đạt. Các lượt lỗi trung gian do selector test và đổi nhầm key cột Table đã sửa; không nới assertion hoặc tính lượt lỗi là pass.
- Parse/import tĩnh 77 JS/JSX không lỗi/casing. Ba ảnh dev/production trả 200/MIME đúng, bytes HTTP và dist khớp public. /app/muon-tra trả SPA shell 200; không coi đó là browser/guard pass. Server tạm đều đã đóng.
- 107/107 file Backend giữ SHA-256 baseline; HEAD/index 0b2a455 không đổi. Browser host/native pipe unavailable, TCP 3000 đóng; chưa có dev account được bàn giao. Chưa E2E/visual/UTC thực tế/concurrency; không truy vấn/ghi DB hoặc tạo fixture.

Tiếp theo: nghiệm thu desktop với browser và Backend dev/MySQL cô lập, user/copy ID thật và account/grants phù hợp; kiểm ảnh đúng cặp tên/tác giả, lập phiếu và trả sách. Không tự FE11.
