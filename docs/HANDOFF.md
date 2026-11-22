# Bàn giao hiện tại

## HOTFIX UI-05 — CSS xác thực (2026-11-22)

CSS toàn cục nạp trước Footer để Tailwind base đứng trước Design System. Đăng nhập và đăng ký dùng bố cục hai cột hiện có với khoảng đệm được cân lại, Footer nằm dưới nội dung. Frontend 317/317, ESLint, build, thứ tự CSS production và Vite HTTP smoke đạt. [Nguyên nhân, file và cách kiểm](TASKS.md).

MySQL demo được kiểm chỉ đọc, có 11 sách, 22 bản sao, 37 phiếu và 7 tài khoản. Chờ kiểm trực quan và đăng nhập demo qua Chrome khi môi trường trình duyệt khả dụng. Các mục dưới là lịch sử.

## HOTFIX UI-04 — Footer, Admin và hồ sơ cá nhân (2026-11-22)

Footer dùng chung trong AppShell, đăng nhập và đăng ký. `/admin` chuyển qua guard của `/app/admin`. Trang Tài khoản lưu số Việt Nam dạng chuỗi và ảnh JPEG/PNG/WebP vào Backend. Hồ sơ MySQL được đồng bộ với Header ngay sau khi lưu. [Danh sách file và kiểm tra](TASKS.md).

MySQL demo đã lưu và đọc lại số điện thoại/ảnh của fixture ID 9 sau khi khởi động lại. PNG trả đúng byte và MIME. Đã kiểm giới hạn tải, từ chối định dạng sai, quyền sở hữu và thay ảnh. Schema hiện hữu đáp ứng. 11 sách, 22 bản sao và 37 phiếu mượn giữ nguyên trong kiểm chứng. Frontend 317/317, Backend 183/183, ESLint và production build đạt.

Chrome và hộp thoại chọn ảnh Windows chưa kiểm được do kết nối công cụ browser. Có thể nghiệm thu trên dev sau khi khởi động lại Backend. Các bàn giao dưới đây giữ theo ngày xác minh riêng.

## HOTFIX-UI-02 — Trang chủ và đăng ký demo · 22/11/2026

Sidebar mọi role đã bỏ Công cụ phát triển/5link kỹ thuật; giữ route/component trực tiếp để bảo trì. `/app` có Hero chào theo tên/minh họa CSS,4sách từ API thật/ảnh hiện hữu, lối tắt theo quyền, loading/empty/error/retry; card mở chi tiết/bản sao FE08–09 bằng `?sach=ID`. Layout riêng trang chủ tối đa1440px, palette/tokens/Sidebar/Header/logout giữ nguyên. [File và lệnh kiểm](TASKS.md).

Đăng ký Frontend+Backend: **4–12 ký tự Unicode**, không complexity, xác nhận phải khớp; bcrypt12/reader/JWT giữ nguyên, không đổi mật khẩu cũ hoặc giới hạn login. **Frontend310/310 tại21file, Backend179/179**, lint/build/diff-check đạt. MySQL demo xác nhận tài khoản thử **ID7**, chỉ reader/book_view, đăng ký4ký tự/login thật đạt; giữ11sách/22bản sao/37phiếu và checksum nghiệp vụ. Chỉ thêm1user/reader mapping/1login event (users5→6 ở baseline thực), không main/schema/resetdemo.

Chưa nghiệm thu visual1366×768/1920×1080 vì browser host/native pipe unavailable; HTTP module/ảnh/API200 không thay browser QA. Khởi động lại Backend/dev để nhận validator mới khi kiểm tra. Không commit/push hoặc FE15; chờ người dùng nghiệm thu. Các mục dưới là lịch sử.

## HOTFIX-AUTH-01 — Trang chủ/đăng ký · 22/11/2026

`/` chuyển đến `/dang-nhap` khi chưa đăng nhập và `/app` khi có phiên memory; trang FE02 chuyển sang `/kiem-tra-nen-tang`. Login giữ thiết kế, có **Đăng ký ngay**; `/dang-ky` gửi name/email/password đến API auth/register hiện có, thành công trở về login. Không Backend/schema/README hoặc JWT persistence changes; các route/permission FE08–14 giữ nguyên. [File/cách kiểm tra](TASKS.md).

Đã đăng ký thật một fixture **user_id=4**, marker HOTFIX-AUTH-01, trong demo; chỉ reader/book_view, bcrypt12, login/me/logout/duplicate/role-injection/owner/401/403 đều đạt. Admin/thủ thư/độc giả demo cũ login/me đạt. Demo giữ11sách/22bản sao/37phiếu; checksum nghiệp vụ/dự báo và fingerprint account cũ giữ nguyên. User3→4; thêm4login events, không kết nối main. Không ghi password/token vào tài liệu.

**Frontend305/305 tại20file**,0fail/skip; lint/build và Backend179/179 đạt. Chrome chưa kiểm được do CUA host/native pipe unavailable. Dịch vụ3000/5173 có sẵn trả200, root runner mới báo EADDRINUSE nên giữ nguyên tiến trình người dùng; kiểm API trên backend demo3001 do mình mở và đã dừng. Không commit/push; chờ nghiệm thu, không FE15. Các mục dưới là lịch sử.

## HOTFIX-CONFLICT-01 — Khởi động Frontend sau conflict · 22/11/2026

Đã gỡ đúng 7 đoạn conflict trong Sidebar, CSS khung và 4 docs, bảo toàn nội dung FE10–14. Source Frontend/Backend/chung sau sửa không có diff so với bản FE14 `29ab8e2`; role/permission `/auth/me`, route sách+bản sao, mượn/trả, độc giả/Admin và thống kê/dự báo giữ nguyên. [Chi tiết file/cách đối chiếu](TASKS.md).

**302/302 tests tại20file**, 0 fail/skip; ESLint/build/diff-check đạt, toàn cây không còn marker (bỏ .git/node_modules/dist). `npm.cmd run dev` từ gốc lên MySQL/Express/Vite, HTTP shells/module/health đều200, Ctrl+C đã dừng cả hai listener. Không thay Backend/database/dữ liệu demo, không login/CRUD E2E hoặc browser tương tác trong hotfix. Giữ settings có sẵn, không commit/push hay thao tác merge/rebase/reset. Bước tiếp: người dùng kiểm tra lại từ gốc; dừng chờ, không FE15. Các bàn giao dưới giữ lịch sử.

## FE-14 — Demo sẵn sàng nghiệm thu · 22/11/2026

Chạy `npm run dev` tại gốc rồi mở `http://127.0.0.1:5173/dang-nhap`. Dữ liệu giữ trong schema demo riêng. Đã dừng Express/Vite bằng Ctrl+C sau kiểm tra. Bản demo hiện có 11 đầu sách, 22 bản sao, 3 tài khoản và 37 phiếu. Ngày 22/11, preview từ 10 phiếu trong 7 ngày cho ra 1,43 phiếu/người/ngày. Database chính vẫn dùng cấu trúc ISBN cũ.

[Hướng dẫn chạy](../README.md) · [File thay đổi, kiểm thử Chrome/MySQL, migration và giới hạn](../Frontend/docs/FE14_HANDOFF.md). Bước tiếp theo là nghiệm thu FE-14. Chức năng CRUD người dùng và lưu dự báo vẫn chờ API/quyền tương ứng.

## FE-13 — Thống kê và dự báo (2026-11-21)

**Hoàn tất phần Frontend theo API hiện hữu, chờ nghiệm thu.** [FE13_HANDOFF](../Frontend/docs/FE13_HANDOFF.md), [lịch sử](TASKS.md).

- /app/thong-ke cần report_view: 7 metric thật, lọc ngày/nhóm/user đúng phạm vi, biểu đồ cột và bảng phân biệt phiếu/bản sao; không tạo số0 cho dữ liệu thiếu.
- /app/du-bao cần forecast_view: preview SMA7 phiếu không hủy/người/ngày, 7ngày từ Backend khi ready; insufficient_data có giải thích, không dự báo giả. Lịch sử chỉ lấy khi có thêm report_view, vẽ riêng không nối qua gap/tương lai. MAE không được diễn giải thành tỷ lệ chính xác.
- Admin thêm shortcut theo grant và dùng chung overview. Generate/persistence Backend vẫn khóa503, UI không gọi POST. Ready/coverage/MAE thật chưa kiểm chứng; FE12 user CRUD vẫn thiếu API.
- **302/302 tests tại20file**, thêm6mocktests; lint/build đạt. 3 production shells200, preview đóng. 107Backend giữ hash, HEAD/index và thay đổi có sẵn giữ nguyên, không DB/env/dependency/commit/push.
- Chưa browser/AT/resize/MySQL E2E: host unavailable, TCP3000 đóng/chưa account dev. Tiếp theo: nghiệm thu; FE14 kiểm demo/môi trường thật chỉ sau task mới, không tự triển khai.

Các bàn giao dưới là lịch sử.

## FE-12 — Khu vực Admin (2026-11-21)

**Hoàn tất phần giao diện khả thi; luồng quản trị người dùng chưa hoàn tất do thiếu API Backend.** [FE12_HANDOFF](../Frontend/docs/FE12_HANDOFF.md), [lịch sử](TASKS.md).

- /app/admin cần role admin thật; có hồ sơ hiện tại, lối tắt theo grant và 3 số tổng thư viện từ statistics/overview chỉ khi có report_view. Không Admin bypass, không dashboard chuyên sâu.
- /app/nguoi-dung cần user_manage; hiện báo rõ dịch vụ chưa hỗ trợ, không mô phỏng danh sách rỗng, tìm kiếm hoặc CRUD. Backend chưa có list/detail/create/update/role/status/delete; không dùng register/statistics-users thay thế.
- **296/296 tests tại 19 file**, 4 test mới; lint/build đạt. Hai route production trả shell200, preview đóng. FE06–11 runtime/ảnh và 107 Backend giữ hash; HEAD/index giữ nguyên, không DB/env/package/commit/push.
- Chưa browser/API/MySQL E2E/AT/resize: host unavailable, TCP3000 đóng/chưa account dev. Tiếp theo: nghiệm thu giao diện khả thi; hoàn tất quản trị user cần nhiệm vụ Backend riêng cấp contract/quyền. Không tự FE13.

Các bàn giao dưới đây là lịch sử.

## FE-11 — Giao diện độc giả (2026-11-21)

**Hoàn tất phần lập trình, chờ nghiệm thu.** [FE11_HANDOFF](../Frontend/docs/FE11_HANDOFF.md), [lịch sử](TASKS.md).

- **/app/doc-gia** và **/app/lich-su-muon** dùng role reader thật từ me; **/app/tai-khoan** dành cho mọi phiên đăng nhập. Giữ menu quản lý và module sách/ảnh/bản sao/mượn-trả hiện có.
- Trang chủ có lời chào, số phiếu thật, hạn trả trong 5 phiếu gần đây và lối tắt. Lịch sử có filter/pagination/detail read-only; account chỉ render profile allowlist, không sửa hồ sơ hoặc lộ secrets; logout Header giữ nguyên.
- Backend giới hạn reader own bằng JWT/SQL. Reader có borrow_manage gửi self user_id cho list; phản hồi sai owner bị từ chối toàn bộ, không lọc hàng nhạy cảm ở Frontend. Không thêm API/permission hoặc Admin bypass.
- **292/292 tests tại 18 file**, thêm 5 mock tests; lint/build đạt. Chỉ cập nhật 2 assertion menu FE07 cho mục mới, giữ ca bảo mật. 5 route shells production 200, preview đã đóng.
- Chưa browser/MySQL end-to-end/AT/resize do host unavailable/cổng3000 đóng/chưa account dev. Không Backend/database/env/dependency/commit/push; giữ HEAD/index và FE10 chưa commit.
- Tiếp theo: nghiệm thu với browser và môi trường dev cô lập/tài khoản thật; không tự FE12. Giới hạn “chưa có trang reader own” trong bàn giao FE10 bên dưới đã được FE11 giải quyết.

Các bàn giao bên dưới là lịch sử.

## FE-ASSETS-02 + FE-10 — Ảnh bìa và mượn/trả (2026-11-21)

**Hoàn tất phần lập trình, chờ nghiệm thu.** [FE10_HANDOFF](../Frontend/docs/FE10_HANDOFF.md) ghi API/quyền/file và giới hạn; [lịch sử](TASKS.md).

- Hai ảnh JPG giữ nguyên byte; Đồi gió hú đã bỏ đuôi .jpg trùng. /app/sach có ảnh danh sách/chi tiết 60×90/160×240, variant thẻ 120×180, contain và fallback; map chính xác cặp tên+tác giả chuẩn hóa, chưa có ID thực tế được bàn giao.
- **/app/muon-tra** + Sidebar cần borrow_manage; lập phiếu, list/filter/detail/pagination và trả một/nhiều/toàn bộ cần thêm return_process. Có xem lại/xác nhận, validation, pending, error/Toast và refetch sau thành công; không optimistic hoặc tự replay ghi.
- Backend chưa có lookup/tên độc giả trong Borrow DTO: dùng user_id thật. Chưa có trang reader own; không suy permission từ Admin. FE06/07/09 runtime giữ nguyên, 401/403 theo provider hiện hữu.
- **287/287 tests tại 17 file**, thêm 7 mock tests; lint/build đạt, 280 test cũ giữ nguyên. Ảnh dev/production 200/MIME/bytes khớp; server tạm đóng. 107 Backend giữ hash, HEAD/index không đổi; không database/schema/API/env/dependency/commit/push.
- Chưa browser/Backend/MySQL E2E vì host unavailable, TCP3000 đóng và chưa account dev. Tiếp theo: nghiệm thu desktop với môi trường dev cô lập và IDs/grants thật, không tự FE11.

Các bàn giao dưới là lịch sử, gồm hướng dẫn ảnh chưa tích hợp của FE-ASSETS-01 đã được thay bằng phần hiện tại.

## GIT-003 — Đã được duyệt kết thúc merge (2026-11-21)

- Người dùng cho phép tạo merge commit, không push/pull. Phê duyệt này thay gate chờ duyệt ở GIT-002 bên dưới; AutoGit tiếp tục tắt.
- Trước commit đã rà đúng 4 file staged (settings và ba tài liệu Git), không unstaged/unmerged hoặc thay đổi source/SQL; diff-check đạt. Lượt này chỉ cập nhật TASKS/HANDOFF trong cùng merge commit.
- Hai parent cần bảo toàn: local `accece0`, remote `0acca85`. Thông điệp: `Merge origin/main: resolve layout conflicts and preserve latest LibriFlow source`.
- Backup hiện có được giữ nguyên; đọc/kiểm lại 1.427 snapshot files khớp manifest. Không ghi thêm log hay tệp vào backup.
- Bước kiểm tra ngay sau commit: status/log, hai parent, không còn MERGE_HEAD/unmerged paths, source/SQL không đổi và backup fingerprint giữ nguyên. Kết quả lệnh được báo trực tiếp cho người dùng; không chạy thêm nghiệp vụ hoặc push/pull. Chi tiết [GIT-003](TASKS.md); các snapshot bên dưới là lịch sử.

## GIT-002 — Git đã hết conflict, chờ duyệt commit (2026-11-21)

- `main` vẫn tại `accece0`, merge với `0acca85` chưa commit theo quy tắc người dùng; không rebase/cherry-pick/pull/push/abort. Không còn unmerged paths. Kết quả và nguồn xác minh: [GIT-002](TASKS.md).
- Đã bảo toàn 277 tệp HEAD, source Backend/Frontend hiện hành, tính năng FE06–09/desktop, ảnh bìa, SQL, env và toàn bộ lịch sử. 14 file SQL/assets/env/example giữ nguyên byte; chỉ phục hồi source từ marker về phiên bản local đã xác minh.
- Đối chiếu đủ 245 remote files: 213 trùng HEAD, 32 trùng local cũ `8c224e8`. Giữ cấu trúc gốc, giải quyết 226 bản local; bỏ 11 bản lồng đã xác minh và 2 file mobile từng xóa có chủ đích ở FE-DESKTOP-01. Không còn thư mục `LibriFlow/` lồng.
- Sao lưu độc lập đã kiểm SHA-256: `C:/Users/pc/AppData/Local/Temp/LibriFlow-git-recovery-2026-11-21T06-01-19-168Z/` gồm snapshot 1.427 file, Git state, manifest, patches, plan/result và logs; không gồm node_modules/dist. Giữ backup ngoài Git; có bản sao cấu hình riêng tư, không chia sẻ công khai.
- File thay đổi cuối task: `.vscode/settings.json` (AutoGit=false), `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/HANDOFF.md`. Source/SQL và các bàn giao nghiệp vụ bên dưới giữ nguyên.
- Kiểm tra đạt: Backend 178/178; Frontend 280/280 tại 16 file, lint/build; đủ file/ảnh/SQL, không conflict marker và diff-check. Chưa chạy browser/E2E hoặc DB integration; không truy vấn/ghi DB.
- Upstream đã đúng: `main → origin/main`; remote kiểm chỉ đọc qua ls-remote tại `0acca85`. Không đổi upstream hoặc tạo remote branch; thông báo IDE thiếu tracking không phản ánh nhánh main hiện tại.
- Tiếp theo: người dùng duyệt merge commit sau khi rà staged diff. Giữ AutoGit tắt để tránh commit/sync tự động. Push cần chỉ dẫn riêng, tuyệt đối không force. Các snapshot nghiệp vụ dưới đây là lịch sử, không phải yêu cầu tự tiếp tục.

## FE-ASSETS-01 — Thêm ảnh bìa sách (2026-11-21)

Đã chuẩn bị [Frontend/public/Anh/BiaSach/](../Frontend/public/Anh/BiaSach/) với .gitkeep và [bia-sach-mac-dinh.svg](../Frontend/public/Anh/BiaSach/bia-sach-mac-dinh.svg) dùng màu Warm Wooden Library. Chưa có ảnh cho hai đầu sách, chưa gắn ảnh vào giao diện/dữ liệu.

- Chép ảnh vào đúng thư mục trên; tên chữ thường, không dấu, các từ nối bằng dấu -, ưu tiên .jpg/.jpeg/.png/.webp.
- Hai file người dùng sẽ bổ sung: don-quijote.jpg — Don Quijote, Miguel de Cervantes; doi-gio-hu.jpg — Đồi gió hú, Emily Brontë. Không có ảnh giả cho hai sách.
- URL Vite không chứa public: /Anh/BiaSach/bia-sach-mac-dinh.svg. Sau khi chép ảnh, dùng /Anh/BiaSach/don-quijote.jpg hoặc /Anh/BiaSach/doi-gio-hu.jpg. Giữ đúng hoa/thường Anh/BiaSach khi triển khai.
- Nếu ứng dụng được triển khai dưới base path riêng, dựng URL với import.meta.env.BASE_URL + 'Anh/BiaSach/<ten-file>' thay vì cố định gốc domain.
- Khi tích hợp về sau, khai báo ánh xạ rõ book_id thực tế → tên ảnh và fallback SVG khi chưa có ảnh; không gán theo chỉ số/thứ tự danh sách hoặc tự suy ID từ tên sách. Chưa triển khai ánh xạ, upload, sửa API hoặc dữ liệu trong task này.
- Build đạt; SVG trả 200/image/svg+xml và khớp nội dung trên Vite dev lẫn production preview. Server kiểm tra đã dừng; chưa kiểm browser trực quan, không chạy bộ unit/lint vì không sửa JS/JSX. Không Backend/database hoặc commit/push.

Dừng chờ người dùng bổ sung ảnh; trạng thái bàn giao nghiệp vụ FE-09 bên dưới giữ nguyên.

Cập nhật **2026-11-21 · FE-09**: hoàn tất phần Frontend kho sách/bản sao theo API hiện hữu, chờ nghiệm thu. `/app/sach` → Chi tiết có bảng bản sao và thêm/sửa/xóa theo `copy_manage`, loading/empty/error/retry/Toast và xác nhận xóa. Không đổi Backend/database/FE06–07 runtime; giữ CRUD đầu sách FE08. Form sửa bản sao yêu cầu xác nhận thay thế ghi chú vì GET không trả note. [Task](TASKS.md), [bàn giao và file thay đổi](../Frontend/docs/FE09_HANDOFF.md). Hồi quy cuối **280/280 tests tại 16 file**, 0 fail/skip; lint/build và diff-check đạt. Backend hashes giữ nguyên; chưa browser/CRUD MySQL E2E, cổng3000 không lắng nghe lúc khảo sát. Tiếp theo: nghiệm thu với Backend dev riêng và account/quyền hợp lệ; không commit/push hoặc tự FE-10. Các bàn giao dưới đây là lịch sử.

Cập nhật **2026-11-21 · RUN-GUIDE-01**: đã khảo sát source/cấu hình và cung cấp hướng dẫn chạy thử PowerShell; xem [task RUN-GUIDE-01](TASKS.md). Chỉ sửa TASKS/HANDOFF, giữ nguyên source và thay đổi Git có sẵn. Node/npm và node_modules đã có; chưa chạy server/tests/build/browser hoặc truy cập database. JWT/account/môi trường MySQL hiện tại **Chưa xác minh**. Bước tiếp: chạy Frontend 5173 và Backend mặc định 3000, kiểm tra health; login/CRUD cần Backend dev riêng với JWT/account/quyền hợp lệ. Trạng thái nghiệm thu desktop bên dưới giữ nguyên.

Cập nhật **2026-11-21 · FE-DESKTOP-01**. **Hoàn tất phần lập trình desktop-first, dừng chờ nghiệm thu.** [Lịch sử](TASKS.md), [handoff](../Frontend/docs/FE_DESKTOP_01_HANDOFF.md), [test report](../Frontend/docs/FE_DESKTOP_01_TEST_REPORT.md).

- Shell luôn dùng Sidebar + Header + Main. Bỏ drawer/hamburger/overlay, state/handler mobile và hook matchMedia. Sidebar tiếp tục dùng bộ lọc quyền FE07; điều hướng/active link/focus/skip link/title giữ nguyên.
- CSS Sidebar mặc định 248px; dưới 1024px dùng 200px và Header một cột. Giữ CSS co giãn cơ bản, bảng cuộn ngang và form/Dialog giới hạn viewport; không đổi palette/tokens/font hoặc tạo mobile navigation khác.
- Radix Dialog và component FE03 giữ nguyên; FE05 API/Query, FE06 JWT memory/login/logout/TTL/401/403, FE07 helper/guard và FE08 runtime không sửa. Các route demo vẫn hoạt động như hiện tại.
- **274/274 tests tại 15 file**, 0 fail/skip, lint/build đạt. Baseline 280; xóa 7 ca mobile và thêm 1 ca resize, không xóa test nghiệp vụ/bảo mật. 4 file test chuyển bước điều hướng liên quan sang Sidebar; báo cáo ghi cả lượt baseline timeout và lượt fixture còn click hamburger trước khi sửa.
- Static parse 68 file/201 cạnh import-export tĩnh tương đối không lỗi/casing. Production HTTP 10 SPA shells/35 assets 200, preview loopback đã đóng; bundle không còn marker drawer/hamburger. Không xem đó là bằng chứng visual/browser E2E.
- Chưa kiểm trực quan 1366×768, 1440×900, 1920×1080, zoom/AT hoặc browser resize do browser host/native pipe unavailable. Chưa Backend/MySQL E2E trong task này; không tạo account/fixture hoặc gọi ghi main.
- Xóa 2 file mobile; sửa 4 component layout, CSS Shell, 4 file test; tạo đúng 2 docs desktop; cập nhật README, 2 docs FE04 lịch sử, DECISIONS/TASKS/HANDOFF. Danh sách chi tiết và phần chưa kiểm ở handoff/report.
- Baseline 269 file, HEAD 8c224e8 có thay đổi staged/unstaged/untracked từ trước. Giữ HEAD/index và mọi thay đổi ngoài task. Không Backend/schema/database/API/env/package/lock changes, không dependency mới, không stage/unstage/reset/commit/push.
- Bước tiếp: người dùng nghiệm thu desktop trong browser khả dụng, kiểm Sidebar/Header/route/login/logout/403/demo/sách và cuộn bảng/form/Dialog khi thu nhỏ cửa sổ. FE08 đã có; không triển khai tính năng mới hoặc FE09.

[FE08 handoff](../Frontend/docs/FE08_HANDOFF.md), [FE07 handoff](../Frontend/docs/FE07_HANDOFF.md), [FE06 handoff](../Frontend/docs/FE06_HANDOFF.md) và [Backend Auth handoff](backend-auth-setup/BE_AUTH_SETUP_01_HANDOFF.md) là các bàn giao nghiệp vụ/nền tảng trước. Các mô tả drawer trong snapshot cũ đã được thay bởi FE-DESKTOP-01.
