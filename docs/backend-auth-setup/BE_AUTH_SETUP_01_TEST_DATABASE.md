# BE-AUTH-SETUP-01 — Test database và kế hoạch xin phê duyệt

Xác minh **2026-11-20**. **Chưa thực hiện provision, DDL hoặc cấp quyền.** Main chỉ SELECT; chưa có target test mới được xác minh để ghi. Tái dùng [instance runner](../../Backend/integration/instance-isolee.mjs), [setup](../../Backend/integration/setup.mjs), [guard](../../Backend/integration/an-toan.mjs); schema nguồn và runtime auth giữ nguyên.

## Phạm vi đề nghị phê duyệt

| Thành phần | Phạm vi chính xác |
| --- | --- |
| Instance | Một mysqld mới; datadir mới dưới %TEMP%/libriflow-integration-<random>/data. Không my.ini hoặc Windows service; chỉ 127.0.0.1, cổng OS cấp khác main. |
| Identity | Trước DDL: UUID/datadir/cổng khác main, MySQL 8.0; target database và test account phải chưa tồn tại. Không fallback sang connection chính. |
| Database | Tạo libriflow_integration_test trên instance mới. Không tạo/đổi/xóa database trên instance đang dùng. |
| Bootstrap | Chỉ root của instance mới. Sau kiểm tra identity và target chưa tồn tại, đặt password CSPRNG trong RAM. |
| SQL account | Tạo libriflow_it@127.0.0.1 với password CSPRNG. Setup được SELECT/INSERT/UPDATE/CREATE/REFERENCES/INDEX trong đúng schema test. Sau setup thu hồi CREATE/REFERENCES/INDEX; runtime còn SELECT/INSERT/UPDATE, không global privilege hoặc GRANT OPTION. |
| Schema/seed | Nạp 16 bảng từ DDL không sửa và seed RBAC hiện hữu vào target mới/trống, thêm 2 bảng guard/run. Không ALTER schema ứng dụng đã tồn tại hoặc seed main. |
| Dữ liệu | Hai fixture reader và reader+librarian; chỉ auth, user-role, login events, manifest và status fixture. Không sửa VaiTro_QuyenHan hoặc tạo catalog/mượn/trả/phạt/dự báo. |
| Cleanup | Deactivate đúng fixture thuộc run, đóng HTTP/pools, SHUTDOWN instance đã pin; chỉ xử lý PID runner tạo. Giữ datadir/result để kiểm tra. Không DROP/TRUNCATE/DELETE hoặc reset database. |

Các thao tác cấp instance cần duyệt gồm ALTER USER bootstrap, CREATE DATABASE/USER, GRANT và REVOKE trên **instance mới**. Cú pháp tham chiếu: [MySQL ALTER USER](https://dev.mysql.com/doc/refman/8.0/en/alter-user.html), [MySQL REVOKE](https://dev.mysql.com/doc/refman/8.0/en/revoke.html). Code dùng mysql2 query parameters, không đưa credential vào shell arguments. Nhánh auth tắt general/slow/raw SQL logs và binlog; không xuất raw SQL error hoặc secret.

## Guard trước và trong run

- [Plan chỉ đọc](../../Backend/integration/ke-hoach-xac-thuc.mjs) xác minh main identity và snapshot metadata/counts của 16 bảng; không công bố identity riêng. Main hiện có 0 user, không coi main là test.
- Allowlist hiện hữu: libriflow_integration_test/libriflow_ci_test; TEST_DB_* phải đầy đủ và pin hai UUID khác nhau. Account chỉ được quyền schema test; guard từ chối global/admin/GRANT OPTION hoặc quyền ngoài allowlist.
- Setup chỉ chấp nhận target trống và xác nhận đúng tên. Runtime yêu cầu marker/version/fingerprint DDL + seed. Setup hiện hữu bỏ CREATE DATABASE/USE khi load source trong bộ nhớ.
- Mỗi connection/query/transaction kiểm DATABASE()/UUID. SQL runtime chỉ SELECT/INSERT/UPDATE; cấm DDL, cross-schema, multiple statements và DELETE. Các rail bổ sung không thay least privilege hoặc identity pins.
- Sau run đối chiếu main identity và metadata/count hashes trước/sau. Count hash không chứng minh mọi giá trị dữ liệu không đổi. Nếu lệch hoặc chưa xác minh cleanup, không báo PASS.

## Trạng thái và điều kiện tiếp tục

Plan read-only và test từ chối cờ thiếu đã đạt. **Chưa start instance, ALTER/CREATE/GRANT/REVOKE, nạp schema/seed hoặc tạo fixture.** Guard của target mới hiện được kiểm ở source/unit, chưa có bằng chứng thực thi MySQL mới.

Mục 6 yêu cầu: “Nếu phải thực hiện thao tác tạo database hoặc thay đổi quyền truy cập ở cấp instance, dừng bước đó và báo cáo kế hoạch cụ thể để người dùng phê duyệt.”

Sau phê duyệt mới chạy lệnh trong [environment](BE_AUTH_SETUP_01_ENVIRONMENT.md), cập nhật bằng chứng thực tế. Nếu lỗi, phân biệt môi trường/helper với auth runtime; không sửa nghiệp vụ hoặc nới assertion để ép pass.
