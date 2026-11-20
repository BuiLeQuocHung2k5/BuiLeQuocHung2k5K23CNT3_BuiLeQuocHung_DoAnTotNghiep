# BE-AUTH-PREP-01 — Test report

Ngày xác minh **2026-11-20**, Windows/Node24.20.0/npm11.19.0, HEAD8d4a1d2. Baseline mới, không lấy số đo TASK018/QA01 làm kết quả chạy hôm nay.

## Kết quả

| Kiểm tra/lệnh | Kết quả |
| --- | --- |
| `npm.cmd --prefix Backend test` trước sửa |172/172 pass,0fail/skip |
| `node --test test/chuan-bi-xac-thuc.test.js` tại Backend |3/3 pass,không SQL thật |
| `npm.cmd --prefix Backend test` sau thêm test |**175/175 pass**,0fail/skip; giữ172test cũ |
| `npm.cmd --prefix Backend run test:integration` |**CHƯA CHẠY MySQL scenarios**; nonzero,MISSING_TEST_DB_NAME,trước kết nối/ghi |
| Smoke HTTP factory/current config,DB chỉ SELECT |9/9check đạt;1SELECT1,0SQL auth/0ghi/0account tạo |
| Metadata/aggregate/RBAC/grants thật |Chỉ đọc;pool đóng; kết quả bên dưới |
| Frontend tests/lint/build mới |Không chạy vì không sửa Frontend; dùng hash đối chiếu toàn cây |

Guard từ chối là kết quả safety, **không phải integration pass hoặc skip thành công**. Không chạy setup/instance-isolee,không tạo schema/seed/account. Chưa có bằng chứng login thành công trên MySQL thật trong task này.

## Coverage unit/HTTP trong bộ test

[xac-thuc.test.js](../../Backend/test/xac-thuc.test.js) hiện hữu dùng bcrypt/JWT/Express thật và model giả: đăng ký reader/hash/normalize/injection/duplicate,login success,unknown email/wrong password/bad hash,active/inactive/locked,me/logout stateless,missing/malformed/expired/wrong signature/algorithm/issuer/audience/claims,role-only admin không bypass,permission/status/deleted user cập nhật request tiếp theo,missing/short secret fail-closed,login limiter10. [lich-su-thong-ke.test.js](../../Backend/test/lich-su-thong-ke.test.js) đã có login event đúng thứ tự và lỗi ghi event không trả token; không bổ sung test trùng chỉ để tăng số lượng.

Test mới [chuan-bi-xac-thuc.test.js](../../Backend/test/chuan-bi-xac-thuc.test.js):

1. Register/login giữ password có khoảng trắng bằng credential sinh ngẫu nhiên trong RAM; password bị trim trả401,đúng trả token900giây; email trim/lowercase,me giữ ID lớn dạng chuỗi,không lộ password/hash,logout vẫn không revoke. Kiểm no-store/WWW-Authenticate và số event phù hợp.
2. Năm attempt register body sai trả400,lần6trả429/Retry-After trước tạo account/SQL. Mỗi test có app/limiter mới,không dùng chung IP state giữa tests.
3. CORS OPTIONS có Authorization header trả204/wildcard/không credentials; GET me tiếp theo thiếu token vẫn401,không bypass auth.

Fixture import factory thuần,không import app.js hoặc pool chính. Database stub chặn query/execute/getConnection và assert0calls;authModel in-memory,JWT ký/verify bằng key ngẫu nhiên,không token bỏ chữ ký. HTTP real loopback cổng0 được đóng sau test. Đây là **kiểm chứng HTTP/crypto với model giả**, không phải SQL/MySQL integration hoặc tài khoản dùng được ở Frontend sau khi test kết thúc.

## Smoke với cấu hình ứng dụng hiện tại

Factory thật và model SQL thật dùng proxy pool chính chỉ cho SELECT; cấm transaction/mọi SQL ghi. JWT config thiếu được kiểm trước khi gửi body auth hợp lệ. Không gọi login hợp lệ tới server chính không có guard.

| Request | Status/code quan sát |
| --- | --- |
| GET /api/health |200 |
| GET /api/health/db |200;SELECT1 |
| GET /api/auth/me thiếu Bearer |401 AUTHENTICATION_REQUIRED |
| POST /api/auth/logout thiếu Bearer |401 AUTHENTICATION_REQUIRED |
| POST /api/auth/login body{} |400 VALIDATION_ERROR |
| POST /api/auth/login text/plain |415 UNSUPPORTED_MEDIA_TYPE |
| POST /api/auth/login body đúng cấu trúc giả |503 JWT_NOT_CONFIGURED;0lookup/event |
| POST /api/auth/register body đúng cấu trúc giả |503 JWT_NOT_CONFIGURED;0hash/accountSQL |
| OPTIONS /api/auth/me,Origin dev/Authorization |204 |

Các lỗi auth qua router có no-store;401 có WWW-Authenticate:Bearer. Proxy đếm tổng1SELECT,0SQL trong các request auth,0ghi bị thử/0account tạo. Đóng HTTP/connection pool trong finally. Không log body credential/token/secret/hash; chỉ status/code/header an toàn. Node HTTP/CORS headers không thay browser enforcement.

## Snapshot cấu hình và MySQL chỉ đọc

- JWT_PRESENT=false,JWT_SOURCE_VALIDATION=false,JWT_NOT_CONFIGURED. Không lấy/in giá trị; không sửa env. Installed: jsonwebtoken9.0.3,bcryptjs3.0.3,Express5.3.0,rate-limit8.7.3,mysql2 3.24.6,dotenv18.0.9.
- Tất cả7TEST_DB_* bắt buộc đều chưa có trong process. Chưa kiểm test server/account/marker/cleanup thực tế; không tự dùng account main.
- Main MySQL8.0.40,16bảng;metadata6bảng auth/RBAC/history có26cột,status ENUM active/inactive/locked. Users0 trước/sau kiểm,roles3,category_manage0;grants theo [audit](BE_AUTH_PREP_01_AUDIT.md). Không SELECT profile/password/hash người dùng.
- SHOW GRANTS xuất duy nhất boolean tổng hợp: main account có global privilege vàGRANT OPTION;không in identity/grant text. Không dùng tài khoản đó làm test runtime.

## Giới hạn và bảo toàn

Chưa kiểm login/register success/event persistence/transaction/RBAC changes trên MySQL cô lập mới;không browser FE06;không production TLS/proxy/advisory/pentest/load/timing audit. Kết quả TASK018 ngày2026-11-07 là lịch sử,không tính như run mới.

Lượt đọc version đầu gặp bcryptjs không export package.json; dừng trước khi đọc cấu hình/query,đã đọc metadata package bằng filesystem và chạy lại thành công. Một lệnh đọc source dùng brace expansion không phù hợp PowerShell đã được sửa;không có thao tác DB ở lệnh đó.

Runtime auth/middleware/JWT/password/schema/SQL/package/lock/env và toàn Frontend giữ nguyên; chỉ thêm1file test cùng tài liệu liên quan. Đối chiếu hash222file baseline,HEAD/index,links vàdiff cuối ở [handoff](BE_AUTH_PREP_01_HANDOFF.md). Backend không có script lint/build; không ghi kết quả unit như lint/build. Chạy syntax check cho test mới và giữ assertion/tests cũ.

Kiểm cuối: **97/97 file Frontend** và **83/83 file Backend được bảo vệ** (runtime src/SQL/integration/tests cũ/env/package/lock) khớp SHA256 baseline. Chỉ7docs cũ thay đổi,8file mới đúng phạm vi,không xóa file;HEAD/index entries giữ nguyên. Syntax test mới,UTF-8/whitespace vàgit diff --check đạt;14docs được kiểm có **147 liên kết nội bộ** hợp lệ,không line anchor vượt file.
