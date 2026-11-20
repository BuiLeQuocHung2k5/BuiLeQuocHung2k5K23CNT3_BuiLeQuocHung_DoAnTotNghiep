# Integration test MySQL độc lập — TASK-013

## Kết quả mới nhất — TASK-018, 2026-11-07

**ĐÃ CHẠY MySQL thật 8.0.40: 21/21 scenario PASS**, giữ 15 cũ và thêm 6, Node báo 22 test gồm cha; không fail/skip. Run cuối 09:38:44–09:38:57 UTC; instance riêng đã dừng. Marker/fingerprint và SELECT sau commit/rollback đã được kiểm tra; metadata/count 16 bảng chính trước/sau không đổi. Xem [báo cáo bằng chứng](backend-final-report.md). Các đoạn “chưa chạy” dưới đây là lịch sử TASK-013, không còn là kết luận hiện tại.

### Chạy trên instance dùng một lần bằng MySQL đã cài

```powershell
cd Backend
node integration/instance-isolee.mjs
```

Trên máy đã xác minh có MySQL Server 8.0, runner mặc định dùng binary `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe`; có thể chỉ định binary bằng `MYSQLD_TEST_BINARY` (đường dẫn tuyệt đối). Không cần cài thêm thư viện hoặc sửa `.env`. Cần kết nối chính đọc được metadata để đối chiếu UUID/datadir/cổng; thiếu bằng chứng hoặc không khởi tạo được instance riêng thì dừng, không fallback test ghi trên chính.

Runner tạo thư mục OS temp ngẫu nhiên/datadir rỗng, `--no-defaults` bỏ my.ini, không đăng ký service, cổng loopback riêng và UUID khác chính; trên Windows dùng `--no-monitor` để giữ đúng tiến trình được quản lý. Root bootstrap mật khẩu rỗng chỉ tồn tại ở instance mới khởi tạo và bind loopback; test dùng tài khoản riêng, password ngẫu nhiên chỉ trong RAM, quyền SELECT/INSERT/UPDATE/CREATE/REFERENCES/INDEX trên schema test. Không dùng credential quản trị chính cho test. Không sao chép dữ liệu chính.

Script truyền TEST_DB_* và UUID pin đã xác minh cho setup/run qua environment riêng; guard vẫn kiểm tra account, DATABASE(), marker/version/fingerprint trước các thao tác. Chỉ instance mới nhận CREATE DATABASE/USER/GRANT/setup/test; pool chính chỉ SELECT. Cuối run đóng pool và SHUTDOWN đúng instance mới sau kiểm tra identity, xác minh tiến trình đã dừng. Giữ data/mysql.log/result.json dưới `%TEMP%/libriflow-integration-*`, không DROP/TRUNCATE/tự xóa fixture hoặc thư mục; không ghi credential vào kết quả. Runner không cung cấp môi trường demo tồn tại lâu dài hoặc sửa environment shell của người dùng.

Sáu scenario mới: JWT giả/quyền catalog; event login/mượn/trả và GET không ghi; thống kê dữ liệu không rỗng ngày/tuần/tháng đối chiếu SELECT; quá hạn với fixture của run rồi phục hồi thời điểm; phạt thiếu cấu hình không sinh tiền; forecast thiếu coverage/generate đóng/không lưu. Probe rollback cũ được bổ sung usage event trong cùng transaction và SELECT xác nhận rollback cả event. Mã FK 1216/1452 đều là thiếu hàng cha; assertion chỉ chấp nhận đúng hai mã tương đương, vẫn kiểm tra dữ liệu không lưu.

**Chưa chạy thật:** tạo phạt/thanh toán thành công/chống phạt trùng vì seed không có mức phạt, không tự đặt mức tiền; forecast ready hoặc MAE thực vì chưa có audit coverage. PUT/DELETE thành công của catalog và các lịch chạy tải lớn vẫn mới unit/mock hoặc chưa kiểm thử. Không suy PASS 21 scenario thành chứng minh mọi endpoint/nhánh đã end-to-end.

## Lịch sử thiết lập TASK-013 và quy trình cấu hình thủ công

Xác minh 2026-11-06: unit/safety **98/98 đạt**. Integration MySQL thật **CHƯA CHẠY** vì chưa có TEST_DB_* được cấu hình. `npm.cmd run test:integration` dừng tại MISSING_TEST_DB_NAME với exit code khác 0, trước khi tạo kết nối/ghi. Không coi việc từ chối chạy là integration pass hoặc skip thành công.

## Phân tách

- `npm.cmd test`: 89 test cũ và 9 test safety mới; không tự tìm/chạy file integration/kich-ban.mjs.
- `npm.cmd run test:integration`: preflight read-only, rồi chạy riêng 15 scenario với node:test/MySQL thật; không mock DB/model/JWT hoặc thay kết quả SQL. Mỗi connection/query/commit kiểm tra DATABASE()/server UUID trước thao tác. Một số endpoint DELETE dự kiến bị nghiệp vụ chặn; SQL DELETE thật bị guard cấm.
- `npm.cmd run test:integration:setup`: chỉ chuẩn bị schema/seed trong **database test đã tồn tại và hoàn toàn trống**, không CREATE/DROP DATABASE. Không chạy tự động khi npm test/start/integration.
- `src/app-factory.js` không import co-so-du-lieu.js/dotenv, bắt buộc database dependency. Integration chỉ import factory này với guarded test pool; toàn bộ model và health dùng test pool. `src/app.js` vẫn là wrapper app bình thường, giữ taoUngDung/default export để tương thích.

## Chuẩn bị bởi người vận hành — không thực hiện trên server chính

Chuẩn bị một MySQL 8.0 instance độc lập (ví dụ cổng loopback 3307), có server UUID khác instance chính. Không tự tạo database test trên MySQL hiện chứa libriflow. Task này chưa tạo instance/database/user hoặc chạy setup.

Trên instance test độc lập, người vận hành được phép tạo database và tài khoản riêng. Ví dụ SQL **chỉ là hướng dẫn**, mật khẩu phải tự đặt riêng qua kênh quản trị an toàn, không dùng nguyên placeholder:

```sql
CREATE DATABASE libriflow_integration_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'libriflow_it'@'localhost' IDENTIFIED BY '<private-test-password>';
GRANT SELECT, INSERT, UPDATE, CREATE, INDEX, REFERENCES
ON libriflow_integration_test.* TO 'libriflow_it'@'localhost';
```

Không dùng root, quyền global, ALL PRIVILEGES, GRANT OPTION, MySQL role hoặc quyền lên database khác; preflight SHOW GRANTS sẽ từ chối. Không cần DELETE/DROP/TRUNCATE/ALTER. Nếu kết nối qua container/network, cấu hình account host phù hợp riêng, không nới quyền schema hoặc mở public MySQL/API.

Lấy `SELECT @@server_uuid` bằng connection quản trị read-only trên từng instance để xác nhận hai định danh. Giá trị pin main phải được đối chiếu đúng instance chính bởi người vận hành; không được điền UUID bất kỳ để vượt guard. Guard không tự kết nối instance chính để khám phá UUID và không dùng NODE_ENV làm bằng chứng an toàn.

## Biến môi trường bắt buộc

Không sửa `.env` ứng dụng. Không có fallback sang DB_HOST/DB_USER/DB_PASSWORD. Guard chỉ đọc tên DB chính từ cấu hình/env để chống trùng, không log giá trị cấu hình hay secret.

| Biến | Yêu cầu |
| --- | --- |
| TEST_DB_NAME | Chỉ `libriflow_integration_test` hoặc `libriflow_ci_test`; khác libriflow và các DB_NAME chính từ env/.env |
| TEST_DB_HOST, TEST_DB_PORT | Đích test chỉ định tường minh, không mặc định |
| TEST_DB_USER, TEST_DB_PASSWORD | Tài khoản test-schema-only, password không rỗng |
| TEST_DB_SERVER_UUID | UUID đã xác nhận của instance test |
| TEST_DB_MAIN_SERVER_UUID | UUID đã xác nhận của instance chính, bắt buộc khác UUID test |
| TEST_DB_SETUP_CONFIRM | Chỉ dùng setup; phải bằng chính TEST_DB_NAME |

Ví dụ PowerShell (UUID phải thay bằng giá trị đã kiểm tra; các placeholder dưới đây cố ý không vượt được guard):

```powershell
cd Backend
$env:TEST_DB_NAME = 'libriflow_integration_test'
$env:TEST_DB_HOST = '127.0.0.1'
$env:TEST_DB_PORT = '3307'
$testCredential = Get-Credential -Message 'Tài khoản MySQL chỉ có quyền trên database test'
$env:TEST_DB_USER = $testCredential.UserName
$env:TEST_DB_PASSWORD = $testCredential.GetNetworkCredential().Password
$env:TEST_DB_SERVER_UUID = '<verified-test-server-uuid>'
$env:TEST_DB_MAIN_SERVER_UUID = '<verified-main-server-uuid>'
$env:TEST_DB_SETUP_CONFIRM = $env:TEST_DB_NAME
npm.cmd run test:integration:setup
npm.cmd run test:integration
```

Không echo biến password, không export environment/token hoặc chia sẻ credential. Đóng shell sau kiểm thử hoặc xóa các biến bằng Remove-Item Env:TEST_DB_PASSWORD, Env:TEST_DB_USER và các TEST_DB_* đã đặt khi không cần. JWT key và password fixture được tạo ngẫu nhiên trong RAM, không lấy JWT_SECRET thật và không log.

## Setup và guard

Setup kiểm tra tên/UUID thực tế, SHOW GRANTS và 0 bảng/view trong schema đích. Nó đọc schema.sql/seed gốc, phân tách SQL có nhận diện quote/comment và **loại bỏ CREATE DATABASE/USE trong bộ nhớ**. Chỉ 16 CREATE TABLE và 5 INSERT IGNORE seed được chấp nhận. Không sửa file SQL gốc, không chạy các câu lệnh có thể chuyển về libriflow.

Sau setup có 16 bảng ứng dụng và hai bảng điều khiển chỉ trong DB test:

- `__libriflow_integration_guard`: tên database, UUID, version và SHA-256 fingerprint của source SQL.
- `__libriflow_integration_runs`: run ID/status/thời gian và manifest JSON chứa ID fixture, không mật khẩu/token/hash.

Integration bắt buộc marker khớp DB/UUID/fingerprint trước khi ghi; source SQL đổi hoặc line ending đổi thì từ chối, không tự migrate/reseed. Setup gặp lỗi có thể để lại DDL/seed test dở; không tự rollback DDL/xóa bảng/chạy lại trên database có dữ liệu. Người vận hành phải rà soát riêng và chuẩn bị schema test trống phù hợp. Không dùng setup để reset database.

Runtime pool kiểm tra identity trên mỗi connection và trước SQL/commit; cấm USE, DDL, DELETE, câu lệnh nhiều statement và table đích có database qualifier. Các rail này không phải SQL sandbox hoàn chỉnh: còn bắt buộc account least privilege, UUID pin đã được xác nhận và marker từ setup. Không tự mở rộng allowlist bằng biến môi trường.

## 15 scenario đã viết — chưa chạy với MySQL thật

1. Register/login ba tài khoản fixture; SELECT kiểm tra hash; sai password/email trùng.
2. Health, tạo danh mục/sách/bản sao qua HTTP/JWT/RBAC thật.
3. Barcode/ISBN/category-name UNIQUE và FK sách sai; SELECT xác nhận không lưu bản ghi lỗi.
4. Mượn một copy; SELECT header/detail/copy sau commit.
5. Mượn nhiều copy; SELECT mọi trạng thái.
6. Trả một phần damaged → maintenance, header partially_returned.
7. Trả toàn bộ còn lại, giữ nguyên lần trả trước; chặn trả lặp.
8. Không mượn copy borrowed; COUNT header/detail trước-sau không đổi.
9. Batch có copy không tồn tại; SELECT kiểm tra không có phiếu/detail mới, copy tốt vẫn available.
10. FK lỗi thật sau khi INSERT header trong transaction helper dùng chung; SELECT chứng minh header rollback. Đây là probe helper/tables thật, không giả định API có ghi trước validation.
11. Hai HTTP request thật cạnh tranh cùng copy, kỳ vọng đúng 201 + 409, COUNT loan mở = 1.
12. Batch return có copy ngoài phiếu; SELECT trạng thái không đổi.
13. Reader chỉ xem own qua JWT/RBAC thật, không đọc/ghi hộ người khác.
14. Chặn xóa category có sách/copy có lịch sử; SELECT quan hệ/lịch sử còn nguyên.
15. SELECT tất cả copy thuộc run, không copy nào có hai loan mở và không tự tạo tiền phạt.

Fixture có prefix ngẫu nhiên theo run; SELECT xác nhận namespace/ID trước khi dùng cho thao tác tiếp theo. Chỉ tài khoản fixture vừa đăng ký mới được gán role librarian trong DB test, không tạo admin. Không sửa fixture của run khác, không truy vấn hash tài khoản ngoài run. Không tự cleanup: không DELETE/TRUNCATE/DROP. Dữ liệu của mọi run được giữ để điều tra, kể cả lỗi; prefix được suy ra từ `it_` + 16 ký tự đầu run_id. Manifest không thay thế backup; khi run hỏng giữa chừng có thể cần tra prefix để tìm fixture chưa ghi kịp manifest.

## Kết quả và giới hạn hiện tại

- Unit/safety: **98/98 đạt**. Chứng minh cơ chế cấu hình/allowlist/UUID/grants/SQL rail/pure factory bằng unit test; đây không phải kết quả integration thật.
- Integration: **CHƯA CHẠY**, thiếu TEST_DB_*; lệnh từ chối trước kết nối, không tạo database/setup/fixture và không sửa MySQL chính.
- Chưa xác minh runtime SQL ghi/khóa/deadlock/FK/UNIQUE/concurrency của 15 scenario; chưa có lỗi nghiệp vụ mới được chứng minh hoặc sửa bằng kết quả MySQL thật. Refactor chỉ loại bỏ khả năng app factory/health dùng nhầm pool mặc định trong test.
- Bộ test hiện không kiểm thử DELETE thành công, crash recovery, workload lớn, deadlock retry hoặc timeout/cancel giữa transaction. Không chạy đồng thời nhiều suite trên cùng target; trong một suite chỉ case cạnh tranh chủ động mới gửi hai request đồng thời. Giữ loopback, không public API.
