# Bàn giao hiện tại

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
