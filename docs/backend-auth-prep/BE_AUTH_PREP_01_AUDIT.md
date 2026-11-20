# BE-AUTH-PREP-01 — Authentication audit

Xác minh **2026-11-20**, Git HEAD `8d4a1d2`, working tree/index sạch trước task. Giai đoạn A chỉ đọc; giai đoạn B thêm test/tài liệu, không sửa runtime auth/config/schema hoặc Frontend. Kết luận: contract/source được xác minh; **chưa sẵn sàng nghiệm thu login trên MySQL thật với môi trường hiện tại**.

## Kiến trúc và nguồn

Luồng HTTP → Express JSON parser → auth router/limiter → controller/validator → service → model/SQL → error middleware/JSON response. Không có repository riêng: model là lớp truy cập dữ liệu.

| Phần | Source và vị trí quan trọng |
| --- | --- |
| Startup/config | [server.js:7](../../Backend/src/server.js#L7) SELECT1 rồi bind loopback; [co-so-du-lieu.js:5](../../Backend/src/config/co-so-du-lieu.js#L5) đọc Backend/.env, tạo pool theo DB_*; NODE_ENV không tự chọn test DB. |
| Factory/mount | [app-factory.js:49](../../Backend/src/app-factory.js#L49) cors(), JSON256kb; auth mount tại dòng56; factory nhận database tường minh, app.js bọc pool ứng dụng. |
| Router | [xac-thuc.routes.js:6](../../Backend/src/routes/xac-thuc.routes.js#L6): register/login/me/logout; limiter5/10 mỗi15phút/IP, draft-7 headers, memory store. |
| Controller | [xac-thuc.controller.js:5](../../Backend/src/controllers/xac-thuc.controller.js#L5): kiểm Content-Type JSON và validator trước service;201 register,200 login/me/logout. |
| Validator | [kiem-tra-xac-thuc.js](../../Backend/src/utils/kiem-tra-xac-thuc.js): allowlist body, Unicode/length/email/password; không nhận role/status client gửi. |
| Service | [xac-thuc.service.js:18](../../Backend/src/services/xac-thuc.service.js#L18): kiểm JWT config trước hash/lookup; bcrypt; ký token rồi ghi login event; allowlist profile, không trả credential. |
| Model | [xac-thuc.model.js:7](../../Backend/src/models/xac-thuc.model.js#L7): SELECT principal/RBAC; dòng24 lookup login; dòng28 transaction đăng ký reader. SQL có tham số. |
| AuthN/AuthZ | [xac-thuc.js:3](../../Backend/src/middlewares/xac-thuc.js#L3) kiểm Bearer/JWT/principal; dòng15 yeuCauQuyen kiểm permissions, không bypass theo tên admin. |
| JWT | [jwt.js:8](../../Backend/src/utils/jwt.js#L8): sign/verify HS256, issuer/audience,15phút và giới hạn subject. |
| Lỗi | [xu-ly-loi.js](../../Backend/src/middlewares/xu-ly-loi.js): status/code/message/details;401 có WWW-Authenticate, lỗi nội bộ không lộ SQL/stack. |

## JWT

- jsonwebtoken **9.0.3** installed/lock. Sign HS256; verify chỉ algorithms=[HS256], issuer=libriflow-api, audience=libriflow-client,maxAge=900giây. Không đổi các giá trị này.
- Token phát hành có sub/iat/exp/iss/aud; không role/permission/profile. Subject là ID chuỗi dương, giới hạn BIGINT unsigned; verifier kiểm cấu trúc/range, iat/exp nguyên, iat không ở tương lai, exp>iat và khoảng exp-iat≤900. JWT phát hành không có refresh token/jti/revocation list.
- Secret lấy từ process.env.JWT_SECRET; dotenv không override biến process có sẵn theo mặc định. Source yêu cầu chuỗi có ít nhất32byte sau trim; kiểm độ dài không chứng minh entropy. Signing dùng giá trị cấu hình gốc, nên operator phải cấp giá trị ổn định/chính xác giữa các process, không tự trim/rotate tùy request.
- **Hôm nay:** jwtPresent=false, kiểm utility trả JWT_NOT_CONFIGURED. Không in giá trị secret/token hoặc sửa env. Login/register body hợp lệ503 trước lookup/hash/ghi; request thiếu/sai dạng Bearer vẫn401 trước bước kiểm secret.
- Header chấp nhận Bearer không phân biệt hoa/thường, đúng một dấu cách và3đoạn URL-safe, tổng header≤4096. Chữ ký/claim sai → INVALID_TOKEN401; hết hạn → TOKEN_EXPIRED401. Không tắt verify để kiểm thử.

## Mật khẩu và dữ liệu người dùng

- bcryptjs **3.0.3**, đăng ký hash cost12 với salt do thư viện tạo. Password đăng ký≥12Unicode code point và≤72byte UTF-8; login1..72byte, Unicode hợp lệ; **không trim password**.
- Name/email/phone được trim, giới hạn100/150/20code point; email lowercase và regex định dạng cơ bản. Chưa có email ownership verification. Phone tùy chọn/null; register không nhận avatar/status/roles/user_id.
- Login chỉ chấp nhận hash bcrypt nhận diện dạng2a/2b/2y; so sánh qua bcrypt. Không có user/hash hỏng/sai password cùng INVALID_CREDENTIALS401; dummy bcrypt hash ngẫu nhiên được dùng khi thiếu hash. Không chứng nhận timing hoàn toàn bằng nhau hoặc không thể dò tài khoản.
- Đúng mật khẩu nhưng account inactive/locked → ACCOUNT_INACTIVE403. Đăng nhập ký JWT trước rồi ghi event login; ghi event lỗi thì request lỗi, không trả token. Đây là thao tác ghi, kể cả khi chỉ muốn kiểm thử login.
- Principal lọc allowlist trường công khai; không trả password/hash/token qua me/register. Không đọc profile/hash thật trong audit này; user count hiện0.

## Authorization và database

Nguồn [model JOIN](../../Backend/src/models/xac-thuc.model.js#L9), [seed](../../Backend/sql/seeds/initial-permissions.sql), [FE01 matrix](../../Frontend/docs/02_AUTHORIZATION_MATRIX.md). Authentication xác định user active; authorization quyết định permission của request. Roles/permissions tải lại từ5bảng RBAC mỗi request, Set loại trùng; thay quyền/status có hiệu lực request tiếp theo. User bị xóa → INVALID_TOKEN401. Một user có thể có nhiều role; không ép một role duy nhất phía FE.

SELECT chỉ metadata/aggregate/grants mới: MySQL8.0.40,16bảng;26cột ở6bảng auth/RBAC/history, status ENUM active/inactive/locked; users0,3role. Không chạy DDL/seed/migration.

| Role thực tế | Permissions hiện tại |
| --- | --- |
| reader | book_view |
| librarian | book_view,book_create,book_update,copy_manage,borrow_manage,return_process,fine_manage,report_view,forecast_view |
| admin | Như librarian cộng book_delete,user_manage |

category_manage count0 dù source/seed yêu cầu cho ghi danh mục: sai khác đã biết giữa thiết kế và DB thật, không tự cấp. Public catalog không yêu cầu book_view ở middleware. Ma trận FE01 khớp phạm vi auth đã rà; quyền/ownership từng nghiệp vụ vẫn phải dựa router/service cụ thể.

SHOW GRANTS chỉ xuất boolean: tài khoản MySQL ứng dụng có quyền global và GRANT OPTION; không phải tài khoản test least-privilege. Không in user/host/grant text. Đây là quyền kết nối DB, khác với role admin/librarian/reader của ứng dụng.

## Môi trường, giới hạn và bàn giao

Không có TEST_DB_* trong process; [guard](../../Backend/integration/an-toan.mjs#L11) từ chối MISSING_TEST_DB_NAME trước kết nối. Không xác minh được target test/UUID/account/marker hiện đang dùng; không kết luận mọi instance phụ đều không tồn tại. Runner TASK018 tạo instance tạm đã dừng, kết quả cũ không phải lần chạy mới.

Không chạy setup/instance-isolee vì chúng tạo database/schema/seed/account; task này chỉ có điều kiện chạy trên môi trường cô lập đã xác minh, chưa đủ bằng chứng để thực hiện các bước đó. Kết quả [tests](BE_AUTH_PREP_01_TEST_REPORT.md), [API contract](BE_AUTH_PREP_01_API_CONTRACT.md), [accounts](BE_AUTH_PREP_01_TEST_ACCOUNTS.md), [risks](BE_AUTH_PREP_01_RISKS.md). Không phải audit production/pentest/dependency advisory đầy đủ.
