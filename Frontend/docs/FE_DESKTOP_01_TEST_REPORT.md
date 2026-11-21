# FE-DESKTOP-01 — Test report

Xác minh **2026-11-21**. **Hoàn tất phần lập trình, chờ nghiệm thu.** Chưa kiểm chứng trực quan trong browser.

## Baseline và phạm vi

Đã đọc AGENTS, 5 tài liệu dự án, handoff FE-03 đến FE-08 và đối chiếu source/CSS/tests. HEAD 8c224e8; working tree có staged/unstaged/untracked từ các task trước. Lưu SHA-256 269 file và hash nội dung index trước sửa; giữ các thay đổi có sẵn.

Xóa đúng hai file chỉ phục vụ điều hướng mobile:

- src/bo-cuc/DieuHuongDiDong.jsx: hamburger Menu, overlay/drawer Dialog, state mở/đóng, close reason, refs và xử lý focus sau đóng/chọn route.
- src/bo-cuc/useDieuHuongDesktop.js: useSyncExternalStore/matchMedia và đăng ký/hủy listener breakpoint, chỉ có KhungUngDung sử dụng.

Đã kiểm caller bằng rg trước xóa. Radix Dialog, HopThoai và toàn bộ component dùng chung được giữ; Dialog vẫn phục vụ Design System và form/xóa sách.

## Thay đổi kiểm thử

- [khung-ung-dung.test.jsx](../src/chuc-nang/khung-ung-dung/khung-ung-dung.test.jsx): bỏ 7 ca drawer ở 375/768, open/close/focus trap, chọn route, resize đổi mode và history đóng drawer; bỏ harness matchMedia, listener Set và helper đổi mode. Thêm 1 ca Sidebar/Header giữ nguyên khi resize 1440/900/1366/1920, không hamburger/modal, điều hướng và focus main còn hoạt động. jsdom kiểm DOM/hành vi, không đo layout CSS.
- [phan-quyen.test.jsx](../src/chuc-nang/xac-thuc/phan-quyen.test.jsx): kiểm permission trên Sidebar desktop, thêm grant rồi rút grant vẫn ẩn/hiện đúng. Bỏ phần thao tác drawer; giữ ca guard/403/Admin không bypass và regression login/API 403/logout.
- [TrangKiemTraApi.test.jsx](../src/chuc-nang/api-cong-khai/TrangKiemTraApi.test.jsx): bỏ hai bước mở/đóng drawer khi xác nhận active link; giữ assertion không tự gọi API và các hành vi kiểm API.
- [TrangQuanLySach.test.jsx](../src/chuc-nang/sach/TrangQuanLySach.test.jsx): helper vào sách qua Sidebar, bỏ bước mở hamburger. Giữ đủ 22 ca UI, gồm 401/403.
- Không xóa test nghiệp vụ/bảo mật hoặc nới assertion để bỏ hành vi. Tổng test: **280 − 7 + 1 = 274**, vẫn 15 file.

## Kết quả

Tại Frontend, trước và sau sửa:

~~~powershell
npm.cmd run test:run -- --maxWorkers=1
npm.cmd run lint
npm.cmd run build
~~~

| Kiểm tra | Kết quả |
| --- | --- |
| Baseline | 280/280 tests, 15 file; lint/build đạt. |
| Bản cuối | **274/274 tests**, 15 file, 0 fail/skip; lint/build exit 0. |
| Regression | AppShell/Sidebar/Header, active route, focus/skip link/title/404, role preview và demo; FE03 shared UI/Dialog, FE05 API, FE06 auth memory/login/logout/401, FE07 permission/403, FE08 sách đều đạt trong suite. API transport dùng mock, không Backend thật. |
| Static | Parse 68 JS/JSX/MJS bằng Babel parser hiện có; 201 cạnh import/export tĩnh tương đối tồn tại/đúng casing, không lỗi cú pháp. Không tuyên bố đã kiểm toàn bộ đồ thị dynamic import/cycles bằng bước này. |
| Production HTTP | 10 SPA shells và 35 assets trả 200; preview 127.0.0.1 cổng OS cấp đã đóng. Không coi shell 200 là browser/route guard pass. |
| Bundle | Không còn app-navigation-drawer, app-menu-toggle, app-shell--compact hoặc nhãn mở hamburger. CSS Dialog dùng chung vẫn có. |

Các lượt chưa đạt được ghi riêng:

1. Trước sửa, chạy test mặc định gặp 2 timeout findByRole ở lần tải route lazy Shell và Design System: 278/280. Chạy lại toàn bộ tuần tự đạt 280/280; không đổi timeout, test setup hoặc config.
2. Lượt hồi quy đầu sau sửa: 271/274, 3 ca FE05/FE08 còn click hamburger đã bỏ. Chuyển các bước đó sang Sidebar, giữ assertion nghiệp vụ/phiên/lỗi; chạy lại toàn bộ đạt 274/274. Lint/build sau lượt cuối đạt. Không tính lượt lỗi là pass.

## CSS và chức năng được giữ

[CSS Shell](../src/kieu-dang/khung-ung-dung.css) bỏ 10 selector riêng compact/drawer/menu và selector mode desktop; Sidebar 248px chuyển thành cấu hình grid mặc định. Dưới 1024px chỉ dùng CSS: Sidebar 200px, Header một cột; không JS chuyển mode hoặc overlay.

Giữ grid minmax(0,1fr), min-width:0, max-width nội dung 1120px, breadcrumb wrap, account wrap và giới hạn account 26rem; giữ các media queries an toàn 1199/900/639. CSS FE03/FE06/FE08 không đổi: bảng cuộn ngang, form/Dialog giới hạn viewport và form co cột khi cửa sổ hẹp. Không đổi palette/font/tokens hoặc API component.

FE06 provider/services/hook/login/Auth tests, FE07 helper/guard, Router/config routes, FE05 API layer/services/hooks và FE08 runtime giữ hash baseline. Không thêm thư viện, thay package/lock/env hoặc truy cập Backend/database.

## Chưa xác minh

- Browser inventory trả apps/browsers rỗng, native pipe và browser access host unavailable. Chưa quan sát bố cục **1366×768, 1440×900, 1920×1080**, zoom/keyboard/AT hoặc tên tài khoản rất dài trên trình duyệt thật.
- Chưa chạy Authentication/CRUD end-to-end với Backend/MySQL thật trong task; không tạo account/fixture, gọi ghi DB hoặc dùng môi trường chính.
- Cửa sổ hẹp vẫn giữ Sidebar; không còn điều hướng chuyên biệt điện thoại. Cần nghiệm thu desktop thực và thu nhỏ cửa sổ để quan sát cuộn bảng, Header, form/Dialog và Sidebar.

[Handoff](FE_DESKTOP_01_HANDOFF.md) ghi danh sách file và bước tiếp theo.

Kiểm tra bàn giao cuối: chỉ 15 file hiện hữu sửa, 2 file mobile xóa và 2 tài liệu mới. **252/252 file baseline còn lại**, gồm **108/108 Backend**, khớp SHA-256. HEAD và hash git ls-files --stage -z không đổi. 118 liên kết nội bộ tại 8 tài liệu tồn tại; UTF-8/whitespace và git diff --check đạt. Không còn caller/selector mobile đã loại bỏ trong src.
