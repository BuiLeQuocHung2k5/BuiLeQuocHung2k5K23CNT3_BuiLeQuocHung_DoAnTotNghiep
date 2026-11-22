# Quyết định và căn cứ

## HOTFIX UI-04 — Hồ sơ tự phục vụ (2026-11-22)

Theo phạm vi người dùng giao, cập nhật hồ sơ chỉ theo ID phiên JWT và dùng các cột hiện hữu. Upload nhị phân JPEG/PNG/WebP giúp giữ dữ liệu ảnh trong kho cục bộ và chỉ ghi URL vào MySQL. `/admin` là đường dẫn chuyển tiếp qua cùng guard đang dùng. Phần code đã triển khai, chờ nghiệm thu Chrome. [Hợp đồng API](../Backend/docs/xac-thuc-api.md).

## HOTFIX-UI-02 — Chính sách đăng ký demo và trang chủ (2026-11-22)

- Người dùng chỉ định đăng ký demo4–12 ký tự, không complexity; triển khai đồng bộ FE/BE, không thay hash/JWT/role/mật khẩu cũ hoặc login1–72byte. Đây là chính sách demo local, không phải khuyến nghị public Internet. Căn cứ source: TrangDangKy.jsx, Backend/src/utils/kiem-tra-xac-thuc.js; phần code hoàn tất, chờ nghiệm thu UI.
- Theo yêu cầu, Sidebar bỏ nhóm tools, vẫn giữ technical routes/components cho bảo trì; homepage chỉ lấy sách thật và dùng grants FE07. Không thêm API/thống kê giả. [Kiểm tra/giới hạn](TASKS.md).

## HOTFIX-AUTH-01 — Luồng vào sản phẩm và đăng ký (2026-11-22)

- Căn cứ: người dùng yêu cầu `/` theo phiên, đăng ký public chỉ độc giả, giữ JWT memory và dữ liệu FE14. Triển khai trong phạm vi đã giao, chờ nghiệm thu: root→login/app, FE02→`/kiem-tra-nen-tang`, giữ các route thử nghiệm khác.
- Dùng API auth/register có sẵn, không endpoint/schema mới; Backend tự quyết reader và unique email. Frontend không tự login sau đăng ký. Một fixture demo được tạo theo cho phép kiểm thử của task; checksum các dữ liệu nghiệp vụ giữ nguyên. [Bằng chứng/giới hạn](TASKS.md).

## FE-14 · ISBN và môi trường demo · 22/11/2026

Theo yêu cầu nghiệp vụ đã duyệt, ISBN nhận dạng đầu sách, barcode nhận dạng từng bản sao. Hợp đồng giữ ISBN dạng chuỗi, cho phép null và bảo toàn số 0 đầu hoặc X của ISBN-10. Đã triển khai schema chuẩn, migration có kiểm tra xung đột và kiểm tra dùng chung ở React/Express. Bản demo sử dụng schema riêng trên MySQL local, tài khoản runtime giới hạn trong schema đó và dữ liệu trình diễn có đánh dấu. SMA7 tiếp tục dùng preview Backend. [Schema và migration](../Backend/sql/README.md) · [Kết quả](../Frontend/docs/FE14_HANDOFF.md)

## GIT-002 — Giữ cấu trúc gốc và tắt đồng bộ tự động (2026-11-21)

- Theo task người dùng, chỉ xử lý conflict có bằng chứng và không commit/pull/push/abort. Đã xác minh mọi blob remote ở đường dẫn quy đổi trùng HEAD hoặc local cũ `8c224e8`; giữ bản local hiện hành và các lần xóa mobile có chủ đích của FE-DESKTOP-01. Không đổi nghiệp vụ/schema.
- Tạm đặt `vscode-autoGit.enabled=false` trong `.vscode/settings.json` để ngăn tiện ích tự commit/sync khi sửa merge; backup chứa cấu hình trước sửa. Không tự bật lại hoặc hoàn tất commit. Upstream `main → origin/main` đã đúng, giữ nguyên.
- Nguồn kiểm tra và trạng thái chờ duyệt: [GIT-002](TASKS.md), [bàn giao](HANDOFF.md); kế hoạch đối chiếu từng file trong backup độc lập được chỉ rõ ở task.

## FE-DESKTOP-01 — Ưu tiên desktop (2026-11-21)

- Căn cứ: người dùng yêu cầu tinh giản Frontend, giữ Sidebar + Header + Main, ưu tiên laptop/desktop và không tiếp tục giao diện điều hướng riêng cho điện thoại. Chỉ dẫn đã được xác định trong task; phần lập trình chờ nghiệm thu.
- Bỏ drawer/hamburger, state/callback mobile và hook matchMedia chỉ dành cho chuyển chế độ điều hướng. Sidebar luôn mount, tiếp tục dùng bộ lọc quyền FE-07; route guard và session FE-06 giữ nguyên.
- Sidebar mặc định 248px; cửa sổ dưới 1024px dùng 200px và Header xếp hàng bằng CSS. Giữ media queries bảo vệ nội dung, bảng cuộn ngang và giới hạn form/Dialog; không thay tokens, thư viện hoặc logic nghiệp vụ.
- [Handoff](../Frontend/docs/FE_DESKTOP_01_HANDOFF.md) và [test report](../Frontend/docs/FE_DESKTOP_01_TEST_REPORT.md) ghi kiểm tra/giới hạn. Không đổi Backend/database/API; không triển khai FE-09 hoặc commit/push.

## BE-AUTH-SETUP-01 — thực thi phạm vi đã duyệt (2026-11-21)

- Căn cứ: người dùng phê duyệt có điều kiện tiếp tục đúng kế hoạch một instance test mới, tối đa hai fixture, 10 scenario, cleanup; không mở rộng sang main/runtime/API/schema nguồn/Frontend hoặc FE-06. Gate mục 6 đã được đáp ứng cho lần chạy này.
- Tái dùng runner/suite hiện hữu; bổ sung kiểm tra identity/path/bind và SELECT/SHOW GRANTS lấy bằng chứng quyền/fixture cleanup thực tế. Không đổi suite 10 scenario hoặc runtime để ép pass.
- Đã thực thi thành công: 10/10 scenario, runtime SQL ba quyền, 2 fixture inactive, instance đã dừng; main snapshot/identity và Frontend không đổi. [Test report](backend-auth-setup/BE_AUTH_SETUP_01_TEST_REPORT.md), [evidence](backend-auth-setup/evidence/BE_AUTH_SETUP_01_2026-11-21.json).
- Session memory-only theo mục 14 giữ nguyên. Đủ bằng chứng Backend auth để bắt đầu xây dựng FE-06 sau nghiệm thu; Backend dev riêng cho browser chưa được cấp. Không lấy credential từ logs, không đổi JWT_SECRET/DB_* main hoặc tạo account ở main.
- Dừng chờ nghiệm thu, không tự chạy thêm hoặc mở rộng phạm vi. Snapshot ngày 2026-11-20 bên dưới là lịch sử.

## BE-AUTH-SETUP-01 — chuẩn bị auth và gate provision (2026-11-20)

- Mục 6 yêu cầu dừng và xin phê duyệt trước tạo database/thay quyền cấp instance. Phần chuẩn bị đã xong; chưa phê duyệt hoặc thực thi provision.
- Tái dùng runner TASK-018 với nhánh --auth-only và cờ --allow-create-isolated; thiếu một cờ sẽ dừng trước startup. Giữ UUID/grants/marker/fingerprint rails; không dùng legacy full-suite để né gate. Main chỉ SELECT; test runtime sau setup dự kiến còn SELECT/INSERT/UPDATE.
- Chuẩn bị 10 scenario, hai fixture reader/staff; không admin, không sửa role permissions. JWT test CSPRNG trong RAM qua seam getSecret, không dùng production secret hoặc sửa .env.
- **Mục 14 đã chỉ định memory token, không localStorage/sessionStorage, reload login lại và không refresh.** Tài liệu áp dụng chỉ dẫn mới; “đề xuất chưa duyệt” trong BE-AUTH-PREP là lịch sử. Chưa triển khai Frontend; phân loại 403 theo code, không global logout mọi 403.
- Căn cứ: [database plan](backend-auth-setup/BE_AUTH_SETUP_01_TEST_DATABASE.md), [session policy](backend-auth-setup/BE_AUTH_SETUP_01_SESSION_POLICY.md), [verification](backend-auth-setup/BE_AUTH_SETUP_01_TEST_REPORT.md). Unit 178/178, targeted auth 18/18 và static checks đạt; integration MySQL mới chưa chạy. Không thay algorithm/claims/TTL/hash/middleware/API/schema nguồn hoặc Frontend/FE-06.

## BE-AUTH-PREP-01 — chuẩn bị Auth FE06 (2026-11-20)

- Người dùng cho phép audit rồi bổ sung test/tài liệu, chỉ chạy ghi trên môi trường cô lập đã xác minh; không sửa auth/JWT/password/middleware/contract/schema/Frontend hoặc tạo account main. Đã thực hiện phạm vi an toàn, chờ nghiệm thu.
- Giữ HS256, claims, issuer/audience,900giây,bcrypt12,principal/RBAC và stateless logout hiện hữu. TEST_DB_* thiếu, nên không tự chạy setup/instance-isolee vì chúng có provision/DDL/seed. Runner từ chối trước ghi là safety result, không phải integration pass.
- Tái dùng 172 tests, thêm3 test HTTP/crypto với model RAM và database stub chặn SQL: password whitespace, register limiter và CORS Authorization. Cuối175/175 đạt; smoke current config với proxy read-only9/9 đạt. Không thay source/runtime config.
- [Session policy](backend-auth-prep/BE_AUTH_PREP_01_SESSION_POLICY.md) memory-only/reload login lại, xử lý401/403/cache/multi-tab chỉ là **đề xuất chưa được duyệt**. Không chọn localStorage/cookie/refresh hoặc persistence trong task này.
- [Test accounts](backend-auth-prep/BE_AUTH_PREP_01_TEST_ACCOUNTS.md) tối đa3 account có ownership/run manifest, chỉ target riêng; operator cần cấp môi trường/secret/account trước kiểm MySQL thật. Chưa có credential hoặc account DB mới được tạo/bàn giao.
- Căn cứ [audit](backend-auth-prep/BE_AUTH_PREP_01_AUDIT.md), [verification](backend-auth-prep/BE_AUTH_PREP_01_TEST_REPORT.md), [handoff](backend-auth-prep/BE_AUTH_PREP_01_HANDOFF.md). Có thể giao FE06 riêng theo contract, chưa đủ điều kiện nghiệm thu auth end-to-end; không tự triển khai.

## FE-RENAME-01 — Quy ước tên Frontend (2026-11-20)

- Người dùng yêu cầu Việt hóa tên file/thư mục/định danh nội bộ, không đổi chức năng/API/UI. Đã thực hiện theo phạm vi được giao, chờ nghiệm thu; thay quy ước tên nội bộ Frontend trước đó bằng tiếng Việt không dấu, component PascalCase, hook camelCase có use, utility kebab-case.
- Giữ src/main.jsx, App.jsx/App.test.jsx và các file/package/API hệ sinh thái. Giữ mọi props/object/JSON keys, member API, URL routes, HTTP/env/role identifiers, literal cache keys và CSS classes/tokens. Local binding dùng alias khi cần giữ key; chỉ named export/mock export module Frontend đổi đồng bộ.
- Bảng ánh xạ được lập trước mutation; áp dụng theo AST/scope và đường dẫn file cụ thể. Không wrapper tương thích đường dẫn cũ, alias Vite mới, dependency hoặc thay đổi kiến trúc. Tài liệu trước giữ số đo lịch sử, chỉ cập nhật reference Frontend; evidence QA01 không đổi.
- Căn cứ: [mapping](../Frontend/docs/FE_RENAME_01_MAPPING.md), [verification](../Frontend/docs/FE_RENAME_01_TEST_REPORT.md). AST57/CSS5 khớp,129cạnh import,0cycle/case mismatch; baseline/cuối152test, lint/build đạt. Có timeout lazy shell trong một lượt đồng thời; không đổi timeout/assertion để che lỗi. Browser/Linux thực chưa xác minh.
- Không có quyết định mới về auth/token persistence, Backend/DB hoặc FE06. Chờ nghiệm thu FE-RENAME-01 và chỉ nhận nhiệm vụ tiếp theo khi người dùng giao.

## FE-05 — Public API integration (2026-11-20)

- Người dùng giao FE05: chuẩn hóa API layer, không Backend/DB/auth/nghiệp vụ/FE06. Các lựa chọn sau đã triển khai trong phạm vi được giao, chờ nghiệm thu; chưa có quyết định được duyệt về token storage hoặc sửa Backend.
- Giữ Axios FE02/QueryClient/provider: đã đủ base origin/timeout/full response/error/AbortSignal. Error utility riêng cho UI giữ status/code và non-enumerable cause, không echo raw Backend message hoặc tự toast/logout/redirect. Không thêm dependency.
- Chỉ tích hợp 3 GET public đã kiểm source và runtime: health/books/categories. Tái dùng health service, thêm 2 list services; canonical params dùng chung key/request. Hooks mặc định enabled false, retry false, stale 30 giây, GC 5 phút, không focus/reconnect/mount refetch. Trang chạy thủ công có cancel/paused, không mock fallback hoặc protected call.
- /app/api-check dùng route metadata FE04 và lazy page riêng để không tăng tải module kiểm API khi mở khung. Giữ tests/tokens/contract cũ; không tạo hàng loạt services.
- Auth boundary chỉ thiết kế theo Bearer 900 giây/me/logout không revoke/không refresh trong source. JWT hiện configured=false; chưa có account test được bàn giao, QA01 users=0 chưa tái SELECT. Cần task riêng và session policy trước nghiệm thu FE06.
- Căn cứ [architecture](../Frontend/docs/FE05_API_ARCHITECTURE.md), [queries](../Frontend/docs/FE05_QUERY_CONVENTIONS.md), [errors](../Frontend/docs/FE05_ERROR_HANDLING.md), [verification](../Frontend/docs/FE05_TEST_REPORT.md). 152 tests/lint/build đạt; browser UI/Network thực chưa xác minh. Không tự mở FE06.

## FE-04 — Application Layout/Navigation/Routing (2026-11-20)

- Người dùng giao FE-04 chỉ layout/routing, không auth/nghiệp vụ/Backend/DB; đây là scope cụ thể sau QA-01. Gates JWT/devaccount của QA-01 áp khi auth thật, không yêu cầu tự cấu hình Backend để render khung. Đã triển khai trong phạm vi được giao, chờ nghiệm thu.
- Giữ / và /design-system; thêm lazy /app/* với một KhungUngDung/Outlet,3 page cấu trúc/role preview/placeholder và scoped404. Navigation metadata dùng chung, Link+matchPath hỗ trợ end/trailing slash/aria-current; không redirect hoặc route giả cho mọi feature.
- Desktop breakpoint1024px dùng aside248px, mobile/tablet dùng Dialog FE-03/Radix drawer; matchMedia qua useSyncExternalStore, state open cục bộ. Route-key remount/resize tháo modal, focus main; Escape/close trả trigger. Không store/persistence hoặc focus-trap tự viết.
- Role layouts chỉ planned labels, không URL link nghiệp vụ/role query/default account/authorization. Một Shell nhận navigationGroups để mở rộng khi feature auth sau có policy thật. Tái dùng Button/Icon/Card/Badge/Dialog và tokens, không thêm/nâng package.
- Căn cứ: [FE04_LAYOUT_ARCHITECTURE](../Frontend/docs/FE04_LAYOUT_ARCHITECTURE.md), [routing](../Frontend/docs/FE04_ROUTING_MAP.md), [guidelines](../Frontend/docs/FE04_NAVIGATION_GUIDELINES.md), [tests](../Frontend/docs/FE04_TEST_REPORT.md). 100 test/lint/build đạt; browser375/768/1280 chưa khả dụng nên nghiệm thu trực quan còn mở. Không tự FE-05/06/07.

## QA-01 — giới hạn tối ưu an toàn (2026-11-19)

- Theo yêu cầu QA-01 của người dùng: audit trước sửa; chỉ cleanup cục bộ có kiểm chứng, sửa tài liệu theo source; giữ nghiệp vụ/API/auth/locking/schema/dependencies. Đã tái dùng docJsonYeuCau cho sách và sửa assertion đường dẫn DB sau refactor;172/78 test trước/sau đạt. Inventory UTF-8 được biên soạn lại vì bytes đã mất ký tự và thiếu contract, không sửa Backend để khớp tài liệu.
- Không dựng instance/seed hoặc chạy integration ghi khi chưa xác minh môi trường được phép; không đổi CORS/JWT/grants/note/forecast gate. Các đề xuất Backend/operator/UI/security còn mở **chưa được duyệt để thực hiện**. Không có quyết định mới về auth persistence, policy tiền phạt, schema hoặc kế hoạch FE-04.
- Căn cứ [findings](quality-audit/QA01_BACKEND_FINDINGS.md), [optimization log](quality-audit/QA01_OPTIMIZATION_LOG.md), [verification](quality-audit/QA01_VERIFICATION_REPORT.md). Phạm vi QA-01 đã thực hiện, chờ nghiệm thu; không tự chuyển FE-04.

## FE-03 — Warm Wooden Library Design System (2026-11-19)

- Người dùng giao FE-03 với palette walnut/coffee/caramel/cream/ivory/espresso/sage, semantic tokens,15 nhóm component và preview; cho phép thư viện UI phục vụ trực tiếp React, không Backend/DB/contract/FE-04. Đã triển khai trong phạm vi đó, chờ nghiệm thu.
- Chọn React+CSS/Tailwind4 semantic @theme inline, native Select/Checkbox, không shadcn generator hoặc bộ thư viện trùng chức năng. Radix Dialog giữ focus trap/Escape/return focus; Sonner cho Toast; Lucide import từng icon; hai Fontsource family tự host subsetLatin/Vietnamese, font-display swap/fallback, không CDN lúc chạy.
- Typography Be Vietnam Pro cho UI và Lora cho brand/section; contrast dùng tone riêng, không mặc định sage/caramel làm chữ nhỏ trên nền sáng. Hai border neutral/info được làm đậm sau kiểm tra để đạt3:1;24 test đọc token thật đảm bảo16 cặp text4.5 và8 cặp boundary/focus3. Disabled/decorative có phạm vi riêng, không tuyên bố WCAG toàn phần.
- Thêm lazy route /design-system và singleton Toaster trong provider hiện hữu; QueryClient/HTTP/auth/env policy giữ nguyên. Health FE-02 chỉ thêm Link, không sửa lỗi Backend. Dữ liệu preview trung tính/UI-only. Responsive có CSS cho375/768/1280 nhưng browser chưa khả dụng nên chưa xác minh layout thực.
- Căn cứ: [tokens](../Frontend/docs/FE03_DESIGN_TOKENS.md), [catalog](../Frontend/docs/FE03_COMPONENT_CATALOG.md), [guidelines](../Frontend/docs/FE03_UI_GUIDELINES.md), [test report](../Frontend/docs/FE03_TEST_REPORT.md). Lựa chọn triển khai FE-03 đã thực hiện, các giới hạn cần nghiệm thu thủ công; chưa triển khai FE-04.

## FE-02 — Nền tảng Frontend (2026-11-19)

- Phương án C được người dùng phê duyệt qua yêu cầu FE-02: xây Frontend theo kế hoạch, giải quyết Backend bằng task riêng khi thành phụ thuộc thực tế; không sửa Backend/schema/contract trong FE-02.
- Trong phạm vi được giao, đã triển khai React/Vite JS/JSX, Router declarative, QueryClientProvider, Axios giữ nguyên response/error, Tailwind qua Vite plugin, ESLint/Vitest/RTL. Pin dependency và Node24.15+ nhánh24/npm11.x để khớp bộ cài trên Node24.20.0 hiện tại. Template create-vite9.3.4 React mới dùng oxlint; chọn ESLint theo yêu cầu.
- Origin qua VITE_API_BASE_URL, thêm /api một lần; thiếu/sai config vẫn render và chặn request. Timeout10s, retry false, không token/refresh/cookie/auto-call. Client state cục bộ, không store/provider chưa dùng. Không cache policy nghiệp vụ hoặc Design System FE-03. Đây là lựa chọn triển khai FE-02, chưa quyết định kiến trúc auth hoặc lưu token tương lai.
- Căn cứ: [architecture](../Frontend/docs/FE02_ARCHITECTURE.md), [dependencies](../Frontend/docs/FE02_DEPENDENCIES.md), [guide FE-01](../Frontend/docs/05_FRONTEND_INTEGRATION_GUIDE.md), Backend/src/app-factory.js:49–55 và server.js:4–9. Inventory FE-01 lỗi mã hóa/contract trống được giữ nguyên; dừng phần service nghiệp vụ phụ thuộc tài liệu đó, health có căn cứ riêng. Trạng thái: đã triển khai trong phạm vi được duyệt, chờ nghiệm thu; chưa làm FE-03.

Ngày 2026-11-07 — TASK-018: người dùng cho phép khởi tạo MySQL instance độc lập bằng công cụ sẵn có nếu chứng minh an toàn, không cho phép ghi main/đổi schema/seed/.env. Chọn mysqld cài sẵn với --no-defaults, datadir temp rỗng, UUID/cổng riêng và loopback; không nạp my.ini/service chính. Chỉ root bootstrap instance mới được CREATE test database/account, sau xác minh identity; setup/run dùng test-schema-only account và guard hiện có. Đã chạy 21 scenario thật PASS và dừng test instance; main metadata/count trước/sau không đổi. Đây là môi trường test dùng một lần, không phải server demo hoặc quyền ghi chính. Trạng thái: đã thực hiện trong phạm vi được duyệt, căn cứ integration/instance-isolee.mjs và Backend/docs/backend-final-report.md.

TASK-018 — giữ 15 scenario cũ, thêm 6 và probe rollback usage; sửa lỗi manifest borrows do refactor. MySQL account giới hạn trả FK code 1216 thay 1452; cho phép đúng hai mã thiếu hàng cha, giữ rejection/rollback/no-row assertions, không thay production đã xử lý cả hai. Không tự đặt mức phạt để hoàn tất test; successful fine create/pay/duplicate vẫn chưa xác minh MySQL. Forecast generate/coverage và mọi quyền giữ nguyên.

TASK-018 — kết luận “BACKEND TẠM HOÀN THÀNH — CÒN BLOCKER CẦN XỬ LÝ” dựa trên boolean secret chưa hợp lệ và main không có user; không sửa .env/cấp staff. Có thể lập kế hoạch UI bằng hợp đồng 40 API, nhưng chưa nghiệm thu auth/quản trị trên cấu hình hiện tại. category_manage chưa migrate, active fine rule 0 và generate forecast giữ 503 được bàn giao rõ, không tự áp dụng migration hoặc mở gate. Chưa triển khai Frontend. Trạng thái các bước cấu hình/cấp tài khoản/migration: cần chỉ dẫn riêng, chưa thực hiện.

Ngày 2026-11-07 — TASK-017: người dùng duyệt refactor tên Việt không dấu và chú thích Việt có dấu, yêu cầu không đổi nghiệp vụ/hợp đồng. Áp dụng 10 module, utils/config/middleware/test/integration và tài liệu liên quan; 78 đổi tên, 72 file JS/MJS được đọc/refactor. Giữ app.js/app-factory.js/server.js, check-db.js, integration/run.mjs/setup.mjs và jwt.js vì entrypoint/npm script/giao thức kỹ thuật; nội dung/biến bên trong vẫn Việt hóa. Giữ khóa JSON/SQL/env/JWT/RBAC, API thư viện và khóa cấu hình tiêm phụ thuộc, dùng alias biến Việt để bảo toàn giao diện. Export nội bộ đổi tên và mọi caller trong repo đã cập nhật; script ngoài repo cần theo bảng Backend/docs/quy-uoc-dat-ten.md.

TASK-017 — dùng parser TypeScript/Acorn sẵn trong VS Code để tách định danh với property key/string literal, không thêm dependency. Kiểm chứng AST cấu trúc/toán tử/hằng của 72 file, 188 import/casing và không vòng, hash package/SQL và 172 test trước/sau. Phân tích AST có chuẩn hóa định danh/shorthand nên không phải chứng minh hình thức mọi hành vi; test không bị xóa/nới kỳ vọng. Một số mock dispatch/handler tạo bởi hàm cần cập nhật đồng bộ, đã sửa lỗi refactor. Không thay quyền, cấu trúc DB, thuật toán hoặc transaction; không reset/stash/Git/commit/push.

Ngày 2026-11-07 — TASK-016: người dùng yêu cầu baseline 7 ngày, không coi thiếu lịch sử là 0 và giữ fail-closed khi thiếu schema/quyền. Triển khai SMA7 target số phiếu không cancelled/user/ngày UTC, không đếm copy/login; train D-7..D-1, dự báo D+1..D+7 (bỏ ngày D chưa hoàn tất). Count hợp lệ/nonnegative, BigInt làm tròn 2 chữ số; user cần 7 ngày đầy đủ sau ngày tạo. Trạng thái: code/mock đã kiểm chứng, dữ liệu thật hiện rỗng/chưa có coverage nên chưa có kết quả vận hành.

TASK-016 — tiếp nhận coverage từ file audit phía server qua FORECAST_COVERAGE_FILE, yêu cầu verified/complete, target/timezone, timezone created_at, database/server đúng, khoảng liên tục đã kết thúc và evidence_ref/verified_at. Không tự tạo file verified hoặc suy coverage từ bản ghi; client không được gửi xác nhận. Provider mặc định chưa xác minh. Đây là cơ chế tiếp nhận biên bản của operator, không tự chứng minh dữ liệu đầy đủ. File thiếu/lỗi hoặc train không đủ → insufficient_data/predictions rỗng/persisted=false.

TASK-016 — quyền hiện hữu chỉ forecast_view cho đọc quản trị; GET me luôn JWT owner. Không tự đặt quyền tạo/lưu, không dùng role admin hoặc report_view bypass; POST generate giữ 503 và module không có SQL ghi. Bảng forecast có thể biểu diễn count/ngày với hợp đồng version nhưng thiếu quyền ghi và run/dedup/coverage đã duyệt; chưa sửa schema/seed hoặc triển khai persistence. Backtest 7 train + 1 origin bỏ + 7 test, tối thiểu 15 ngày/max 14 mẫu với lookback 28; MAE fixture không phải độ chính xác thực tế. Nguồn: Backend/docs/du-bao-api.md, thuat-toan-du-bao.md; 172/172 test, chưa có MySQL integration/MAE thật.

Ngày 2026-11-07 — TASK-015: theo yêu cầu ghi sự kiện thành công và không sửa schema, định nghĩa login/borrow/return trong action_type VARCHAR(50), JSON nội bộ source=libriflow-api/version=1 và borrow_id cho lưu thông. Mượn/trả ghi mỗi copy, user_id là borrower, cùng transaction; lịch sử lỗi rollback tất cả. Login ký token trước rồi lưu event; lưu lỗi không trả token. Không có POST history công khai hoặc log GET; không đưa bí mật/profile/ghi chú vào event. Trạng thái: triển khai và mock xác minh, chưa ghi MySQL độc lập.

TASK-015 — report_view từ seed/SELECT thật quản lý đọc history/thống kê, /me luôn JWT owner và reader không có report_view chỉ own. Không dùng forecast_view thay report_view hoặc role-name bypass. Range ngày UTC max 366, trang max 100; thống kê count phiếu DISTINCT và copy riêng; user tổng hợp phiếu và log riêng trước JOIN. Response history bỏ JSON legacy; chỉ action đã hỗ trợ. Activity thống kê chỉ log có hợp đồng version/source để tránh gộp legacy chưa rõ.

TASK-015 — mục tiêu dự báo **đề xuất** là số phiếu mượn không cancelled/người/ngày; active_days và số copy là chỉ số phụ, không suy diễn số lần đến thư viện. Ngày/tuần thứ Hai/tháng UTC, không tự điền 0 khi chưa xác minh coverage. Chưa triển khai thuật toán/export hoặc ghi DuBaoTanSuat; schema thiếu đơn vị đo/coverage nên lưu dự báo cần quyết định tiếp. Nguồn: Backend/docs/thiet-ke-du-lieu-du-bao.md. 150/150 unit/safety, SELECT rỗng thật đã xác minh; dataset khác 0, MySQL transaction và chất lượng dự báo chưa xác minh.

Ngày 2026-11-07 — TASK-014: người dùng cho phép xác định quy tắc đơn giản nếu schema chưa có công thức; đã triển khai chính sách chỉ chốt sau trả: late/per_day = ceil(giây trễ/86400) × active rule amount, late/fixed một lần, damage/fixed cho good → damaged. ID rule do nhân viên chọn tường minh, không tự đặt mức tiền/tiền tệ; dùng BigInt cents, chặn overflow. Không tự tạo fine khi return hoặc đánh overdue trong GET; không cron. Lost/other, miễn/giảm/hoàn tiền và thanh toán từng phần chưa có quy trình phù hợp nên không mở chức năng ghi đó. Trạng thái: chính sách API đã triển khai theo phạm vi task, test mock đạt; chưa được kiểm chứng vận hành/tài chính hoặc MySQL ghi thật.

TASK-014 — RBAC dùng quyền fine_manage/borrow_manage từ seed và SELECT thực tế; reader chỉ own nếu không có quyền quản lý, không role-admin bypass. Tạo phạt khóa header SHARE → detail UPDATE → rule SHARE → locking duplicate read theo (detail,type), không tạo lại kể cả paid/waived hoặc rule khác; payment khóa fine, chỉ unpaid + paid_at NULL sang paid. Không thêm UNIQUE/audit/schema, nên ngoài API vẫn cần mọi writer cùng quy ước khóa. SELECT xác nhận QuyDinhPhat trống: tạo trả 404 khi thiếu rule, không seed/cấp quyền hoặc đoán cấu hình. Nguồn: Backend/docs/tien-phat-api.md và qua-han-api.md. 126/126 unit/safety, 6 SELECT probe; concurrency/rollback MySQL thật **Chưa xác minh**.

Ngày 2026-11-06 — TASK-013: theo yêu cầu chỉ chạy integration khi có MySQL độc lập đã xác minh, đã tạo harness dùng TEST_DB_* riêng, allowlist cố định, pin UUID khác main, account least privilege, SELECT identity mỗi connection/query/commit và marker source-fingerprint. Setup chỉ trên schema test có sẵn/trống, không tự tạo/xóa DB hoặc chạy source USE libriflow. Không dùng NODE_ENV hay mock MySQL trong integration. Tách pure app-factory khỏi default pool để loại trộn DB ở model/health; giữ app wrapper/API hiện tại. Fixture lưu riêng và không auto cleanup. Trạng thái: code + 98 unit/safety đã xác minh; 15 scenario MySQL thật **CHƯA CHẠY** vì chưa có TEST_DB_*; không tự dựng môi trường trên server chính. Không suy đoán pass hoặc sửa nghiệp vụ khi chưa có bằng chứng.

Ngày 2026-11-06 — TASK-012: theo yêu cầu module mượn/trả, đã triển khai bằng bảng/quyền hiện có: borrow_manage lập/quản lý đọc phiếu, return_process xử lý trả; reader không có borrow_manage chỉ đọc own theo JWT + WHERE SQL. Không tự cho reader tạo/trả hoặc tự chọn người khác. Staff có quyền được chọn user_id borrower active theo nghiệp vụ lập phiếu. Trạng thái: code/test mock đã triển khai, quyền seed/DB xác nhận SELECT; chưa chạy ghi MySQL độc lập.

TASK-012 — lựa chọn triển khai trong phạm vi yêu cầu nhất quán: request tối đa 100 copy, chỉ available/good được mượn; return explicit items hoặc return_all + condition_after; good về available, damaged về maintenance; không xử lý lost/cancelled/legacy bất nhất, tiền phạt, xóa lịch sử hay tự đánh overdue. Timestamp mới UTC, legacy timezone chưa xác minh. Khóa copy ID số tăng dần trước detail, return khóa thêm header; mọi lỗi rollback. Đây là hợp đồng API được ghi rõ, không suy diễn thành schema constraint mới. Chi tiết nguồn/giới hạn tại Backend/docs/phieu-muon-api.md; không thay .env/schema/seed/Git.

Ngày 2026-11-06 — TASK-011: người dùng đã duyệt tên quyền category_manage và gán admin/librarian, không reader; thay trạng thái chưa quyết định của TASK-010 bên dưới. Đã cập nhật seed, tạo migration additive 001 tra khóa tự nhiên, đổi route ghi danh mục sang authenticate + yeuCauQuyen(category_manage). Không sửa middleware, validation, FK hoặc cấu trúc 16 bảng; không có admin bypass. Khi DB chưa có grant thì 403, không tự seed. Trạng thái code: đã triển khai/test mock; trạng thái DB chính: chưa có quyền, migration chưa được chạy và chưa được phép chạy trong task này. Chọn migration không USE để operator chủ động chọn schema, tránh chuyển nhầm từ DB thử nghiệm sang DB chính. Không thay Git, `.env` hoặc SQL gốc.

Ngày 2026-11-06 — TASK-010: theo yêu cầu quản lý danh mục/bản sao và giữ fail-closed nếu thiếu quyền, đã triển khai hai module. Căn cứ schema/seed + SELECT quyền thực tế: copy_manage bảo vệ toàn bộ ghi bản sao; không có quyền danh mục phù hợp nên mọi ghi danh mục tạm khóa (authenticate rồi 503), không tự đặt quyền hoặc bypass admin. Quyết định quyền để mở ghi danh mục: **chưa được duyệt/chưa xác định**.

TASK-010 — các giới hạn an toàn đã triển khai trong phạm vi yêu cầu bảo toàn dữ liệu: GET copy ẩn note; PUT không đổi book_id; chỉ quản trị trạng thái available/maintenance, copy borrowed/lost hoặc có loan chưa hoàn tất bị khóa; xóa bị chặn khi có lịch sử mượn/sử dụng. Không suy diễn đây là ràng buộc DB mới. Danh mục model chặn xóa có sách dù FK cho SET NULL. Module mượn/trả sau cần tuân theo khóa copy trước khi đổi lưu thông; thiết kế chi tiết module đó **chưa xác minh**. Không sửa schema/seed, `.env`, Git hoặc chạy ghi trên DB chính.

Xác minh: 2026-11-04. Không suy diễn lý do thiết kế nếu chưa có bằng chứng.

| Mục | Trạng thái và căn cứ |
| --- | --- |
| Backend dùng ES modules, Express và MySQL trực tiếp qua mysql2 | Đã hiện diện trong `Backend/package.json`, `src/ung-dung.js`, `src/cau-hinh/co-so-du-lieu.js`; lý do lựa chọn: **Chưa xác minh**. |
| Chỉ mở API sau khi kiểm tra DB thành công | Hành vi đã xác minh trong `Backend/src/server.js`; lý do thiết kế: **Chưa xác minh**. |
| Tách ngữ cảnh, database, quyết định, lịch sử task và bàn giao | Theo yêu cầu người dùng ngày 2026-11-04; tài liệu đã tạo, đang chờ người dùng duyệt. Quy tắc thao tác nằm ở `AGENTS.md`. |

Chưa có quyết định được xác minh về frontend, kiến trúc nghiệp vụ tổng thể hoặc công cụ migration. Cơ chế xác thực hiện tại được ghi tại AUTH-001 bên dưới. Ghi **Chưa xác minh** cho phần thiếu, không coi các bảng đang tồn tại là bằng chứng tính năng đã triển khai.

Khi thêm quyết định: ghi ngày, nội dung, căn cứ/source, trạng thái (đề xuất/được duyệt/đã hiện diện) và hệ quả cần theo dõi. Chỉ ghi lý do khi đã có nguồn.

Ngày 2026-11-05, theo task đồng bộ Git của người dùng: giữ bố cục ở gốc, loại `LibriFlow/` sau khi xác minh 16 cặp Git blob giống nhau và nội dung working tree chỉ khác CRLF/LF; giữ nguyên SQL từ GitHub. Người dùng đã cho phép merge và fast-forward local, yêu cầu xác nhận riêng trước push; không viết lại lịch sử.

Ngày 2026-11-05 — SQL-007: người dùng cho phép chuẩn hóa SQL và tài liệu. Chọn bản `Backend/sql/libriflow_database.sql` làm nguồn tách DDL/seed vì ba bản chỉ khác CRLF/LF và cấu trúc đã đối chiếu với metadata MySQL hiện tại. Trạng thái: được duyệt trong phạm vi tạo file; đã tạo `schema.sql`, `seeds/initial-permissions.sql` và hướng dẫn. Giữ nguyên tên đối tượng/logic và mọi bản gốc; không thực thi SQL, commit hoặc push. Lưu ý tên bảng PascalCase trên môi trường phân biệt hoa/thường và giới hạn của `IF NOT EXISTS`/`INSERT IGNORE`.

Ngày 2026-11-05 — BOOK-001: theo nhiệm vụ module sách, đã triển khai route/controller/service/model, validation và lỗi JSON tập trung; không làm auth. Các lựa chọn triển khai: PUT thay thế đầy đủ, ID chuỗi bảo toàn BIGINT, tìm kiếm chuỗi con title/author/publisher, chỉ xóa Sach khi không có bản sao và FK cho phép. Server chỉ bind loopback do phạm vi cục bộ. Thêm alias `npm run db`, giữ các lệnh cũ; dùng node:test có sẵn, không thêm dependency. Trạng thái: đã hiện diện theo phạm vi người dùng duyệt, hợp đồng chi tiết tại `Backend/docs/sach-api.md`; kiểm thử ghi trên MySQL thật còn chưa chạy.

Ngày 2026-11-05 — AUTH-001: theo yêu cầu JWT/RBAC, đã triển khai bcrypt cost 12, JWT HS256 15 phút (sub/iat/exp/iss/aud), secret chỉ lấy từ môi trường với kiểm tra tối thiểu 32 byte; thiếu cấu hình trả 503 trước ghi. Reader và ba quyền sách lấy tên từ seed, dữ liệu thực tế đã kiểm tra bằng SELECT. GET sách public; ghi sách cần authenticate + yeuCauQuyen dựa DB. Logout stateless nói rõ client xóa token, không server revocation/refresh token. Login 10 và register 5 request/IP/15 phút bằng bộ đếm memory. Trạng thái: triển khai theo phạm vi được duyệt; chưa production, chưa kiểm thử ghi/auth thành công trên MySQL độc lập. Không sửa schema, `.env`, Git/remote hoặc tự seed/cấp admin.
