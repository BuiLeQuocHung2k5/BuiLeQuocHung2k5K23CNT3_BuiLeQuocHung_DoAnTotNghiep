# BE-AUTH-SETUP-01 — Handoff

Xác minh **2026-11-20**. **Đạt phần chuẩn bị; chưa đạt nghiệm thu Auth MySQL end-to-end.** Đang chờ phê duyệt tạo instance/database/account theo mục 6. Chưa sửa Frontend hoặc triển khai FE-06.

## Phần đã hoàn thành

- Đối chiếu source và BE-AUTH-PREP. Baseline HEAD 9bd5f45 sạch, Backend 175/175 test đạt.
- Thêm [plan chỉ đọc](../../Backend/integration/ke-hoach-xac-thuc.mjs), [launcher](../../Backend/integration/chay-xac-thuc.mjs), [suite 10 scenario](../../Backend/integration/xac-thuc.mjs), [3 guard tests](../../Backend/test/moi-truong-xac-thuc.test.js), [env example](../../Backend/integration/.env.example).
- Mở rộng instance-isolee.mjs bằng --auth-only và --allow-create-isolated; thiếu một trong hai cờ sẽ từ chối trước startup. Chuẩn bị verify target mới, password bootstrap CSPRNG, runtime ba quyền và cleanup. Chưa thực thi nhánh provision.
- Sau chuẩn bị, 178/178 unit/safety và targeted auth 18/18 đạt. Syntax/import/export/casing/cycles: 78 file, 201 cạnh import, 264 import bindings, không lỗi/vòng.
- Plan SELECT xác minh main MySQL 8.0.40/users = 0, binary 8.0 sẵn có; metadata/count hashes khớp. TEST_DB_* thiếu; launcher từ chối trước kết nối/ghi.

## Tài liệu

[Environment](BE_AUTH_SETUP_01_ENVIRONMENT.md), [test database/kế hoạch duyệt](BE_AUTH_SETUP_01_TEST_DATABASE.md), [accounts](BE_AUTH_SETUP_01_TEST_ACCOUNTS.md), [Auth integration](BE_AUTH_SETUP_01_AUTH_INTEGRATION.md), [session policy](BE_AUTH_SETUP_01_SESSION_POLICY.md), [test report](BE_AUTH_SETUP_01_TEST_REPORT.md).

Mục 14 đã chỉ định memory-only, không localStorage/sessionStorage, reload login lại, không refresh. Chỉ hoàn thiện tài liệu, chưa triển khai Frontend. Giữ HS256, 900 giây, claims, password hashing, middleware, permissions và API contract.

## Phạm vi xin phê duyệt

Tạo một MySQL instance mới dưới OS temp, chỉ loopback, khác main về cổng/UUID/datadir. Tạo libriflow_integration_test và SQL account riêng; đặt bootstrap password ngẫu nhiên; nạp 16 bảng từ DDL/seed không sửa và 2 bảng guard. Setup được sáu quyền, sau đó thu hẹp runtime còn SELECT/INSERT/UPDATE.

Tạo hai fixture reader và reader+librarian qua API thật, không tạo admin hoặc sửa role permissions. Chạy 10 scenario; deactivate fixture, đóng HTTP/pools và dừng đúng instance mới. Giữ datadir/result để kiểm tra; không DROP/TRUNCATE/DELETE hoặc reset database.

Chỉ sau khi được phê duyệt mới chạy từ Backend:

~~~powershell
node integration/instance-isolee.mjs --auth-only --allow-create-isolated
~~~

Mục 6 yêu cầu dừng trước tạo database/thay quyền cấp instance và báo kế hoạch để người dùng duyệt; xem [kế hoạch chi tiết](BE_AUTH_SETUP_01_TEST_DATABASE.md). Chưa dùng cờ opt-in hoặc chạy provision. Lệnh legacy không tham số không được dùng để né gate.

## Rủi ro, giới hạn và bước tiếp theo

- P0: chưa xác định vấn đề P0 mới trong phạm vi khảo sát này; không thay cho pentest.
- P1: chưa duyệt provision, TEST_DB_* chưa có; chưa có MySQL login mới hoặc môi trường auth demo. JWT main vẫn thiếu/account main = 0; không sửa main để thử.
- P2: nhánh mới chưa thực thi trên instance thật. Runner kiểm thử tạm không phải Backend dev lâu dài; browser/TLS/production hardening còn task riêng.
- P3: vận hành đúng lệnh auth và guard; tài liệu cũ là snapshot, session policy theo chỉ dẫn mới.

Tạo 7 docs setup và 5 file helper/test/example đã liên kết ở trên. Sửa Backend/integration/instance-isolee.mjs, Backend/README.md và docs/{PROJECT_CONTEXT,DATABASE,DECISIONS,TASKS,HANDOFF}.md. Không sửa runtime auth, SQL/schema nguồn, env thật, package/lock, Frontend hoặc tài liệu task trước; không stage/reset/unstage/commit/push.

Kiểm cuối: 97/97 file Frontend khớp blob HEAD qua Git filters; 100 file Backend ngoài README/instance runner không có diff. Chỉ 7 file cũ sửa và 12 file mới đúng phạm vi, không xóa; HEAD/index giữ nguyên. 132 local links tại 13 docs, UTF-8/whitespace và git diff --check đạt. Lượt targeted cuối 21/21 (18 auth + 3 guard), toàn bộ Backend 178/178.

Sau phê duyệt, chạy MySQL thật rồi cập nhật status/claims/grants/fixtures/events, main before/after và cleanup. Hiện chưa đủ bằng chứng nghiệm thu Authentication end-to-end cho FE-06; không tự mở FE-06.
