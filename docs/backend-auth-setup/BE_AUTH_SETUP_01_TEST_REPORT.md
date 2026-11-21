# BE-AUTH-SETUP-01 — Test report

Xác minh **2026-11-21**, sau phê duyệt có điều kiện của người dùng. **10/10 scenario đạt, 0 thất bại/skip** trên instance MySQL 8.0.40 mới. Node đếm 11/11 khi gồm test cha. Baseline tiếp tục: HEAD 8c224e8 sạch; Node 24.20.0/npm 11.19.0.

Nguồn: [suite không đổi](../../Backend/integration/xac-thuc.mjs), [runner](../../Backend/integration/instance-isolee.mjs), [evidence JSON](evidence/BE_AUTH_SETUP_01_2026-11-21.json). Chạy một lần, 09:16:07–09:16:22 ngày 2026-11-21 (Asia/Bangkok). Không tái sử dụng kết quả TASK-018 làm bằng chứng.

## Lệnh và kết quả

Chạy từ Backend:

~~~powershell
node integration/ke-hoach-xac-thuc.mjs
npm.cmd test
node --test test/moi-truong-xac-thuc.test.js
node integration/instance-isolee.mjs --auth-only --allow-create-isolated
npm.cmd test
~~~

| Kiểm tra | Kết quả mới |
| --- | --- |
| Plan chỉ đọc | Main identity được xác minh, binary 8.0 có sẵn, 0 database writes. |
| Unit/safety trước → sau | 178/178 → 178/178, 0 fail/skip. |
| Guard targeted | 3/3 đạt; từ chối cờ auth không đầy đủ trước startup. |
| Auth integration | 10/10 scenario, Node 11/11 gồm test cha; process exit 0, runner PASS. |
| Syntax/import/export/casing/cycles | 78 JS/MJS, 201 cạnh import tương đối, 265 import bindings; 0 lỗi/vòng. |
| Main trước/sau | Identity và metadata/count hashes không đổi; chỉ SELECT ở main. |
| Phạm vi source | 97/97 file Frontend, 59/59 file Backend/src, 6/6 file SQL và 4/4 file env/example khớp SHA-256 baseline. HEAD/index không đổi. |
| Kiểm cuối tài liệu/diff | 143 local links tại 13 docs hợp lệ; UTF-8/whitespace và git diff --check đạt. Không thấy mẫu JWT đầy đủ/bcrypt hash/private key trong file thay đổi, evidence hoặc mysql.log; đây chỉ là scan theo mẫu. |

## Từng scenario

| # | Tình huống | Bằng chứng khi suite đạt |
| --- | --- | --- |
| 1 | Register/login hai fixture | HTTP 201/200; reader mặc định, staff thêm librarian; bcrypt cost 12; JWT HS256, 5 claims, exp−iat = 900; Bearer/no-store; không password/hash trong response. |
| 2 | Current user | Me 200; đúng ID, role/permission từ SQL, reader không report_view, staff có; không password/hash/token. |
| 3 | Login lỗi | Sai password/unknown email 401 INVALID_CREDENTIALS; thiếu email/password hoặc email sai 400 VALIDATION_ERROR. |
| 4 | Authorization header | Thiếu JWT, Basic, token malformed đều 401 AUTHENTICATION_REQUIRED. |
| 5 | JWT âm tính | Sai signature/issuer/audience, payload bị sửa: 401 INVALID_TOKEN; expired: 401 TOKEN_EXPIRED; signed subject không tồn tại: 401 INVALID_TOKEN. |
| 6 | RBAC | Statistics overview: thiếu JWT 401, reader 403, staff 200; claim admin/report_view giả vẫn 403 theo DB. |
| 7 | Status account | Fixture inactive/locked bị chặn login và me bằng token đã phát hành: 403 ACCOUNT_INACTIVE; khôi phục active cho bước tiếp. |
| 8 | Logout/event | Logout 200, cùng token vẫn gọi me 200 trước deactivation; GET/logout không thêm login event; đúng 2 login events được lưu trong MySQL. |
| 9 | JWT config thiếu | Factory chẩn đoán trả 503 JWT_NOT_CONFIGURED trước SQL, số lời gọi database = 0. |
| 10 | DB fault mô phỏng | Inject ECONNREFUSED trả 503 DATABASE_UNAVAILABLE, không lộ thông tin nội bộ. Không phải outage MySQL thật. |

Tám nhóm đầu dùng database/model/HTTP/JWT thực sau guard. Hai nhóm cuối là chẩn đoán có chủ đích; không báo tất cả là kiểm thử outage/config của mysqld thực. Đây là HTTP loopback, không phải browser smoke.

## Cô lập, quyền và cleanup

- Instance mới chỉ bind 127.0.0.1, port 61458, datadir mới dưới %TEMP%/libriflow-integration-BOn3tG/data; UUID/datadir/cổng khác main và không chồng lấn đường dẫn main.
- Database/account chưa tồn tại trước setup; chỉ tạo trên instance mới đã pin. Nạp 16 bảng từ DDL/seed không sửa và 2 bảng guard/run. Marker version 1, SQL fingerprint khớp.
- Sau setup, SHOW GRANTS xác minh runtime chỉ INSERT/SELECT/UPDATE trên schema test, không global/admin/GRANT OPTION. Không dùng credential chính cho target test.
- Tổng đúng 2 user test, cả 2 đã inactive; runner SELECT đối chiếu ID/email/name/status với manifest. Có 1 run passed, 10 scenario passed và 2 login events.
- HTTP/pools đóng; mysqld riêng đã dừng. Kiểm tra OS sau chạy: PID 53212 không còn, port 61458 không có listener. Không DELETE/DROP/TRUNCATE/reset.
- Datadir/result giữ lại để audit theo kế hoạch. Không có credential bền để bàn giao hoặc tiếp tục dùng instance đã dừng. Không sinh secret file; JWT/password CSPRNG chỉ dùng trong RAM, không log hoặc đưa vào Git.

## Main chỉ đọc

Main MySQL 8.0.40, users = 0 theo plan; runner dùng SELECT metadata/aggregate trước/sau, không login vào ứng dụng main. Hash khớp:

- Metadata: 18d26653eb38148712c97014df3a33c61b9d63c810e2c6d31462e661ec8e3207.
- Counts: 583fce11d9954abd44ab0cd8bc8ce01ba276aedd2d37c613656dbfebe3df37b6.

Count hash không chứng minh mọi giá trị field không đổi. Chứng cứ bảo vệ main gồm tách connection/instance, identity pins, SQL scope của source và snapshot chỉ đọc; không thay config/quyền main.

## Giới hạn và kết luận

Đạt kiểm chứng Backend Authentication end-to-end trong phạm vi đã duyệt. Đủ bằng chứng kỹ thuật để bắt đầu xây dựng FE-06 **sau nghiệm thu**; chưa tự triển khai FE-06.

Backend dev lâu dài/credential cho browser chưa được cấp; không đổi DB_* hoặc JWT_SECRET chính. Muốn chạy tích hợp FE-06 trong browser cần target dev riêng được xác minh và cấu hình riêng. Browser/CORS enforcement, actual MySQL outage, TLS/proxy, tải/concurrency, pentest/production hardening chưa kiểm. Backend không có lint/build script; Frontend tests/lint/build không chạy lại vì toàn bộ Frontend giữ nguyên.

Thay đổi lần tiếp tục chỉ ở runner evidence/guards và tài liệu, không đổi suite 10 scenario, runtime auth, API contract hoặc SQL nguồn. [Handoff](BE_AUTH_SETUP_01_HANDOFF.md) ghi phạm vi cuối và bước tiếp.
