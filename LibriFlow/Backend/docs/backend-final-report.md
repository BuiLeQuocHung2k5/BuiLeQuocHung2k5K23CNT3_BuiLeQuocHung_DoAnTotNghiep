# Báo cáo xác minh và bàn giao Backend — TASK-018

Xác minh ngày **2026-11-07**, trên Windows, Node.js và MySQL 8.0.40 cài tại máy. Đây là kết quả kiểm thử phát triển cục bộ, không phải chứng nhận triển khai production.

## Kết luận

**BACKEND TẠM HOÀN THÀNH — CÒN BLOCKER CẦN XỬ LÝ.** Có thể lập kế hoạch giao diện từ [hợp đồng 40 API](frontend-api-handover.md). Kết nối đăng ký/đăng nhập với cấu hình ứng dụng hiện tại còn bị chặn: kiểm tra boolean sau khi nạp cấu hình cho thấy chưa có `JWT_SECRET` đạt yêu cầu tối thiểu 32 byte. Không đọc/in giá trị secret, không sửa `.env`. Database chính hiện có 0 người dùng nên cũng chưa có tài khoản nhân viên để sử dụng luồng quản trị. Không tự tạo tài khoản/cấp quyền.

## Kiến trúc đã kiểm tra

- Node.js ES Modules, Express, mysql2/promise pool, bcryptjs, jsonwebtoken và express-rate-limit; dependency và npm scripts giữ nguyên.
- `src/app-factory.js`: factory thuần, bắt buộc database dependency; `src/app.js`: wrapper pool ứng dụng; `src/server.js`: SELECT kiểm tra DB trước khi listen trên `127.0.0.1`. Các layer Route → Controller → Service → Model, validation dùng utils; JWT/RBAC và lỗi dùng middleware chung.
- 10 module: xac-thuc, sach, ban-sao-sach, danh-muc, phieu-muon, qua-han, tien-phat, lich-su-su-dung, thong-ke, du-bao. Health là hai endpoint riêng. Không đổi lại tên module đã Việt hóa.
- Duyệt AST TypeScript sẵn có tại máy: **73 file JS/MJS**, **192 import tương đối**, đủ file/export, casing đúng, không import vòng. `node --check` đạt toàn bộ. Duyệt stack router thực tế: **11 router mount, 40 cặp method/path duy nhất, không trùng**; hai mount `/api/books` phục vụ copies và sách có chủ đích. Dấu `/` cuối URL không tạo API nghiệp vụ mới.
- Pool được đóng trong script kiểm tra và test; transaction dùng rollback/release trong finally. Server chưa có xử lý graceful shutdown khi nhận tín hiệu; đây là giới hạn vận hành, không sửa trong task này.

## MySQL thật và cách ly

Nguồn: `integration/{instance-isolee,an-toan,kich-ban}.mjs`, `setup.mjs`, `run.mjs`, `sql/schema.sql` và seed hiện có.

Runner mới `node integration/instance-isolee.mjs` dùng binary mysqld đã cài, tạo datadir rỗng riêng dưới OS temp. Không nạp my.ini hoặc đăng ký service; bind loopback, cổng riêng, UUID/datadir khác instance chính. Root bootstrap chỉ dùng trên instance mới để tạo database allowlist và tài khoản test-schema-only. Password test sinh ngẫu nhiên trong RAM, truyền qua environment của tiến trình con, không ghi `.env`/tài liệu/log. Sau đó setup/test chạy bằng tài khoản giới hạn, có kiểm tra DATABASE(), UUID pin, SHOW GRANTS, marker và fingerprint. Không fallback sang pool chính.

16 bảng ứng dụng và hai bảng guard/run được dựng **chỉ trong instance mới**. Script setup bỏ CREATE DATABASE/USE khỏi bản SQL trong bộ nhớ trước khi chạy; file schema/seed gốc không thay đổi. Không chép dữ liệu chính. Không DROP/TRUNCATE hoặc tự xóa fixture; mỗi lần chạy tạo instance mới. Kết thúc đã xác nhận instance test dừng; datadir, mysql.log và result.json không chứa credential được giữ trong thư mục temp để kiểm tra.

Run đạt: **2026-11-07 09:38:44–09:38:57 UTC**. Kết quả tại `%TEMP%/libriflow-integration-e7T3j9/result.json`, status PASS, guard version 1, run status passed; fingerprint schema/seed `5bc5a860b39dff47d23d29bfdd0fdc26fda191f6fa94fc9e441bd021b394d1dd`.

Đối chiếu SELECT trước/sau trên `libriflow`: hash metadata cột và hash số bản ghi của 16 bảng không đổi; `category_manage` chưa cài, số quy định phạt active bằng 0. Đây là kiểm tra metadata/count, không phải checksum toàn bộ giá trị dữ liệu. Tách kết nối/UUID/account là lớp bảo vệ chính; runner không thực hiện câu ghi trên instance chính.

## Kết quả kiểm thử

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| `npm.cmd test` trước/sau | **172/172 đạt**, 0 fail, 0 skip; không xóa test cũ |
| Integration MySQL thật | **21/21 tình huống đạt**: giữ 15 cũ + 6 bổ sung; Node báo 22/22 vì tính thêm test cha, 0 fail/skip |
| Cú pháp/import/export/casing/chu trình | 73 file / 192 import đạt; chưa chạy Linux thực tế |
| `npm.cmd run db` | SELECT 1 thành công, pool đóng |
| Smoke thật, chỉ SELECT trên DB chính | Health, health/db, books, categories, book-copies 200; auth/me, logout, forecasts/me thiếu JWT 401; login/register body rỗng 400 |
| `git diff --check` | Đạt sau cập nhật tài liệu; không stage/commit/push |

Integration dùng HTTP, JWT, bcrypt, RBAC, model và MySQL thật; không mock SQL. Các tình huống bao gồm đăng ký/login/email trùng/hash, tạo danh mục/sách/copies, UNIQUE/FK, một/nhiều bản sao, trả từng phần/toàn bộ/trả lặp, từ chối copy không hợp lệ, rollback cả header và usage event, hai request tranh cùng copy chỉ một 201 và một 409, SELECT chứng minh không có hai lượt mượn mở. Kiểm tra reader ownership, token giả, chặn xóa dữ liệu có lịch sử, event login/mượn/trả, GET không ghi, thống kê không rỗng theo ngày/tuần/tháng và quá hạn đọc không sửa trạng thái đều đạt.

Phạt: xác minh từ chối reader, không có quy định thì 404 và không sinh tiền/bản ghi phạt. **Chưa chạy thành công tạo phạt, chống phạt trùng và thanh toán trên MySQL thật** vì schema/seed không cung cấp mức phạt; không tự đặt mức tiền. Unit/mock đã bao phủ các luồng này. Forecast: insufficient_data và generate 503 đúng hợp đồng, DuBaoTanSuat vẫn rỗng; ready/MAE chỉ có fixture unit, chưa có đánh giá vận hành.

## Lỗi đã sửa và phạm vi thay đổi

1. `integration/kich-ban.mjs`: refactor trước đổi nhầm `bangKeKiemThu.borrows.push` thành thuộc tính không tồn tại `thongKePhieuMuon.push`; khôi phục khóa manifest `borrows`, giữ nghiệp vụ/API nguyên trạng.
2. Assertion FK trong hai tình huống chấp nhận đúng hai mã MySQL tương đương `ER_NO_REFERENCED_ROW` (1216) và `ER_NO_REFERENCED_ROW_2` (1452). MySQL thật với account giới hạn trả mã 1216; production đã xử lý cả hai. Giữ kiểm tra rejection, không có bản ghi lỗi và rollback; không nới điều kiện thành bỏ qua lỗi bất kỳ.
3. Runner mới xử lý khởi tạo instance riêng, bootstrap, đóng đúng tiến trình. Các lần thử bootstrap ban đầu bị từ chối quyền host trước khi chạy scenario; một lần tiếp theo đạt 13/15 và lộ khác biệt mã FK. Chỉ run cuối nêu trên được tính là PASS.

Không sửa source nghiệp vụ, `.env`, package/lockfile, schema/seed/migration, SQL gốc, Git metadata/remote. Giữ toàn bộ thay đổi chưa commit từ TASK-017. Chi tiết file task này: runner và scenarios; ba tài liệu bàn giao; README, hướng dẫn integration, các tài liệu chuyên đề cập nhật trạng thái xác minh; `docs/{PROJECT_CONTEXT,DATABASE,DECISIONS,TASKS,HANDOFF}.md`.

## Bảo mật và giới hạn

Đã đọc source và đối chiếu test: bcrypt cost 12; JWT HS256 15 phút với issuer/audience/algorithm cố định; minimal claims, secret lấy từ environment và thiếu secret trả 503 trước ghi. Middleware đọc lại user active/quyền MySQL mỗi request; không bypass tên admin hoặc user_id do client gửi. SELECT cá nhân có scope theo JWT; request ghi dùng SQL tham số/whitelist, validation; lỗi không trả SQL/stack/hash. Login rate limit 10/IP/15 phút, register 5; test expiry/sai chữ ký/401/403/account locked và đổi grant đạt ở unit.

Đây là kiểm tra source/test, không phải pentest hay audit dependency mới. Logout stateless không thu hồi JWT; limiter in-memory, CORS phát triển đang mở, chưa kiểm thử production/TLS/multi-instance/tải lớn. Các giới hạn này và blocker cấu hình được ưu tiên trong [danh sách tồn đọng](backend-known-issues.md).

Chưa triển khai Frontend, chức năng mới, refresh token, cron hay thuật toán mới. API và JSON keys/RBAC/SQL giữ nguyên. Có đủ căn cứ lập kế hoạch Frontend; cần xử lý cấu hình JWT và chuẩn bị tài khoản/môi trường được duyệt trước khi nghiệm thu kết nối auth/quản trị thực tế.
