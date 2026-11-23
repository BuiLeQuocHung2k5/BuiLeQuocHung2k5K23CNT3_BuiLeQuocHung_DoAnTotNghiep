# BE-AUTH-SETUP-01 — Handoff

Xác minh **2026-11-21**. **Hoàn tất kiểm chứng Authentication end-to-end trong phạm vi test đã duyệt; dừng chờ nghiệm thu.** Không tự triển khai FE-06. [Test report](BE_AUTH_SETUP_01_TEST_REPORT.md), [evidence JSON](evidence/BE_AUTH_SETUP_01_2026-11-21.json).

## Kết quả

- Người dùng phê duyệt có điều kiện kế hoạch ngày 2026-11-21. Baseline tiếp tục HEAD 8c224e8 sạch; không commit/push hoặc đổi index.
- Một instance MySQL 8.0.40 mới: loopback 127.0.0.1, port 61458, UUID/datadir/cổng khác main, datadir mới không chồng lấn. Target database/account chưa tồn tại trước setup.
- Setup nạp 16 bảng DDL/seed hiện hữu không sửa và 2 bảng guard/run. Runtime SHOW GRANTS xác minh chỉ INSERT/SELECT/UPDATE trong schema test, không global/admin/GRANT OPTION.
- **10/10 scenario đạt**, Node 11/11 gồm test cha, 0 fail/skip. Register/login, HS256/900 giây/claims, me, RBAC và logout stateless đều có bằng chứng thật. Hai diagnostic thiếu config/ECONNREFUSED được nêu riêng, không báo outage MySQL thật.
- Backend unit/safety **178/178 trước và sau**; guard targeted 3/3. Syntax/import/export/casing/cycles: 78 file, 201 cạnh import, 265 bindings, không lỗi/vòng.
- Main chỉ SELECT; identity và metadata/count hashes trước/sau khớp. 97/97 file Frontend, 59/59 Backend/src, 6/6 SQL, 4/4 env/example khớp SHA-256 baseline.

## Cleanup

Đúng 2 fixture reader và reader+librarian, không admin hoặc đổi role permissions. Sau suite, runner SELECT xác nhận 2/2 inactive, tổng 2 user và 2 login events; 1 run passed, 10 scenario passed.

HTTP/pools đóng, instance test đã dừng. Kiểm OS: PID 53212 không còn, port 61458 không listen. Không DELETE/DROP/TRUNCATE/reset. Datadir/result giữ tại %TEMP%/libriflow-integration-BOn3tG để audit theo kế hoạch, không đưa data/hash vào repo. Không có credential bền hoặc Backend demo được bàn giao.

## File thay đổi trong lần tiếp tục

- Backend/integration/instance-isolee.mjs: guard identity/path/bind loopback, đọc quyền runtime thực tế, SELECT xác minh scenario/fixture cleanup và ghi evidence; không đổi auth runtime hoặc suite 10 scenario.
- docs/backend-auth-setup/{BE_AUTH_SETUP_01_ENVIRONMENT,BE_AUTH_SETUP_01_TEST_DATABASE,BE_AUTH_SETUP_01_TEST_ACCOUNTS,BE_AUTH_SETUP_01_AUTH_INTEGRATION,BE_AUTH_SETUP_01_TEST_REPORT,BE_AUTH_SETUP_01_HANDOFF}.md: cập nhật kết quả thực tế.
- Thêm docs/backend-auth-setup/evidence/BE_AUTH_SETUP_01_2026-11-21.json, chỉ dữ liệu đã lược bỏ đường dẫn riêng và không credential.
- Backend/README.md và docs/{PROJECT_CONTEXT,DATABASE,DECISIONS,TASKS,HANDOFF}.md: cập nhật trạng thái/hướng bàn giao.

Không sửa Frontend, Backend/src, API contract, schema/seed nguồn, env, package/lock hoặc tests/suite hiện hữu. Không stage/reset/unstage/commit/push. [Session policy](BE_AUTH_SETUP_01_SESSION_POLICY.md) memory-only theo mục 14 vẫn giữ nguyên, chưa triển khai Frontend.

Kiểm cuối: 13 file hiện hữu sửa, 1 evidence JSON mới, không xóa; đúng whitelist. 143 local links tại 13 docs, UTF-8/whitespace và git diff --check đạt; HEAD/index giữ nguyên. Không thấy mẫu JWT đầy đủ/bcrypt hash/private key trong file thay đổi/evidence/mysql.log, không coi scan theo mẫu là chứng nhận bảo mật toàn diện.

## Điều kiện bắt đầu FE-06 và giới hạn

**Đủ bằng chứng Backend auth để bắt đầu xây dựng FE-06 sau khi người dùng nghiệm thu.** Chưa cung cấp Backend dev lâu dài/credential cho browser; để chạy tích hợp FE-06 cần target dev riêng và cấu hình JWT/account/vòng đời riêng. Không tự sửa main để đáp ứng việc này.

- P0: không phát hiện P0 mới trong các kiểm tra đã chạy; không thay cho pentest.
- P1 vận hành: chưa có môi trường dev auth lâu dài; main JWT/account vẫn không được dùng để thử. Không còn blocker cho kết luận run E2E test đã duyệt.
- P2: browser/CORS enforcement, actual MySQL outage, TLS/proxy, tải/concurrency và production hardening chưa kiểm.
- P3: datadir test được giữ; quản lý vòng đời/xóa nếu cần phải theo phạm vi được duyệt, không tự reset.

Lịch sử chuẩn bị 2026-11-20 ở [TASKS](../TASKS.md). Tài liệu liên quan: [environment](BE_AUTH_SETUP_01_ENVIRONMENT.md), [database](BE_AUTH_SETUP_01_TEST_DATABASE.md), [accounts](BE_AUTH_SETUP_01_TEST_ACCOUNTS.md), [integration](BE_AUTH_SETUP_01_AUTH_INTEGRATION.md). Dừng chờ nghiệm thu; không tự chạy thêm hoặc triển khai FE-06.
