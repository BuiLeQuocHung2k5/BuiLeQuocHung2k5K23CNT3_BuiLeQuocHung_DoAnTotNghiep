# Bàn giao FE-04

Ngày xác minh **2026-11-20**. Đã triển khai Application Layout/Responsive Navigation/Routing trong phạm vi; **chờ nghiệm thu**, browser/responsive thực chưa xác minh do công cụ không khả dụng. Không Authentication hoặc FE-05.

## Kết quả

Một KhungUngDung dùng lại, aside desktop/header/main Outlet/footer/skip link, drawer Radix ở mobile/tablet. Navigation/metadata tập trung; active route/aria-current, focus khi route đổi, Escape/close/resize/history và neutral account slot. `/app` chỉ giới thiệu cấu trúc, `/app/workspace` placeholder kỹ thuật duy nhất, `/app/layouts` preview3 role có nhãn rõ; không có nghiệp vụ hoàn thiện giả.

`/` health FE-02 và `/design-system` FE-03 giữ nguyên route/flow/test. Không role guard/token/useAuth/mock session hoặc API mới; preview không dùng query role hay storage. Tái dùng Button/Icon/Card/Badge/Select/Alert/EmptyState/Dialog FE-03, không thay component API/tokens. Các giới hạn auth/Backend QA-01 là task riêng theo feature, không gate render Shell độc lập hiện tại.

## File

Tạo:

- `src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js`, `src/ung-dung/dieu-huong/cau-hinh-bo-cuc-vai-tro.js`.
- `src/bo-cuc/{KhungUngDung,DauTrang,ThanhBen,DieuHuongUngDung,DieuHuongDiDong}.jsx`, `src/bo-cuc/useDieuHuongDesktop.js`.
- `src/chuc-nang/khung-ung-dung/{DinhTuyenKhung,TrangTongQuanUngDung,TrangXemThuBoCuc,TrangNoiDungMau,TrangKhongTimThayTrongKhung}.jsx`, `khung-ung-dung.test.jsx`.
- `src/kieu-dang/khung-ung-dung.css`.
- `docs/FE04_{LAYOUT_ARCHITECTURE,ROUTING_MAP,NAVIGATION_GUIDELINES,TEST_REPORT,HANDOFF}.md`.

Sửa: DinhTuyenUngDung thêm lazy branch, TrangNenTang chỉ thêm Link, kieu-dang/toan-cuc.css chỉ import CSS mới, README và docs/PROJECT_CONTEXT,DECISIONS,TASKS,HANDOFF. Không package/lockfile/config/env/API/Backend/DB hoặc tài liệu/test cũ. Baseline Git `e5562a3` sạch, giữ mọi nội dung QA-01 đã bàn giao.

## Quyết định kỹ thuật

- Routes `/app` độc lập với root kỹ thuật để giữ regression; index không redirect, scoped404 không tạo main lồng nhau. Lazy branch để root không tải toàn bộ Shell.
- Một config dieuHuongNenTang dùng chung desktop/drawer; role preview map là planned labels không to. KhungUngDung có thể nhận groups khác khi nhiệm vụ auth tương lai có policy thật.
- Breakpoint1024px (CSS và useSyncExternalStore/matchMedia);375/768 dùng drawer,1280 aside248px. Không collapsed sidebar hoặc persistent UI state chưa cần.
- Drawer dùng Dialog hiện hữu, route-key remount đóng menu trên history; ordinary dismiss trả trigger, chọn route/resize/remount focus main. Không tự viết trap.
- Không dependency mới; React state cục bộ và thư viện đã có đủ. QA-01 gates auth/dev users không được dùng để tự cấu hình Backend trong FE-04 chỉ layout.

Chi tiết: [architecture](FE04_LAYOUT_ARCHITECTURE.md), [routing](FE04_ROUTING_MAP.md), [guidelines](FE04_NAVIGATION_GUIDELINES.md).

## Kiểm tra và giới hạn

Baseline78/78 đạt;100/100 tại7 file sau bổ sung22 test mới, lint/build đạt ở lần sạch. Existing78 test không sửa/xóa. Một test lazy navigation mới đã sửa cách chờ heading đúng sau run99/100; source matching hỗ trợ trailing slash, không relax assertion để bỏ hành vi. [Test report](FE04_TEST_REPORT.md) có nhóm coverage và checklist.

Dev routes/module/CSS200. Browser/native host unavailable: chưa đo/quan sát375/768/1280, zoom, touch, reduced motion hoặc screen reader thực. Không coi mocked matchMedia/RTL là visual acceptance. Frontend không cần Backend để render; health Backend/auth thật không được kiểm lại trong FE-04.

Kiểm cuối: lint exit0; **100/100 test tại7file,0fail/không unhandled errors**; build exit0,2395modules, không cảnh báo bundle. MainJS382.17kB/gzip122.03, DinhTuyenKhung lazy18.91kB/gzip6.42, DesignSystem17.85kB và shared UI48.14kB, CSS40.06kB/gzip8.48. Không suy kích thước build thành Web Vitals đã đo.

Production preview6 đường dẫn200 và **29/29 assets200**, gồm24font files; CSS có Shell/breakpoint1024/tokens. Preview4173 tạm đã dừng, dev5173 `/app`200 giữ cho người dùng. HTTP200 ở unknown path là SPA fallback, không phải browser render hoặc server404.

README +5 docs FE04 có **46 link nội bộ hợp lệ**, không lỗi encoding/whitespace. Git diff-check đạt; protected diff rỗng cho toàn Backend,package/lock/config/env.example,HTTP/query/provider/App,component/token/styles FE03,DesignSystem,test setup/6file test cũ,tài liệu FE01/02/03 và QA01. Có **20file mới(15source/test/style+5docs),8file cũ sửa(4Frontend+4docsroot)**, không thay đổi ngoài whitelist. Rà mẫu JWT/private-key/credential-URL không phát hiện secret thật trong phần thay đổi; không phải security audit. Git chỉ cảnh báo LF/CRLF theo cấu hình sẵn có.

Luồng focus khi chọn health từ drawer cũng được test: Shell tháo khỏi DOM, main mới vẫn nhận focus. Lint đã bắt việc gán property trên node xuất phát từ prop ref ở nhánh dự phòng; tách nhánh mainRef/fallback document và dùng DOM API rõ ràng, lint chạy lại đạt, không disable rule.

Không chạy MySQL hoặc thay API/grants/accounts/schema. QA-01 advisory/browser/feature dependencies vẫn giữ trạng thái riêng, không tự đánh dấu đã giải quyết. Backend unit/integration mới không chạy vì không sửa Backend; bảo toàn được kiểm bằng diff với baseline Git sạch.

## Nghiệm thu và bước tiếp

Đạt phần triển khai/kiểm tra tự động sau kiểm cuối; chờ người dùng nghiệm thu và kiểm trực quan theo checklist Chrome/Edge bao gồm FE-03. FE-05 chỉ bắt đầu sau chỉ dẫn mới và scope được giao; auth/authorization theo nhiệm vụ riêng FE-06/FE-07, phải dựa principal/quyền Backend thật. Không mặc định việc chọn preview hoặc ẩn menu là quyền truy cập.

Không triển khai ThanhBen nghiệp vụ theo quyền thật, Dashboard/Catalog/Login/Logout/mượn-trả/user management hoặc FE-05. Dừng sau bàn giao, giữ dev local cho người dùng nếu instance đang phục vụ đúng workspace.
