# LibriFlow Backend — MySQL

Backend kết nối trực tiếp tới MySQL Server bằng `mysql2/promise`. MySQL Workbench dùng để quản lý cùng server và schema đó.

## Cấu hình

1. Mở connection trong MySQL Workbench. Dùng cùng Hostname, Port và Username cho `DB_HOST`, `DB_PORT`, `DB_USER` trong `.env`.
2. Nếu chưa có schema, chạy nội dung `sql/create-database.sql` trong SQL Editor của Workbench. Script chỉ tạo schema `libriflow` nếu chưa tồn tại, chưa tạo bảng nghiệp vụ.
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
