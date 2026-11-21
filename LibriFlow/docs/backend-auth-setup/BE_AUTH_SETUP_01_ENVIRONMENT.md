# BE-AUTH-SETUP-01 — Environment

Xác minh **2026-11-21** sau phê duyệt có điều kiện. Node 24.20.0/npm 11.19.0; main và test MySQL 8.0.40. Baseline tiếp tục HEAD 8c224e8 sạch. **Auth integration đã đạt; instance test đã dừng.** [Test report](BE_AUTH_SETUP_01_TEST_REPORT.md), [database lifecycle](BE_AUTH_SETUP_01_TEST_DATABASE.md).

## Biến và cơ chế thực tế

| Biến/cơ chế | Nguồn và cách dùng |
| --- | --- |
| PORT | Backend/src/server.js, mặc định 3000 và loopback. Suite dùng cổng HTTP 0 tạm. |
| DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD | [Config](../../Backend/src/config/co-so-du-lieu.js) đọc Backend/.env/process. NODE_ENV không cách ly database. Runner chỉ dùng pool main cho SELECT. |
| JWT_SECRET | [Utility](../../Backend/src/utils/jwt.js) đọc process mặc định. Không sửa config chính; suite dùng getSecret CSPRNG riêng. |
| TEST_DB_NAME, TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD | Parent cấp riêng cho setup/auth child trên instance mới đã pin; không fallback về DB_*. Không lưu credential vào file. |
| TEST_DB_SERVER_UUID, TEST_DB_MAIN_SERVER_UUID | Guard yêu cầu đủ pin và hai UUID khác nhau; không chỉ so tên database. |
| TEST_DB_SETUP_CONFIRM | Setup cần đúng tên target và database trống. |
| MYSQLD_TEST_BINARY | Binary 8.0 đã có hoặc đường dẫn mặc định đã kiểm; không cài/nâng cấp phần mềm. |
| getSecret | Seam hiện hữu cho suite: 48 byte CSPRNG trong RAM, cùng utility sign/verify thật, không production secret. |

[Integration env example](../../Backend/integration/.env.example) chỉ là mẫu, không tự load hoặc ghi đè Backend/.env. Bốn file env/example hiện hữu khớp SHA-256 baseline. Root .gitignore giữ .env/.env.* ngoài Git và cho phép .env.example.

Trước chạy không có TEST_DB_* lâu dài; parent cấp trong env child rồi kết thúc. Sau chạy không có môi trường auth test đang hoạt động hoặc credential bền được bàn giao. Không tự đặt DB_* hay JWT_SECRET cho server main.

## Lệnh đã chạy theo phê duyệt

Từ Backend:

~~~powershell
node integration/ke-hoach-xac-thuc.mjs
npm.cmd test
node --test test/moi-truong-xac-thuc.test.js
node integration/instance-isolee.mjs --auth-only --allow-create-isolated
npm.cmd test
~~~

Một run: setup PASS, 10 scenario PASS, cleanup verified, main identity/snapshot unchanged, process exit 0. MySQL chỉ bind loopback; UUID/datadir/cổng khác main. Runtime SHOW GRANTS chỉ INSERT/SELECT/UPDATE.

Lệnh auth cần cả hai cờ; thiếu một cờ dừng trước startup. Không dùng legacy full-suite để né gate hoặc tự chạy thêm sau nghiệm thu. Launcher không provision là node integration/chay-xac-thuc.mjs, chỉ dùng khi target hiện hữu đã qua đủ guard/config; hiện target đã dừng.

## Backend dev cho FE-06

npm start đọc DB_* và JWT_SECRET, không chuyển sang TEST_DB_* tự động. Runner dùng app factory/guard, không khởi động server main hoặc để lại Backend demo lâu dài.

Backend auth đã có bằng chứng E2E để bắt đầu xây dựng FE-06 sau nghiệm thu. Muốn chạy browser tích hợp cần target dev riêng đã xác minh, JWT secret mạnh riêng và account/vòng đời được chốt; không dùng main hoặc lấy credential từ logs. Đây là bước vận hành tiếp theo, chưa được triển khai trong lần kiểm chứng này.
