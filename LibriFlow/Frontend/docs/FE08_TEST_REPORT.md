# FE-08 — Test report

Xác minh **2026-11-21**. **Hoàn tất phần lập trình trang quản lý sách; chưa kiểm chứng CRUD Frontend end-to-end với Backend/MySQL thật.**

Baseline HEAD 8c224e8, có staged/unstaged/untracked từ BE-AUTH-SETUP-01 và FE-06/07. Lưu hash 258 file và index trước FE-08; giữ nguyên thay đổi đang có. Node 24.20.0/npm 11.19.0, không thêm dependency.

## Contract đã đối chiếu

Nguồn: [inventory](01_BACKEND_API_INVENTORY.md), [matrix](02_AUTHORIZATION_MATRIX.md), [mapping](03_FRONTEND_API_MAPPING.md), [gaps](04_API_GAPS_AND_RISKS.md), [guide](05_FRONTEND_INTEGRATION_GUIDE.md), [FE05](FE05_HANDOFF.md), [FE06](FE06_HANDOFF.md), [FE07](FE07_HANDOFF.md); Backend [routes](../../Backend/src/routes/sach.routes.js), [controller](../../Backend/src/controllers/sach.controller.js), [service](../../Backend/src/services/sach.service.js), [validator](../../Backend/src/utils/kiem-tra-sach.js), [model](../../Backend/src/models/sach.model.js), [schema](../../Backend/sql/schema.sql), [authorization](../../Backend/src/middlewares/xac-thuc.js).

| API | Dùng trong FE-08 |
| --- | --- |
| GET /api/books | page/limit/search; search literal substring title/author/publisher, sort book_id DESC do Backend. Giữ data + pagination. |
| GET /api/books/:id | Lấy chi tiết mới khi xem/sửa, giữ ID BIGINT dạng chuỗi. |
| POST /api/books | book_create; JSON 7 trường cho phép, 201 + Book. |
| PUT /api/books/:id | book_update; thay thế đầy đủ 7 trường, 200 + Book. |
| DELETE /api/books/:id | book_delete; xóa cứng sau xác nhận UI; 200 data=null, không soft-delete/status body. |
| GET /api/categories | Lookup tên thể loại, page=1/limit=100/search trong form; không dùng làm bộ lọc sách. |

GET books/detail ở Backend public, không yêu cầu book_view. Route /app/sach vẫn yêu cầu phiên theo FE-06, cho mọi user đã đăng nhập. Ghi cần đúng permission từ me, không Admin bypass.

DTO sách không có ISBN, ảnh, số lượng/trạng thái bản sao hoặc tên thể loại. UI dùng book_id, biểu tượng sách và tên thể loại từ lookup thực khi có; ngoài kết quả lookup hiển thị mã tham chiếu. Không thêm dữ liệu giả hoặc trường mới.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend baseline | 232/232 tại 13 file, lint/build đạt. |
| Frontend cuối | **280/280 tại 15 file**, 0 fail/skip; ESLint và production build đạt. |
| Test mới FE-08 | 48 trong full suite: 26 service/validation/error + 22 UI/route/session. Targeted trước 2 ca UI cuối đạt 46/46. |
| Syntax/import/export/casing/cycles | 70 JS/JSX, 210 cạnh import tương đối, 261 local bindings; không lỗi/vòng. |
| Production HTTP smoke | 10 SPA shells/35 assets trả 200; preview loopback cổng OS cấp đã đóng. Không suy HTTP 200 thành guard hoặc browser UI pass. |
| Bảo toàn | 108/108 file Backend và tổng 176 file được bảo vệ khớp SHA-256 baseline; HEAD/index không đổi. |
| Database | Không truy cập hoặc ghi DB, tạo account/fixture, chạy seed/schema/integration runner hoặc start Backend. |

Lệnh từ Frontend:

~~~powershell
npx.cmd vitest run src/chuc-nang/sach/dich-vu-sach.test.js src/chuc-nang/sach/TrangQuanLySach.test.jsx
npm.cmd run test:run
npm.cmd run lint
npm.cmd run build
~~~

232 test cũ vẫn chạy. Chỉ cập nhật hai file test menu FE-07 để xác nhận route sách đã triển khai: primary menu có /app và /app/sach, tổng 7 link gồm tools; không giữ assertion lịch sử “chưa có menu sách”. Không xóa test hoặc nới permission assertion. Mock response được clone như JSON qua mạng, không dùng cùng reference với kho dữ liệu test để giả thành cache đã refresh.

## Tình huống đã kiểm bằng mock

React/router/Query/Context/Axios thật; transport dùng adapter mock, dữ liệu chỉ trong .test files, không có Backend/MySQL thật.

| Nhóm | Bằng chứng |
| --- | --- |
| Route/đọc | /app/sach có auth guard; anonymous không mount/call catalog. Reader không book_view vẫn đọc được public API, không thấy nút ghi. |
| List | Bảng dữ liệu từ envelope, skeleton, empty state, lỗi API an toàn và retry chủ động. Thiếu config không bị trình bày thành database rỗng. |
| Search/paging | Gửi đúng page/limit/search, giữ literal %/_; tìm/xóa từ khóa, đổi page size, phân trang. Xóa dòng cuối trang cuối về trang trước. Không gửi category/year/sort filter. |
| Detail | GET đúng ID chuỗi lớn, thông tin thật; xử lý BOOK_NOT_FOUND. HTML/envelope sai hoặc sai identity bị từ chối. |
| Quyền | Admin thiếu grant không được ghi; reader chỉ đọc, librarian với riêng book_update chỉ thấy sửa. Grant mất khi form mở thì không gửi write. Service kiểm lại trước request. |
| Create | Validation trước API, POST đúng 7 trường, success Toast và refetch danh sách. Enter trong tìm thể loại không submit sách. |
| PUT | Lấy detail mới trước form; giữ null, năm 0, reference ID lớn; không book_id/timestamps/ISBN trong body. |
| Delete | Không gửi trước xác nhận; Hủy không gửi; xác nhận gửi đúng một DELETE; 409 BOOK_HAS_COPIES không xóa dòng giả. |
| Lỗi ghi | Server validation map đúng field, không mất input/hiển thị raw SQL. Network/timeout/5xx hoặc response ghi sai có trạng thái chưa rõ, không auto retry; khóa gửi lại tới khi đóng và kiểm tra danh sách. |
| Pending/unmount | Form khóa khi gửi, không gửi trùng; abort chờ khi trang unmount, không Toast/cache success muộn. Abort không chứng minh server đã rollback. |
| FE06/07 | Provider thật + adapter mock: 401 rời trang sách về login; write 403 báo lỗi và giữ phiên. Bộ auth/permission cũ tiếp tục đạt. |
| Giới hạn validator | Unicode codepoint title/author/publisher; description raw UTF-8 <=65535 byte; year integer 0..65535/null; ID chuỗi unsigned BIGINT; readonly fields loại khỏi body. |

## Chưa kiểm và giới hạn

- Browser inventory báo host/native pipe unavailable; chưa quan sát responsive 375/768/1280, focus/dialog/keyboard/AT hoặc Network thực. Table FE-03 cuộn ngang và CSS 767px đã có; không coi jsdom là bằng chứng trực quan.
- TCP cổng Backend mặc định 3000 không mở, chưa có Backend dev/JWT/account hoạt động được bàn giao. Không gọi auth/write vào main hoặc dựng fixture để thử.
- Chưa Frontend CRUD E2E, transaction/concurrency/SQL thật. Kết quả Backend MySQL trước đây không thay cho kiểm chứng FE-08.
- Không hỗ trợ lọc thể loại/năm/trạng thái, ISBN, cover/upload, số bản sao, soft-delete, mượn/trả hoặc CRUD thể loại/bộ sách. Backend chưa có API lookup BoSach; chỉ giữ/nhập series_id đã biết.
- Lookup thể loại hiển thị tối đa 100 kết quả mỗi từ khóa; tên ngoài lookup fallback ID. Category lookup lỗi vẫn giữ category_id cũ hoặc cho chọn chưa phân loại, không âm thầm bỏ tham chiếu.
- PUT không có version/ETag; lấy detail mới giảm stale form nhưng không giải quyết concurrent edits. Mạng/5xx không chứng minh write chưa xảy ra, vì vậy không tự replay.
- Quyền là snapshot me; Backend vẫn kiểm live mỗi request. Không thay Session Policy hoặc Auth/Authorization runtime.

[Handoff](FE08_HANDOFF.md) ghi file, cách chạy và điều kiện FE-09.

Kiểm tra bàn giao cuối: delta so với baseline chỉ 6 file hiện hữu sửa và 8 file mới, không xóa; 50 liên kết nội bộ trong 4 tài liệu đều tồn tại, UTF-8/whitespace và git diff --check đạt. HEAD và hash git ls-files --stage -z giữ nguyên.
