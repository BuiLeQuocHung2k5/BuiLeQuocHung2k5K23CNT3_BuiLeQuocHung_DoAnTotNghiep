# BE-AUTH-SETUP-01 — Environment

Xác minh **2026-11-20**, baseline HEAD 9bd5f45 sạch. Node 24.20.0/npm 11.19.0; MySQL chính 8.0.40, binary MySQL 8.0 có sẵn. Chỉ báo tên biến và trạng thái cấu hình, không xuất credential hoặc identity riêng của main.

**Đã hoàn tất phần chuẩn bị, chưa khởi tạo test instance.** Mục 6 của yêu cầu bắt buộc phê duyệt trước CREATE DATABASE hoặc thay quyền cấp instance. Xem [kế hoạch cụ thể](BE_AUTH_SETUP_01_TEST_DATABASE.md).

## Biến và cơ chế thực tế

| Biến/cơ chế | Nguồn và cách dùng |
| --- | --- |
| PORT | Backend/src/server.js, mặc định 3000 và bind loopback. Auth suite dùng cổng 0 tạm. |
| DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD | [Config](../../Backend/src/config/co-so-du-lieu.js) đọc Backend/.env và process. NODE_ENV không tự cách ly database. Pool chính trong runner chỉ dùng SELECT. |
| JWT_SECRET | [JWT utility](../../Backend/src/utils/jwt.js) mặc định đọc process. Hiện thiếu/chưa hợp lệ; không sửa env. |
| TEST_DB_NAME, TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD | [Guard](../../Backend/integration/an-toan.mjs) yêu cầu đầy đủ; hiện đều chưa có trong process. |
| TEST_DB_SERVER_UUID, TEST_DB_MAIN_SERVER_UUID | Guard bắt buộc pin hai UUID khác nhau. Không chỉ kiểm tên database. |
| TEST_DB_SETUP_CONFIRM | setup.mjs yêu cầu đúng tên target khi nạp schema vào database trống. |
| MYSQLD_TEST_BINARY | Runner/plan dùng binary đã có hoặc đường dẫn mặc định trong source. Không cài phần mềm. |
| getSecret của JWT utility | Seam hiện hữu: suite sinh 48 byte CSPRNG trong RAM rồi dùng utility sign/verify thật. Không lấy secret production. |

[Integration env example](../../Backend/integration/.env.example) chỉ là mẫu không bí mật, không tự load hoặc ghi đè Backend/.env. Không tạo/sửa file env thật. Root .gitignore đã ignore .env/.env.* và cho phép .env.example.

JWT test không hardcode, không ghi file/log/Git, không dùng lại production secret. Secret chỉ tồn tại trong process của suite. Nhánh auth-only loại DB_* và JWT_SECRET chính khỏi env child; guard vẫn đọc tên main trong Backend/.env để từ chối trỏ nhầm.

## Lệnh đã chạy an toàn

Từ Backend:

~~~powershell
node integration/ke-hoach-xac-thuc.mjs
npm.cmd test
~~~

Plan chỉ SELECT identity, metadata, counts và kiểm binary bằng --version; không tạo datadir hoặc khởi động mysqld. Kết quả: main identity được xác minh, users = 0, metadata/count hashes khớp giữa các lượt đọc. Chưa có MySQL auth success mới.

## Lệnh chờ phê duyệt

Chỉ sau khi người dùng phê duyệt kế hoạch:

~~~powershell
node integration/instance-isolee.mjs --auth-only --allow-create-isolated
~~~

Thiếu một trong hai cờ sẽ dừng trước startup. Cờ opt-in là xác nhận vận hành sau phê duyệt, không thay sự phê duyệt của người dùng. Không dùng lệnh legacy không tham số để né gate; lệnh đó có provision/full-suite riêng của TASK-018.

Nếu operator cung cấp target hiện hữu đã xác minh và đủ guard/config, launcher không provision là:

~~~powershell
node integration/chay-xac-thuc.mjs
~~~

Hiện launcher từ chối MISSING_TEST_DB_NAME trước kết nối/ghi. Auth suite dùng app factory với database đã guard; không import app.js/pool chính.

## Backend dev và giới hạn bàn giao

Lệnh npm start hiện hữu đọc DB_* và JWT_SECRET, không tự chuyển sang TEST_DB_*. Trước khi chạy dev auth cần cấu hình một target dev riêng đã xác minh và secret ngẫu nhiên qua môi trường riêng; không ghi đè Backend/.env hoặc dùng production/main để thử login có ghi usage event.

Runner này tạo bằng chứng kiểm thử tạm rồi đóng, chưa cung cấp Backend dev lâu dài hoặc credential cho browser FE-06. Việc chốt vòng đời và kênh bàn giao môi trường dev còn cần thực hiện riêng sau khi có môi trường được duyệt.
