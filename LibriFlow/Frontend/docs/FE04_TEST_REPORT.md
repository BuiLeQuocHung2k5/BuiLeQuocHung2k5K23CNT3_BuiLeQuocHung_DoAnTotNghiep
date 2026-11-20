# FE-04 — Test Report

Xác minh **2026-11-20**, Node24.20.0/npm11.19.0, Git baseline `e5562a3` sạch. Đã đối chiếu FE-02/FE-03/QA-01; không dùng kết quả QA thay lần chạy baseline mới. Không Backend/MySQL/JWT thật.

## Kiểm tra tự động

| Kiểm tra | Kết quả |
|---|---|
| Baseline Frontend trước sửa | 78/78 test tại6 file,exit0 |
| npm ls --depth=0 |25 dependency trực tiếp hiện hữu đủ/không invalid hoặc extraneous; không cài/upgrade package |
| npm run lint | Đạt, không tắt rule |
| npm run test:run |100/100 tại7 file:78 cũ +22 mới,exit0 ở lần chạy sạch |
| npm run build | Đạt, có lazy DinhTuyenKhung/DesignSystem và shared UI chunk; không cảnh báo bundle |
| Dev route/module/CSS | `/`, `/app`, `/app/`, `/app/layouts`, `/app/workspace`, `/app/missing`, `/design-system`, route-config module và app-shell CSS trả200, nội dung đúng kiểu |
| Production assets/protected diff |6route200,29/29assets200(gồm24font); protected diff rỗng,46link nội bộ hợp lệ,không encoding/whitespace/secret-pattern issues |

New tests tại [khung-ung-dung.test.jsx](../src/chuc-nang/khung-ung-dung/khung-ung-dung.test.jsx):

- **10 routing/layout**: landmarks/header/sidebar/main/neutral account, active switch + main focus,2 direct index URL có/không trailing slash, scoped/global404, health/Design System giữ hoạt động, skip keyboard, title/restore.
- **7 compact navigation**: media375/768, toggle/close/focus restore, Tab/Shift+Tab/Escape, route selection/focus main, resize375→1280→768 không stale modal/pointer lock, Back khi drawer đang mở.
- **5 preview**: role query không làm chọn role hoặc cấp quyền,3 role chỉ planned labels/không link/không storage/API, selection reset khi đổi page.

78 test trước giữ nguyên source và chạy regression đầy đủ. MediaQueryList được mô phỏng theo breakpoint1024; RTL kiểm DOM/interactions, không đo layout thật. Radix focus behavior dùng primitive thật trong jsdom, không tự mock Dialog để né lỗi.

Lần đầu run99/100, test mới chuyển sang Design System chờ một h1 bất kỳ nên bắt heading cũ trong React lazy transition. Đã sửa **test mới** chờ đúng heading đích; không sửa UI/test cũ để che failure. Lần clean100/100 exit0, không unhandled errors. Active matching sau đó được đối chiếu source Router8 và dùng Link+matchPath để hỗ trợ trailing slash; assertions bổ sung ở test index/404.

Một lần công cụ exec bị reset/timeout trong orchestration; đã kiểm lại file/Git/process trước tiếp tục. Lần khởi động Vite thứ hai báo5173 bận; reuse instance sau xác minh route-config và CSS đúng workspace, không kill process khác. Không tính lần khởi động bị trùng là Vite startup thành công mới.

Kiểm focus bổ sung khi drawer chuyển ra health page đã đạt. Trong chỉnh sửa này lint bắt gán property trên node suy từ prop ref; đã tách nhánh ref còn sống và main mới từ document, dùng DOM API, không tắt rule. Run cuối lint exit0,100/100 test/7file exit0/0fail/không unhandled errors, build exit0/2395modules; Shell lazy18.91kB,Main382.17kB,CSS40.06kB. Protected files và package/lock giữ nguyên; dev5173 giữ, preview4173 dừng. Danh sách kiểm phạm vi tại FE04_HANDOFF.md.

## Browser/responsive — chưa xác minh trực quan

Inventory công cụ trả apps/browsers rỗng, native pipe unavailable và **The browser access host is unavailable**. Chưa chụp screenshot hoặc dùng Chrome/Edge automation. HTTP/RTL/build không được gọi là browser check. 375/768/1280 đã có source strategy và mocked viewport behavior, **chưa đo overflow, computed styles, zoom, font, actual pointer/touch/AT**.

QA-01/FE-03 đã có cùng giới hạn; không đánh dấu các tiêu chí đó đạt chỉ vì task FE-04 có test. Chưa release/security advisory audit mới, không chạy Backend regression hoặc MySQL integration ghi vì FE-04 không sửa những phần đó.

## Checklist Chrome/Edge — FE-03 và FE-04

1. Mở `/app` ở **1280px**: sidebar248px bên trái, header/main không bị che; active menu đúng khi sang layouts/workspace; unknown `/app/missing` giữ Shell404, unknown ngoài app dùng fallback cũ.
2. Thử **768px** rồi **375px**: sidebar đổi thành Menu, header/breadcrumb/account label không tràn; main/cards không cắt. Mở drawer, close/Escape/backdrop đóng đúng; Tab chỉ trong drawer; focus về trigger.
3. Khi drawer mở, chọn route rồi Back/Forward: menu đóng, content đúng, focus main; resize lên1280 rồi quay375/768 không còn overlay/body lock hoặc trigger ẩn giữ focus.
4. Keyboard từ đầu: skip link xuất hiện và đến main; menu/links có focus ring; active có aria-current. Thử zoom200%, text spacing, viewport thấp và reduced motion; không che nội dung hoặc cắt outline.
5. Ở `/app/layouts`, chọn3 preview: chỉ đổi nhóm nhãn, không session/user/URL/storage; item planned không click, header vẫn Tài khoản chưa tích hợp. Query `?role=admin` không tạo trạng thái đã đăng nhập.
6. Từ sidebar mở `/` và `/design-system`, kiểm health page vẫn render và chỉ gọi health khi bấm/cấu hình dịch vụ đúng; không sửa Backend để làm task Layout pass.
7. FE-03 ở375/768/1280: palette/typography/control không tràn; Dialog open/Tab/Escape/focus restore, Toast close và vị trí, Table cuộn vùng riêng, Spinner/Skeleton và reduced motion. Browser/screen reader thực còn phải nghiệm thu.

Sau kiểm thủ công, ghi browser/version/viewport/kết quả và lỗi thực tế trước khi sửa. Không suy CSS review thành kiểm chứng trực quan.
