# JWT và RBAC — kiểm thử bằng Postman

Xác minh: 2026-11-05. Nguồn: `src/{routes,controllers,services,models}/auth.*.js`, `src/middlewares/auth.js`, `src/utils/{jwt,auth-validation}.js` và schema/seed trong `sql/`.

## Cấu hình và phạm vi

Server chỉ bind `127.0.0.1`. Module chưa có refresh token, thu hồi JWT, xác minh email, quên mật khẩu hoặc giao diện cấp quyền. Không coi đây là cấu hình production hoàn chỉnh. Không mở tunnel/public API.

JWT_SECRET chỉ lấy từ biến môi trường server, không có giá trị mặc định. `.env.example` chỉ chứa tên biến và giá trị trống. Không đưa secret thật vào source, Git, ảnh chụp, Postman hoặc log.

Có thể tạo secret bằng bộ sinh ngẫu nhiên và gán thẳng vào biến môi trường của PowerShell, không in giá trị:

```powershell
cd Backend
$env:JWT_SECRET = node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
npm.cmd start
```

Đây là secret của phiên shell hiện tại; cần giữ ổn định trong nơi lưu bí mật riêng khi khởi động lại để token cũ tiếp tục được kiểm tra. Không tạo secret ngẫu nhiên mới trong mỗi request. Không dùng chuỗi dễ đoán dù đủ độ dài. Không đọc lại hoặc in biến môi trường để kiểm tra.

Nếu thiếu secret hoặc ngắn hơn 32 byte sau trim: login/register trả 503 `JWT_NOT_CONFIGURED`, trước khi đọc thông tin đăng nhập hoặc ghi tài khoản. Kiểm tra token cũng thất bại an toàn. Public GET sách và health vẫn hoạt động; request bảo vệ không có Bearer trả 401.

**Chỉ kiểm thử đăng ký và request ghi sách trên database thử nghiệm độc lập.** Task này không tạo database đó hoặc ghi dữ liệu vào database chính. Khi database thử nghiệm đã được chuẩn bị và xác minh, có thể chọn bằng `$env:DB_NAME = "libriflow_test"` trong shell trước khi khởi động. Không tự chạy script SQL cố định `libriflow` để tạo database thử nghiệm.

## Schema và ánh xạ RBAC

| Bảng | Vai trò trong code |
| --- | --- |
| NguoiDung | user_id BIGINT, name VARCHAR(100), email VARCHAR(150) UNIQUE, password VARCHAR(255) chứa hash; phone VARCHAR(20), avatar VARCHAR(255), status ENUM active/inactive/locked, timestamps |
| VaiTro | role_id, name UNIQUE, description, created_at |
| QuyenHan | permission_id, name UNIQUE, description |
| NguoiDung_VaiTro | PK ghép user_id/role_id, FK tới người dùng/vai trò |
| VaiTro_QuyenHan | PK ghép role_id/permission_id, FK tới vai trò/quyền |

Seed xác nhận `reader` có `book_view`; `librarian` có `book_create`/`book_update` nhưng không `book_delete`; `admin` được gán các quyền trong bảng QuyenHan. Các quyền này và reader/book mapping cũng đã kiểm tra bằng SELECT trên database hiện tại, không đọc tài khoản người dùng.

Đăng ký chỉ tìm role tên chính xác `reader`, không tạo role, không tự cấp admin. Nếu role reader chưa có, trả 503 `REGISTRATION_NOT_CONFIGURED`; transaction rollback, không để tài khoản thiếu role. Không tự chạy seed. Vai trò và quyền áp dụng tại runtime theo dữ liệu DB; người vận hành phải bảo vệ việc sửa các bảng phân quyền.

Mỗi request có Bearer: xác minh JWT, SELECT lại người dùng cùng JOIN bốn bảng RBAC, kiểm tra status active. `authorize` dùng permissions từ kết quả DB của request đó. Không có bypass riêng cho nhãn admin; thay đổi quyền/trạng thái có hiệu lực từ request tiếp theo, không có cache RBAC trong token.

## Postman

Tạo environment: `baseUrl = http://127.0.0.1:3000`, `accessToken` (token của tài khoản thử nghiệm). Không đưa JWT_SECRET hay mật khẩu MySQL vào Postman. Chọn Body → raw → JSON cho register/login. Không export token/mật khẩu thật trong collection chia sẻ.

### POST /api/auth/register

```json
{
  "name": "Test reader",
  "email": "reader@example.test",
  "password": "test-only-password-2026",
  "phone": null
}
```

Các giá trị trên là fixture minh họa, không dùng làm thông tin đăng nhập thực. Trường cho phép: name, email, password, phone; từ chối tất cả trường khác, gồm role/roles/role_id, permissions, status, avatar và user_id.

- name: trim, không rỗng, tối đa 100 ký tự Unicode.
- email: trim/lowercase, tối đa 150 ký tự, kiểm tra định dạng cơ bản; chưa xác minh quyền sở hữu email.
- password: không trim, tối thiểu 12 ký tự, tối đa 72 byte UTF-8, Unicode hợp lệ; từ chối quá dài thay vì để bcrypt cắt ngầm.
- phone: tùy chọn/null, trim, tối đa 20 ký tự; không suy diễn định dạng quốc gia từ schema.
- Chuỗi name/email/phone không nhận ký tự điều khiển.

Thành công 201: `{ "success": true, "data": { "user_id": "...", "name": "...", "email": "...", "phone": null, "avatar": null, "status": "active", "created_at": "...", "updated_at": "...", "roles": ["reader"], "permissions": ["book_view"] } }`. Không có token khi đăng ký; gọi login riêng. Email trùng trả 409 `EMAIL_ALREADY_EXISTS`. Không trả hash.

### POST /api/auth/login

```json
{ "email": "reader@example.test", "password": "test-only-password-2026" }
```

Thành công 200:

```json
{ "success": true, "data": { "accessToken": "<token-from-server>", "tokenType": "Bearer", "expiresIn": 900 } }
```

Post-response script có thể dùng trên môi trường thử nghiệm:

```javascript
pm.test("Login succeeded", () => pm.response.to.have.status(200));
if (pm.response.code === 200) {
  pm.environment.set("accessToken", pm.response.json().data.accessToken);
}
```

Hash mới dùng bcrypt cost 12, salt do thư viện tạo. Login chỉ chấp nhận hash bcrypt hợp lệ; không chấp nhận mật khẩu lưu plain text và không tự chuyển đổi dữ liệu cũ. Hash thuật toán khác chưa được hỗ trợ. Sai email/mật khẩu hoặc hash không hỗ trợ cùng trả 401 `INVALID_CREDENTIALS`. Khi mật khẩu đúng nhưng status khác active, trả 403 `ACCOUNT_INACTIVE`.

JWT HS256 hết hạn sau 15 phút, payload chỉ có sub/iat/exp/iss/aud. Verify khóa thuật toán HS256, issuer/audience, thời hạn và ID; token không chứa email, phone, role, permission hoặc hash. Login/register/me/logout đặt Cache-Control no-store. Không ghi mật khẩu/token vào log.

### GET /api/auth/me

Authorization → Bearer Token → `{{accessToken}}`.

Trả 200 với profile của chính người dùng cùng roles/permissions lấy từ DB; không có password/hash. Thiếu token, sai chữ ký, hết hạn, sai issuer/audience/algorithm hoặc tài khoản đã bị xóa trả 401. Tài khoản inactive/locked trả 403, kể cả JWT chưa hết hạn.

### POST /api/auth/logout

Gửi Bearer token hợp lệ; không cần body. Trả 200 và thông báo client cần xóa token. **Không thu hồi token trên server**; token còn dùng được đến khi hết hạn nếu tài khoản vẫn active. Không có blacklist/refresh token hoặc bảng mới.

Post-response script:

```javascript
pm.environment.unset("accessToken");
```

Client nên xóa token cục bộ kể cả khi token đã hết hạn hoặc endpoint logout không gọi được. Không tuyên bố logout vô hiệu hóa token đã bị sao chép.

## Bảo vệ sách và mã lỗi

| Endpoint | Điều kiện |
| --- | --- |
| GET /api/books, GET /api/books/:id | Public, chỉ dữ liệu catalog Sach, không JOIN người mượn |
| POST /api/books | Bearer + book_create |
| PUT /api/books/:id | Bearer + book_update |
| DELETE /api/books/:id | Bearer + book_delete; vẫn áp dụng kiểm tra FK/bản sao |

Tài khoản mới reader không thể ghi sách: trả 403. Dùng tài khoản fixture của database thử nghiệm đã có quyền phù hợp; API này không có endpoint tự cấp quyền/admin. Không thêm quyền cho tài khoản chính để kiểm thử.

Thiếu/sai/hết hạn token: 401; không đủ quyền hoặc tài khoản không hoạt động: 403; lỗi cấu hình auth: 503; input sai: 400; email trùng: 409. JSON lỗi theo `{ "success": false, "error": { "code": "...", "message": "..." } }`, không lộ SQL/stack/secret.

Giới hạn theo IP: login 10 và register 5 request/15 phút, kể cả request sai; vượt trả 429 `TOO_MANY_ATTEMPTS` và Retry-After. Bộ đếm trong bộ nhớ, reset khi restart, không đồng bộ nhiều instance. Không bật trust proxy; cấu hình proxy/HTTPS/distributed limiter cần được đánh giá riêng trước production.

## Kết quả kiểm thử và giới hạn

`npm.cmd test`: 40/40 đạt. Auth dùng JWT/bcrypt/middleware thật với database model mô phỏng; model có kiểm thử SQL/transaction riêng. Bao phủ đăng ký, hash, duplicate email, thiếu reader, chống gửi role qua HTTP, sai mật khẩu, hash cũ không hỗ trợ, JWT hết hạn/sai chữ ký/algorithm/issuer/audience/thiếu expiry, 401/403, ánh xạ riêng từng quyền/endpoint, thay đổi quyền/trạng thái, logout stateless, thiếu secret, rate limit và regression sách.

MySQL chính chỉ được SELECT metadata và tên vai trò/quyền, không đọc hash/tài khoản. Health và public GET thật đạt; me/logout và ghi sách không có token trả 401; đăng ký thiếu secret trả 503 trước mọi ghi trong smoke test có chặn lấy transaction connection.

Chưa kiểm thử register/login thành công với người dùng thật hoặc database thử nghiệm độc lập, cạnh tranh email trùng thật, tải lớn, nhiều instance, email delivery hoặc production. Không tạo/sửa tài khoản, schema, seed, `.env`, remote hoặc lịch sử Git; chưa commit/push.

`npm audit` báo 2 moderate ở chuỗi dev nodemon/minimatch (phiên bản đã có trong HEAD, không đổi bởi task này); `npm audit --omit=dev` không có cảnh báo ở lần kiểm tra. Không chạy audit fix --force. Cần xử lý dependency dev trong task riêng.
