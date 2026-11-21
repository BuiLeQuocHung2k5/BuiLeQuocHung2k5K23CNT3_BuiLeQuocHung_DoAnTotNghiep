# FE-07 — Handoff

Xác minh **2026-11-21**. Hoàn tất phần lập trình cơ chế phân quyền trên nền FE-06; **dừng chờ nghiệm thu**. Frontend 232/232 tests, lint/build đạt. Chưa chứng nhận phân quyền end-to-end với Backend thật. [Test report](FE07_TEST_REPORT.md).

## Cơ chế

[kiem-tra-quyen.js](../src/chuc-nang/xac-thuc/kiem-tra-quyen.js) nhận user từ Context và yêu cầu { vaiTro?: string[], quyen?: string[] }:

- Hỗ trợ role admin/librarian/reader và 12 tên permission đã đối chiếu seed/matrix. Không có bảng grant mặc định theo role, không admin bypass.
- Một trong các role được yêu cầu, tất cả permissions được yêu cầu; nếu khai báo cả hai thì phải đạt cả hai.
- Đọc trực tiếp user.roles/user.permissions; custom grant trên role đã biết được tôn trọng. Không lấy quyền từ JWT, URL hoặc lựa chọn preview.
- Với yêu cầu quyền, user phải active, có ít nhất một role hỗ trợ và arrays đúng cấu trúc. Role/permission yêu cầu lạ, metadata rỗng/sai hoặc dữ liệu thiếu đều từ chối.
- Không khai báo yêu cầu quyền thì giữ trang dùng chung cho mọi user đã đăng nhập. Khai báo object rỗng/null không được coi là “không yêu cầu”.
- locDieuHuongTheoQuyen dùng cùng điều kiện, ẩn item không đủ quyền và bỏ nhóm rỗng. Sidebar và drawer đều đi qua DieuHuongUngDung.

Ví dụ cấu hình cho một trang thực sự cần report_view khi được triển khai sau này: yeuCauTruyCap = { quyen: ['report_view'] }. Guard có prop cùng tên hoặc đọc metadata của route khớp chính xác trong cacTrangTrongKhung; menu sao chép điều kiện từ metadata route. Route con/động khi thêm mới cần đặt guard và điều kiện đúng phạm vi, không chỉ dựa vào việc ẩn menu.

## Route hiện hữu

| Route | Policy hiện tại |
| --- | --- |
| /dang-nhap | FE-06 public, đã đăng nhập thì về /app. |
| /app, /app/ | Bất kỳ user đăng nhập; chưa có permission riêng cho khung. |
| App path chưa khai báo | Chưa đăng nhập về login; đã đăng nhập thấy 404 trong shell. |
| /app/layouts, /app/workspace, /app/api-check | Giữ public kỹ thuật như FE-06, gồm trailing slash. |
| /, /design-system | Giữ trang kỹ thuật công khai. |
| /403 | Yêu cầu đăng nhập, hiển thị thông báo và nút về /app. |
| Route có yeuCauTruyCap | Chưa login về /dang-nhap; đủ điều kiện render children; thiếu quyền render TrangKhongCoQuyen ngay tại URL đó, không mount children hoặc redirect loop. |

Yêu cầu quyền luôn ưu tiên hơn flag demo. **Hiện không có business route yêu cầu grant riêng**, nên không gán quyền mới lên demo hoặc tạo trang nghiệp vụ. /403 là route thông báo lỗi, không phải chức năng nghiệp vụ.

## Menu và thao tác

Nhóm “Không gian ứng dụng” chỉ có /app và cần đăng nhập. Nhóm “Công cụ phát triển” gồm /app/layouts, /app/workspace, /app/api-check, / và /design-system; anonymous vẫn truy cập được.

Ba role hiện thấy cùng danh sách thật vì các trang đều dùng chung hoặc public. Không tạo menu quản trị/CRUD chưa có route. Menu sẽ được lọc theo grant nếu item/route có yeuCauTruyCap. Role preview chỉ minh họa, không thay principal hoặc cấp quyền.

Các nút hiện hữu chỉ phục vụ auth, public GET, hủy query và demo Design System; không có action nghiệp vụ cần permission để ẩn/chặn API. Chưa thêm CRUD hoặc component abstraction cho action chưa có. Khi thêm action thật, dùng cùng helper và kiểm trước khi gửi; Backend vẫn quyết định quyền và scope dữ liệu.

## File tạo/sửa

Tạo:

- src/chuc-nang/xac-thuc/kiem-tra-quyen.js
- src/chuc-nang/xac-thuc/kiem-tra-quyen.test.js
- src/chuc-nang/xac-thuc/phan-quyen.test.jsx
- src/trang/TrangKhongCoQuyen.jsx
- docs/FE07_TEST_REPORT.md, docs/FE07_HANDOFF.md (trong Frontend).

Sửa:

- src/chuc-nang/xac-thuc/BaoVeDangNhap.jsx: thêm kiểm role/permission và render 403 trước children.
- src/bo-cuc/DieuHuongUngDung.jsx: áp bộ lọc chung cho desktop/drawer.
- src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js: tách tools, metadata menu đồng bộ với route.
- src/ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx: thêm /403 có auth guard.
- docs/TASKS.md, docs/HANDOFF.md ở gốc repo theo AGENTS.

Giữ nguyên file FE-06 provider/login/service/hook/Auth tests/Header/API client, token memory/TTL/401/403/logout và toàn bộ 182 test cũ. Không thêm thư viện, sửa Backend/database/schema/API contract/env/package/lock hoặc đổi tên hàng loạt.

## Kiểm tra và trạng thái Git

Baseline 182/182; cuối 232/232 tại 13 file, 50 tests mới FE-07 đạt trong full suite (targeted trước case cuối 49/49). ESLint/build đạt; static 65 file/172 cạnh import/214 bindings, không lỗi/casing/cycle. Production preview tạm: 9 SPA shells/31 assets 200, server đã đóng; không coi shell HTTP là guard/browser pass.

108 file Backend và tổng 164 file được bảo vệ khớp SHA-256 baseline. Index đã có thay đổi được stage trước task; giữ nguyên index/HEAD và mọi thay đổi BE-AUTH-SETUP-01/FE-06. Không reset/unstage/stage/commit/push. Chi tiết lỗi test harness đã sửa và giới hạn ở test report.

Delta FE-07: 6 file hiện hữu sửa, 6 file mới, không xóa, đúng whitelist. 41 local links tại 4 docs, UTF-8/whitespace/diff-check đạt; không có marker test FE07 trong bundle production.

## Giới hạn và điều kiện FE-08

- Không có Backend dev/account hoạt động hoặc browser host; chưa E2E với grant thật, chưa quan sát responsive/AT/Network browser.
- Quyền UI là snapshot me sau login; không thêm refresh/poll. Backend kiểm live mỗi request, xử lý HTTP 403 giữ phiên như FE-06.
- Principal chỉ có role chưa biết bị từ chối ở chức năng có yêu cầu quyền, kể cả khi Backend có thể cấp grant; cần đối chiếu và cập nhật catalog khi mở rộng role/permission.
- Chưa kiểm business page/action vì chưa được triển khai; giữ scope own, trạng thái dữ liệu và kiểm quyền Backend khi xây chức năng thực.

FE-08 chỉ bắt đầu khi người dùng giao task mới sau nghiệm thu. Trước nghiệm thu E2E cần Backend dev/MySQL cô lập được vận hành riêng, JWT/account/grants phù hợp và browser khả dụng; không dùng main hoặc tự tạo tài khoản. Task tiếp theo phải xác định API/route/action đã có và yêu cầu quyền cụ thể trước khi gán policy. Không tự triển khai FE-08.
