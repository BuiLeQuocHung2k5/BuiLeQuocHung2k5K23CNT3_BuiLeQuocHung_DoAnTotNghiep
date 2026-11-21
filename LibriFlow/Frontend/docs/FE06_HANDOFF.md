# FE-06 — Handoff

Xác minh **2026-11-21**. **Hoàn tất phần lập trình đăng nhập/đăng xuất; dừng chờ nghiệm thu.** Frontend tests 182/182, lint/build đạt. Chưa chứng nhận đăng nhập FE end-to-end vì chưa có Backend dev/account hoạt động và browser host không khả dụng. [Test report](FE06_TEST_REPORT.md).

## Chức năng

- /dang-nhap: giao diện tiếng Việt Warm Wooden Library, tái dùng NutBam/ONhap/The/ThongBao/BieuTuong FE-03; email/password, validation, loading và lỗi an toàn.
- Context giữ access token/principal trong memory. Không localStorage/sessionStorage/refresh hoặc giải mã JWT để suy vai trò. Reload mất phiên.
- Dùng ketNoiHttp FE-05: POST /auth/login với email/password, GET /auth/me với Bearer, rồi chuyển /app. Không mock API ở runtime. [Contract nguồn](../../docs/backend-auth-prep/BE_AUTH_PREP_01_API_CONTRACT.md), [auth router](../../Backend/src/routes/xac-thuc.routes.js).
- Header hiển thị name và roles từ me, dịch admin/librarian/reader sang nhãn Việt, không parseInt user_id.
- Protected request dùng cùng client và đường dẫn API tương đối được gắn Bearer theo phiên hiện hành. Interceptors được tháo khi provider unmount; không gửi token sang URL ngoài client.
- TTL lấy từ expiresIn = 900 của contract, tính bảo thủ từ lúc bắt đầu login. Timer/focus/visibility và request kiểm deadline. 401 của phiên hiện hành xóa phiên; response cũ không xóa phiên mới. 401 login là lỗi form; không tự logout vì 403.
- Logout gọi API nhưng xóa token/profile/cache ngay, hủy query và xóa cả public cache để ranh giới phiên đơn giản. Vẫn hoàn tất khi network lỗi hoặc response chậm. Không tự thu hồi token server.

## Route và phạm vi FE-07

/app và app path không nằm trong ngoại lệ yêu cầu login. Các tuyến kỹ thuật /, /design-system, /app/layouts, /app/workspace, /app/api-check giữ khả dụng khi vô danh; Header ghi “Chế độ xem thử”, không giả lập user. /app/layouts chọn role chỉ đổi preview, không cấp quyền.

Cờ congKhaiKyThuat trong cấu hình route chỉ dành cho ba trang kỹ thuật trên. FE-07 phải xem lại khi thay nội dung thành chức năng thật; không để dữ liệu riêng ở tuyến public. Chưa tạo phân quyền chi tiết theo route/action hoặc business pages.

## File tạo

- src/chuc-nang/xac-thuc/TrangDangNhap.jsx
- src/chuc-nang/xac-thuc/BoCungCapXacThuc.jsx
- src/chuc-nang/xac-thuc/useXacThuc.js
- src/chuc-nang/xac-thuc/dich-vu-xac-thuc.js
- src/chuc-nang/xac-thuc/BaoVeDangNhap.jsx
- src/chuc-nang/xac-thuc/xac-thuc.test.jsx
- src/kieu-dang/xac-thuc.css
- docs/FE06_TEST_REPORT.md và docs/FE06_HANDOFF.md (thư mục Frontend).

## File sửa

- src/ung-dung/bo-cung-cap/BoCungCapUngDung.jsx: đặt auth provider trong QueryClientProvider.
- src/ung-dung/dinh-tuyen/{DinhTuyenUngDung.jsx,cau-hinh-tuyen.js}: login route, guard, ngoại lệ kỹ thuật.
- src/bo-cuc/DauTrang.jsx: tên/role/logout hoặc trạng thái xem thử.
- src/chuc-nang/khung-ung-dung/TrangTongQuanUngDung.jsx: cập nhật thông báo trạng thái tài khoản.
- src/chuc-nang/khung-ung-dung/khung-ung-dung.test.jsx: principal mock/assertion Header, giữ kiểm layout/preview.
- src/kieu-dang/toan-cuc.css: import CSS auth.
- src/thu-vien/api/ket-noi-http.js: chỉ cập nhật chú thích điểm tích hợp, cấu hình transport giữ nguyên.
- docs/TASKS.md và docs/HANDOFF.md ở gốc repo theo AGENTS.

Không sửa Backend/database/API contract/env/package/lock hoặc đổi tên hàng loạt. Giữ nguyên toàn bộ thay đổi BE-AUTH-SETUP-01 đang có trước FE-06; không reset/unstage/stage/commit/push.

Kiểm cuối theo snapshot trước FE-06: 10 file hiện hữu sửa và 9 file mới đúng phạm vi, không xóa. 108 file Backend/126 file được bảo vệ giữ nguyên; 34 local links tại 4 docs, UTF-8/whitespace/diff-check đạt; HEAD/index không đổi.

## Chạy và kiểm tra

Từ Frontend:

~~~powershell
npm.cmd run test:run
npm.cmd run lint
npm.cmd run build
~~~

VITE_API_BASE_URL phải là origin HTTP(S) của Backend được vận hành riêng, không kèm /api; client tự thêm /api. Cấu hình chỉ chứa origin công khai, không JWT secret/DB credential trong VITE_. Có thể đặt trong process trước npm.cmd run dev; không cần ghi đè env hiện hữu. Mở /dang-nhap. Nếu thiếu origin, form báo dịch vụ chưa cấu hình; nếu Backend offline, báo lỗi mạng, không chuyển sang mock.

Không có user/password/token để bàn giao từ task này. Instance BE test trước đã dừng và hai fixture đã inactive; không dùng main hoặc tự register/seed. Dev/preview tạm dùng smoke đã dừng.

## Điều kiện tiếp tục

FE-07 chỉ bắt đầu khi người dùng giao nhiệm vụ tiếp. Trước nghiệm thu luồng tích hợp thực cần operator cung cấp Backend dev/MySQL cô lập, cấu hình JWT riêng và account hợp lệ; kiểm login → me → /app → protected 401/403 → logout bằng browser thật. Không ghi credential/token vào ảnh/log/tài liệu.

Cần kiểm responsive 375/768/1280, bàn phím/focus và lỗi network thực khi browser host khả dụng. FE-07 thiết kế quyền route/action theo permissions từ me, Backend vẫn quyết định authorization. Không tự triển khai FE-07.
