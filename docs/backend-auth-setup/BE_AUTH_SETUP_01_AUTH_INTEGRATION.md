# BE-AUTH-SETUP-01 — Auth integration

Xác minh source **2026-11-20**; [API contract](../backend-auth-prep/BE_AUTH_PREP_01_API_CONTRACT.md) giữ nguyên. Đã chuẩn bị [suite MySQL](../../Backend/integration/xac-thuc.mjs) và [launcher](../../Backend/integration/chay-xac-thuc.mjs); **chưa chạy trên MySQL test**.

## Các tình huống chờ chạy

| Nhóm | Kiểm tra dự kiến |
| --- | --- |
| Bootstrap thực | Register 2 fixture, bcrypt cost 12, login trả token/900 giây/no-store; verify HS256, issuer/audience và 5 claims. |
| Current user | Me trả ID chuỗi, roles/permissions từ SQL; không password/hash/token. |
| Login lỗi | Sai password/unknown email: 401. Thiếu email/password hoặc email sai: 400. |
| Header | Thiếu Bearer, Basic hoặc malformed: 401 AUTHENTICATION_REQUIRED. |
| JWT | Sai signature/issuer/audience hoặc sửa payload: 401 INVALID_TOKEN; hết hạn: 401 TOKEN_EXPIRED; signed subject không có user: 401. |
| Authorization | GET statistics/overview: thiếu JWT 401, reader 403, staff 200. Claim admin giả không vượt RBAC từ DB. |
| Account status | Fixture inactive/locked: login/me 403. Khôi phục active để chạy tiếp; cleanup cuối đặt inactive. |
| Logout/event | Logout 200 không revoke, me với cùng token vẫn 200. GET/logout không thêm login event; 2 login thật có 2 SQL events. |
| Thiếu JWT config | Factory chẩn đoán với getSecret undefined trả 503 trước mọi SQL. |
| DB fault | Factory chẩn đoán inject ECONNREFUSED trả 503 DATABASE_UNAVAILABLE, không lộ nội bộ. Đây là mô phỏng lỗi kết nối, không phải outage MySQL thật. |

Tổng 10 scenario dự kiến; Node tính thêm test cha thành 11 nếu toàn bộ thực thi. Tám nhóm đầu dùng model/SQL/MySQL thật sau guard; hai nhóm cuối là chẩn đoán cấu hình/fault injection. Chưa có pass count integration mới.

## JWT và fail-closed

Suite sinh 48 byte CSPRNG riêng trong RAM sau khi mở target đã guard, truyền qua getSecret hiện hữu. Không dùng JWT_SECRET production. Parent auth-only loại DB_*, JWT_SECRET và forecast config chính khỏi env child.

Giữ HS256, TTL 900, issuer libriflow-api, audience libriflow-client, claims sub/iat/exp/iss/aud. Token âm tính không thay runtime algorithm, TTL hoặc API. Unit hiện hữu đã kiểm JWT/config fail-closed bằng model giả. Main vẫn thiếu JWT hợp lệ; chưa có login MySQL thành công mới.

## HTTP và dữ liệu

Dùng app factory, JWT, middleware, validator, controller, service và model hiện hữu. HTTP loopback cổng 0; không log request body/header/token. Assertions chỉ xuất status/code/boolean; scenario failure dùng tên tĩnh, không dump credential hoặc SQL response. Manifest không chứa token/password/hash.

Protected GET thống kê yêu cầu report_view, giúp kiểm RBAC mà không tạo dữ liệu nghiệp vụ khác. [Logout controller](../../Backend/src/controllers/xac-thuc.controller.js) giữ stateless semantics: token có thể dùng tới exp khi account còn active. Không có blacklist/refresh hoặc server revocation mới.
