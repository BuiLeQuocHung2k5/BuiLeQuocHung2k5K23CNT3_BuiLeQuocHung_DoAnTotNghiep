# QA-01 — Optimization log

Xác minh 2026-11-19. Giai đoạn A đã lưu baseline, chạy test/lint/build và lập findings trước khi sửa source. [static-before](evidence/static-before.json) xác nhận không file baseline nào đổi tại thời điểm đóng audit A. Giai đoạn B chỉ giữ các thay đổi sau.

| File | Vấn đề / căn cứ | Thay đổi nhỏ nhất | Lợi ích đã chứng minh | Verification |
|---|---|---|---|---|
| Backend/src/controllers/sach.controller.js | B12: helper kiểm JSON415/message + validator trùng docJsonYeuCau hiện hữu | Bỏ local helper4dòng/import LoiHttp, import helper chung và truyền kiemTraNoiDungSach tại POST/PUT | Bỏ một implementation kiểm Content-Type trùng; cùng thứ tự validation, code/message/status và validator | Existing lifecycle/415/validation/error tests;34 targeted và172 full đạt |
| Backend/test/an-toan-tich-hop.test.js | B13: regex cấm config/database không nhận tên hiện tại | Pattern nhận cả co-so-du-lieu và database | Guard không bỏ lọt import trực tiếp chỉ vì rename; không nới assertion/runtime behavior | Safety test và static import graph đạt,172 test giữ nguyên |
| Frontend/docs/01_BACKEND_API_INVENTORY.md | F01: bytes mất chữ, contract thiếu | Biên soạn UTF-8 theo source;40dòng method/path + body/query/DTO/error/date/auth alias và nguồn module | Tài liệu đọc được, đủ contract để chuẩn bị API feature; không tạo API mới | Đối chiếu runtime40unique/29JWT; kiểm local links/UTF-8 |
| Frontend/README.md, Frontend/docs/FE02_BACKEND_DEPENDENCIES.md | Claim dev đang chạy/inventory còn lỗi đã lạc thời | Ghi trạng thái QA mới, giữ FE02 snapshot được đánh dấu lịch sử | Không hướng dẫn dùng thông tin cũ như trạng thái hiện tại | Health probe và review docs |
| docs/PROJECT_CONTEXT.md, DATABASE.md, DECISIONS.md, TASKS.md, HANDOFF.md | Cần bàn giao sau task | Thêm snapshot QA/giới hạn và dẫn tới8 báo cáo + evidence | Phân biệt source/database/test mới với lịch sử | Hash/diff/index/link checks |

Không thay đổi Frontend runtime/style/config, dependency/lockfile, SQL/schema/env/auth/authorization, business rules hoặc transaction. Không thêm/xóa test case, không nới kỳ vọng để hợp thức hóa lỗi; chỉ sửa tên trong assertion guard. Không có source optimization đã thử rồi rollback.

Các sửa trong **script kiểm chứng mới do QA tạo**: sửa regex parse cột không hợp lệ, bổ sung DATE bị bỏ sót (95→96 expected columns), giới hạn regex candidates CSS tokens để không nhận nhầm pseudo selectors. Lượt script lỗi không được tính pass; sau sửa expected96/observed96/mismatch0. Lệnh child npm đầu tiên dùng shell:true báo DEP0190; đã đổi sang ComSpec với command cố định ở lần kiểm tiếp. Không có production change do các lỗi helper này.

Không giữ tối ưu đụng transaction wrappers/pagination locking, không gỡ thin services/public exports/tokens/scaffold/dependencies, không đổi fonts hoặc thêm memoization vì không có bằng chứng lợi ích cần thiết. Build size chỉ là đo artifact, không claim giảm bundle/tăng tốc.

Review thay đổi QA bằng `git diff` (unstaged); phần staged67 file có trước vẫn nguyên. [baseline](evidence/baseline.json) và [static-after](evidence/static-after.json) kiểm byte hash file ban đầu; `git diff --cached` gồm công việc FE trước QA, không lấy toàn bộ nó làm thay đổi QA.
