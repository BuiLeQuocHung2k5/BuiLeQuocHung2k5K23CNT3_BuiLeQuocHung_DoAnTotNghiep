# BE-AUTH-SETUP-01 — Test database

Xác minh **2026-11-21**. Người dùng đã phê duyệt có điều kiện tạo đúng một instance test mới, tối đa hai fixture, chạy 10 scenario rồi cleanup. **Đã thực hiện thành công đúng kế hoạch**, không mở rộng phạm vi. [Kết quả](BE_AUTH_SETUP_01_TEST_REPORT.md), [evidence](evidence/BE_AUTH_SETUP_01_2026-11-21.json).

## Kế hoạch được duyệt và trạng thái thực tế

| Thành phần | Phạm vi và bằng chứng |
| --- | --- |
| Instance | Một mysqld 8.0.40 mới, --no-defaults, không my.ini/Windows service, bind 127.0.0.1 được SELECT xác nhận. |
| Cổng/datadir | Port 61458; datadir mới %TEMP%/libriflow-integration-BOn3tG/data. Cổng/UUID/datadir khác main, không chồng lấn đường dẫn. |
| Target mới | Trước DDL xác minh libriflow_integration_test và account libriflow_it@127.0.0.1 chưa tồn tại trên instance mới. |
| Bootstrap | Chỉ root của instance mới; sau identity/absence checks đặt password CSPRNG trong RAM. Không sửa account hoặc quyền main. |
| SQL account | Setup SELECT/INSERT/UPDATE/CREATE/REFERENCES/INDEX trong đúng schema test. REVOKE CREATE/REFERENCES/INDEX rồi SHOW GRANTS xác minh runtime chỉ INSERT/SELECT/UPDATE, không global/admin/GRANT OPTION. |
| DDL/seed | Nạp 16 bảng từ source không sửa, seed RBAC hiện hữu và 2 bảng guard/run vào target mới/trống. Không ALTER schema ứng dụng đã có hoặc seed main. |
| Fixture | Đúng hai account reader và reader+librarian, tạo qua register API thật. Không admin hoặc sửa VaiTro_QuyenHan. |
| Cleanup | Cả 2 fixture inactive, HTTP/pools đóng, instance riêng đã dừng. OS xác nhận PID 53212 không còn và port 61458 không listen. Giữ datadir/result, không DROP/TRUNCATE/DELETE/reset. |

ALTER USER bootstrap, CREATE DATABASE/USER, GRANT và REVOKE chỉ chạy trên connection mới đã xác minh UUID/datadir/cổng; không dùng pool main để ghi. Cú pháp tham chiếu: [MySQL ALTER USER](https://dev.mysql.com/doc/refman/8.0/en/alter-user.html), [MySQL REVOKE](https://dev.mysql.com/doc/refman/8.0/en/revoke.html). Credential truyền bằng mysql2 query parameters, không qua shell arguments. General/slow/raw SQL logs và binlog tắt ở nhánh auth.

## Guard đã thực thi

- [Plan](../../Backend/integration/ke-hoach-xac-thuc.mjs) và runner đọc main identity/metadata/counts; không công bố identity riêng hoặc dùng main làm test.
- [Guard](../../Backend/integration/an-toan.mjs) yêu cầu đủ TEST_DB_*, allowlist tên test và hai UUID khác nhau; từ chối global/admin/GRANT OPTION/quyền ngoài allowlist.
- [Setup](../../Backend/integration/setup.mjs) chỉ nạp schema vào target trống có xác nhận đúng tên. Source bỏ CREATE DATABASE/USE trong bộ nhớ, không sửa file SQL.
- Mỗi connection/query/transaction kiểm DATABASE()/UUID. Runtime yêu cầu marker/version/fingerprint DDL+seed, chỉ cho SELECT/INSERT/UPDATE, cấm DDL/cross-schema/multiple statements/DELETE.
- Runner đối chiếu main identity và metadata/count hashes trước/sau, xác minh manifest 10 scenario passed và cleanup fixture trước shutdown. Không tính count hash là checksum mọi field.

## Vòng đời và phạm vi tiếp theo

Instance đã dừng; không có connection/credential dev bền được bàn giao. Datadir chứa hash/data test được giữ cục bộ theo kế hoạch và không phải môi trường production.

Phê duyệt ngày 2026-11-21 đã được sử dụng cho lần chạy này. Không tự chạy thêm, mở rộng fixture, tạo Backend dev lâu dài hoặc cấp account ở main. Nếu kế hoạch tiếp theo rộng hơn phạm vi, phải xin phê duyệt mới; hiện dừng chờ nghiệm thu.
