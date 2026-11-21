# FE-DESKTOP-01 — Handoff

Xác minh **2026-11-21**. **Hoàn tất phần lập trình desktop-first, dừng chờ nghiệm thu.** [Test report](FE_DESKTOP_01_TEST_REPORT.md): 274/274 tests, lint/build đạt; browser trực quan chưa xác minh.

## Kết quả

Shell luôn dùng Sidebar + Header + Main Content. Bỏ drawer/hamburger/overlay/state/handlers mobile và hook theo dõi breakpoint. Sidebar tiếp tục lọc menu bằng locDieuHuongTheoQuyen FE-07; route/active link/skip link/focus khi đổi trang/title vẫn giữ.

Bố cục mặc định Sidebar 248px, Main minmax(0,1fr), nội dung tối đa 1120px. Dưới 1024px Sidebar 200px và Header một cột bằng CSS; giữ các quy tắc wrap/scroll/viewport để thu nhỏ cửa sổ cơ bản. Không thiết kế lại palette Warm Wooden Library, không thêm breakpoint framework hoặc thư viện.

Giữ FE03 Dialog/Table/forms và Radix vì còn dùng trong preview/trang sách. Giữ FE05 API/Query, FE06 JWT memory/login/logout/TTL/401/403, FE07 helper/guard và FE08 CRUD runtime. Các route demo vẫn hoạt động theo cơ chế hiện tại; không đổi Router/Auth Context/API Contract.

## File xóa

- src/bo-cuc/DieuHuongDiDong.jsx.
- src/bo-cuc/useDieuHuongDesktop.js.

Hai file chỉ phục vụ mobile navigation. Đã bỏ import/caller và props/callback onNavigate không còn người dùng.

## File sửa

Các đường dẫn dưới tính từ Frontend, trừ nhóm docs gốc:

- src/bo-cuc/KhungUngDung.jsx: luôn mount Sidebar, bỏ JS responsive và props chỉ phục vụ drawer.
- src/bo-cuc/DauTrang.jsx: bỏ hamburger/drawer; giữ breadcrumb/account/logout.
- src/bo-cuc/ThanhBen.jsx, DieuHuongUngDung.jsx: bỏ callback đóng drawer; giữ bộ lọc quyền và link native.
- src/kieu-dang/khung-ung-dung.css: bỏ selector mobile navigation; desktop grid mặc định và co giãn Header/Sidebar cơ bản.
- src/chuc-nang/khung-ung-dung/khung-ung-dung.test.jsx: bỏ 7 ca mobile/harness, thêm 1 ca resize và điều hướng desktop.
- src/chuc-nang/xac-thuc/phan-quyen.test.jsx: Sidebar permission test và bước điều hướng regression qua desktop.
- src/chuc-nang/api-cong-khai/TrangKiemTraApi.test.jsx: bỏ bước mở/đóng drawer.
- src/chuc-nang/sach/TrangQuanLySach.test.jsx: bỏ bước mở hamburger trong helper, giữ các assertion 401/403.
- README.md: hướng dẫn Shell hiện tại.
- docs/FE04_LAYOUT_ARCHITECTURE.md, docs/FE04_NAVIGATION_GUIDELINES.md: đánh dấu snapshot lịch sử bị thay bởi desktop-first, bỏ link tới file đã xóa.
- docs/DECISIONS.md, docs/TASKS.md, docs/HANDOFF.md ở gốc repo: ghi chỉ dẫn desktop-first, kết quả và bàn giao mới nhất.

Tạo đúng hai tài liệu: docs/FE_DESKTOP_01_TEST_REPORT.md và docs/FE_DESKTOP_01_HANDOFF.md trong Frontend. Không thêm source/component/hook hoặc dependency mới; không đổi tên hàng loạt.

## Kiểm chứng và giới hạn

Baseline 280/280; cuối 274/274 tại 15 file, 0 fail/skip. Số giảm do 7 ca mobile được thay bằng 1 ca resize; không xóa test nghiệp vụ/bảo mật. Chạy tuần tự bằng npm.cmd run test:run -- --maxWorkers=1, rồi npm.cmd run lint và npm.cmd run build; đều đạt. Hai lượt lỗi và cách sửa bước điều hướng test được ghi minh bạch trong report.

Static parse 68 file/201 cạnh import-export tĩnh tương đối không lỗi/casing. Production 10 SPA shells/35 assets trả 200, preview loopback đã đóng; bundle không còn marker drawer/hamburger. Các bước này không thay cho kiểm browser.

Chưa browser thực do host/native pipe unavailable; chưa xác minh trực quan ba kích thước desktop tham chiếu, zoom/AT/thu nhỏ cửa sổ. Chưa Backend/MySQL E2E trong task này. Không truy cập/ghi DB, tạo fixture/account, sửa Backend/schema/API/env/package/lock hoặc khởi động Backend.

Working tree đã có staged/unstaged/untracked từ trước; lưu baseline 269 file, HEAD 8c224e8. Giữ HEAD/index và mọi thay đổi ngoài phạm vi; không stage/unstage/reset/commit/push. Xem test report và TASKS cho kiểm tra bảo toàn cuối.

Bước tiếp: người dùng nghiệm thu desktop trên browser khả dụng, kiểm Sidebar/Header/route/login/logout/403/demo/sách cùng scroll bảng và Dialog. FE08 đã hiện diện và được giữ; không triển khai tính năng mới hoặc FE09. Dừng chờ nghiệm thu.
