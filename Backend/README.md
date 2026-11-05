# LibriFlow Backend — MySQL

Backend kết nối trực tiếp tới MySQL Server bằng `mysql2/promise`. MySQL Workbench dùng để quản lý cùng server và schema đó.

Backend có JWT/RBAC, vẫn chỉ dùng phát triển cục bộ và chưa sẵn sàng production. Server chỉ bind `127.0.0.1`; không mở public API. Chỉ kiểm thử đăng ký và POST/PUT/DELETE sách trên database thử nghiệm độc lập, không dùng database chính.

## Xác thực và phân quyền

`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`. Đăng ký chỉ gán reader theo seed; mật khẩu bcrypt cost 12; JWT HS256 có hạn 15 phút, chỉ chứa định danh và claim chuẩn. Middleware đọc lại status/roles/permissions từ DB mỗi request. Logout stateless yêu cầu client xóa token, không thu hồi token trên server.

Cấu hình `JWT_SECRET` ngẫu nhiên tối thiểu 32 byte trong môi trường server; không có secret mặc định. Không sửa `.env` thật trong task này. Thiếu cấu hình: auth trả 503 an toàn, public health/GET sách vẫn chạy. Cách tạo secret không in giá trị, request/response và Postman: [Auth API](docs/auth-api.md).

## Module sách

`routes → controllers → services → models` xử lý lần lượt định tuyến, HTTP/validation, kết quả nghiệp vụ và truy vấn pool. `middlewares/error-handler.js` chuẩn hóa lỗi; `utils/book-validation.js` kiểm tra dữ liệu theo `sql/schema.sql`.

- `GET /api/books` (cả trailing slash): danh sách, `page`, `limit`, `search` theo title/author/publisher.
- `GET /api/books/:id`: chi tiết.
- `POST /api/books`: tạo sách, cần Bearer + book_create.
- `PUT /api/books/:id`: cần book_update; thay thế đầy đủ, bắt buộc title/author; trường tùy chọn bị bỏ qua thành null.
- `DELETE /api/books/:id`: cần book_delete; chặn xóa khi có bản sao/dữ liệu liên quan, không cascade.

Hướng dẫn request/response, validation và quy trình Postman: [API sách](docs/books-api.md).

Kiểm thử tự động không ghi vào MySQL: `npm.cmd test` (Node.js 22 trở lên; môi trường xác minh Node.js 24). Module auth dùng bcryptjs, jsonwebtoken, express-rate-limit (đã ghi package-lock.json). `npm.cmd run db` là alias của `npm.cmd run db:check`; `npm.cmd start` và `npm.cmd run dev` vẫn được giữ.

## Cấu hình

1. Mở connection trong MySQL Workbench. Dùng cùng Hostname, Port và Username cho `DB_HOST`, `DB_PORT`, `DB_USER` trong `.env`.
2. Khi cần dựng database mới và đã xác nhận đúng môi trường, chạy `sql/schema.sql` rồi `sql/seeds/initial-permissions.sql` trong SQL Editor của Workbench. Script đầu tạo database và 16 bảng; script sau khởi tạo vai trò/quyền. Xem [hướng dẫn SQL](sql/README.md) trước khi thực thi. Không chạy lại các script trên database hiện tại để kiểm thử; chúng không phải migration. `sql/create-database.sql` chỉ là script cũ tạo schema trống.
3. Điền mật khẩu MySQL vào `DB_PASSWORD` và tên schema vào `DB_NAME` trong `.env`. Nếu chưa có `.env`, sao chép từ `.env.example`. Đặt mật khẩu trong dấu nháy kép nếu có ký tự `#`. Không commit `.env`.

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD="your_mysql_password"
DB_NAME=libriflow
```

Chạy từ thư mục `Backend`:

```powershell
npm.cmd install
npm.cmd run db:check
npm.cmd run dev
```

Kết nối thành công sẽ in `MySQL connected successfully`. API chỉ bắt đầu lắng nghe sau khi kiểm tra database thành công.

- `GET http://localhost:3000/api/health`: kiểm tra API.
- `GET http://localhost:3000/api/health/db`: kiểm tra database bằng `SELECT 1`; trả HTTP 200 khi kết nối được, HTTP 503 nếu mất kết nối.

## Truy vấn trong Backend

```javascript
import pool from "./config/database.js";

// Dùng tham số để truyền dữ liệu vào truy vấn.
const [rows] = await pool.execute("SELECT ? AS value", ["LibriFlow"]);
```

## Lỗi thường gặp

- `ER_ACCESS_DENIED_ERROR`: kiểm tra username và mật khẩu.
- `ER_BAD_DB_ERROR`: tạo schema hoặc sửa `DB_NAME` theo schema hiện có.
- `ECONNREFUSED`: kiểm tra dịch vụ MySQL đang chạy, hostname và port.

Các biến môi trường đã được đặt ngoài ứng dụng được ưu tiên hơn `.env`. Đường dẫn `.env` được xác định theo vị trí module nên cũng có thể chạy `node Backend/src/server.js` từ thư mục gốc dự án.
