# BE-AUTH-SETUP-01 — Auth integration

Xác minh **2026-11-21**: [suite](../../Backend/integration/xac-thuc.mjs) đã đạt **10/10 scenario** trên MySQL test mới; Node 11/11 gồm test cha. [Test report chi tiết](BE_AUTH_SETUP_01_TEST_REPORT.md), [evidence](evidence/BE_AUTH_SETUP_01_2026-11-21.json). [API contract](../backend-auth-prep/BE_AUTH_PREP_01_API_CONTRACT.md) và runtime giữ nguyên.

| Nhóm đã chạy | Kết quả |
| --- | --- |
| Register/login | Hai fixture qua API/SQL thật; 201/200, bcrypt cost 12, Bearer/no-store, không lộ password/hash. |
| Current user | Me 200, đúng ID và roles/permissions từ DB; reader không report_view, staff có. |
| Login lỗi | Sai/unknown credentials 401; thiếu email/password hoặc email sai 400. |
| Header | Thiếu/BASIC/malformed Bearer đều 401. |
| JWT | HS256, issuer/audience/5 claims và TTL 900 đúng; sai chữ ký/issuer/audience/sửa payload/user không tồn tại 401; hết hạn TOKEN_EXPIRED 401. |
| Authorization | Statistics overview: thiếu token 401, reader 403, staff 200; role/permission claim giả không vượt RBAC DB. |
| Account status | inactive/locked từ chối cả login/me bằng 403 ACCOUNT_INACTIVE. |
| Logout/events | Logout 200 không revoke; token vẫn gọi me 200 trước deactivation. Đúng 2 SQL login events, GET/logout không thêm event. |
| Thiếu JWT config | Factory chẩn đoán 503 JWT_NOT_CONFIGURED trước SQL, database calls = 0. |
| DB fault mô phỏng | Inject ECONNREFUSED, trả 503 DATABASE_UNAVAILABLE an toàn; không phải outage MySQL thật. |

Tám nhóm đầu dùng model, MySQL, HTTP và JWT thật sau guard. Hai nhóm cuối là diagnostic có chủ đích. Không suy kết quả này thành browser/CORS, tải hoặc production certification.

JWT secret 48 byte CSPRNG trong RAM qua seam getSecret hiện hữu; không dùng production secret. Parent tách DB_*/JWT_SECRET/forecast config chính khỏi env child. Giữ HS256, issuer libriflow-api, audience libriflow-client, claims sub/iat/exp/iss/aud và 900 giây.

App factory/middleware/validator/controller/service/model không đổi. HTTP chỉ loopback cổng 0, không log body/header/token. Assertion và manifest không xuất credential/hash. Logout giữ stateless semantics: token có thể dùng tới exp khi account còn active; không blacklist/refresh/revocation mới.

Cả hai fixture đã inactive và instance đã dừng. Chưa có Backend dev lâu dài hoặc credential browser được bàn giao; xem [environment](BE_AUTH_SETUP_01_ENVIRONMENT.md).
