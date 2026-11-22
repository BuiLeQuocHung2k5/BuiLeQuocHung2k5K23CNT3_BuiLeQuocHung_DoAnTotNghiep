# LibriFlow

LibriFlow quản lý đầu sách, bản sao và phiếu mượn. Bản demo chạy trên máy cá nhân bằng React/Vite, Express và MySQL 8.0. Trang dự báo dùng số phiếu mượn từng ngày của một người dùng.

## Chạy trên máy đã chuẩn bị

Mở Terminal trong VS Code tại thư mục chứa `package.json` gốc. Khởi động MySQL Server, rồi chạy lệnh sau.

```powershell
npm run dev
```

Mở [trang đăng nhập](http://127.0.0.1:5173/dang-nhap). Xem tài khoản cho từng vai trò trong `Backend/.demo-local/tai-khoan.json` bằng trình soạn thảo cục bộ. Nhấn **Ctrl+C** trong Terminal để dừng Express và Vite. MySQL tiếp tục giữ dữ liệu. Khi sang ngày trình diễn mới, chạy `npm run demo:setup` trước khi mở ứng dụng để cập nhật lịch sử và kiểm kê các ngày UTC đã kết thúc.

## Chuẩn bị lần đầu trên Windows

1. Cài Node.js 24 (từ 24.15), npm 11 và MySQL Server 8.0.16 trở lên. Kiểm chứng với Node 24.20.0 và MySQL 8.0.40. Chỉ cần dịch vụ MySQL đang chạy.
2. Cài dependency từ hai lockfile. Tạo file môi trường nếu máy chưa có.

   ```powershell
   npm.cmd --prefix Backend ci
   npm.cmd --prefix Frontend ci
   if (!(Test-Path Backend/.env)) { Copy-Item Backend/.env.example Backend/.env }
   ```

3. Trong `Backend/.env`, cấu hình `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` cho MySQL loopback. Tài khoản khởi tạo cần đọc metadata tài khoản, tạo schema, bảng, tài khoản MySQL và cấp quyền trong schema demo. Lệnh chạy ứng dụng sau đó dùng tài khoản riêng có quyền đọc/ghi trong `libriflow_demo`. JWT secret và mật khẩu demo được sinh ngẫu nhiên trên máy.
4. Từ gốc dự án, tạo demo rồi khởi động.

   ```powershell
   npm.cmd run demo:setup
   npm run dev
   ```

Lần đầu, bộ dữ liệu gồm 10 đầu sách, 20 bản sao, 3 tài khoản theo vai trò, phiếu đang mượn và lịch sử đã trả. Các lần chạy sau giữ thao tác người dùng đã lưu và chỉ bổ sung những ngày demo còn thiếu trong cửa sổ 28 ngày. Giữ thư mục riêng tư `Backend/.demo-local/` trên máy cùng với database. Git đã bỏ qua thư mục này.

## Trình diễn

1. **Admin** → **Mở tổng quan quản trị** → **Mở quản lý sách**. Thêm sách với ISBN hợp lệ chưa dùng, rồi vào chi tiết và thêm hai bản sao với hai mã vạch riêng. Tải lại, đăng nhập lại và tìm sách để kiểm tra dữ liệu đã lưu.
2. **Độc giả** → **Tài khoản** để xem mã người dùng thực tế. **Thủ thư** → **Mượn / Trả sách**, nhập mã độc giả, chọn hai bản sao khả dụng và xác nhận lập phiếu. Trả một bản trước, rồi trả toàn bộ phần còn lại. Đăng nhập lại bằng tài khoản độc giả để xem lịch sử cá nhân.
3. **Admin** → **Thống kê** để xem 7 chỉ số. Trong **Dự báo tần suất**, nhập mã độc giả ở bước 2. Đường liền và bảng lịch sử thể hiện số phiếu thực tế. Đường đứt và bảng kết quả thể hiện 7 ngày dự báo do Backend tính. Giá trị thay đổi theo ngày cắt và hoạt động trong database.

## Kiểm tra kết nối

Express lắng nghe ở loopback cổng 3000 mặc định. Vite dùng 5173 và gọi trực tiếp origin Express qua CORS. Launcher truyền `VITE_API_BASE_URL` tương ứng cho Vite. Mở [trạng thái kết nối MySQL](http://127.0.0.1:3000/api/health/db) và kiểm tra `database` bằng `connected`.

| Vấn đề | Cách xử lý |
| --- | --- |
| PowerShell chặn `npm.ps1` | Dùng `npm.cmd run dev` trong cùng Terminal. |
| `ENOENT` hoặc thiếu package | Kiểm tra hai bước `ci`, file `Backend/.env` và kết quả `demo:setup`. |
| `ECONNREFUSED` / `ER_ACCESS_DENIED_ERROR` | Kiểm tra dịch vụ MySQL, cổng và quyền của tài khoản local. |
| `DEMO_NAME_ALREADY_USED` / `DEMO_IDENTITY_MISMATCH` | Đối chiếu schema, account và cấu hình demo riêng đã lưu. Không chạy reset hoặc nhập seed lên dữ liệu đang có. |
| Cổng đã được dùng | Đóng phiên LibriFlow cũ bằng Ctrl+C. Nếu cần đổi riêng cổng Express, đặt `$env:PORT` trước khi chạy lệnh gốc. |
| Dự báo thiếu dữ liệu | Chạy `npm run demo:setup` để kiểm kê ngày mới. Chọn mã độc giả demo có lịch sử và xem lý do Backend trả về. |

Có thể chạy riêng hai nửa của demo bằng `npm run dev:backend` và `npm run dev:frontend` ở hai Terminal. Các script riêng trong Backend/Frontend vẫn dùng cấu hình của từng ứng dụng. Database cũ cần được sao lưu và chuyển ISBN trước khi dùng Backend mới cho nghiệp vụ sách. Xem [migration ISBN](Backend/sql/migrations/002_isbn_dau_sach.sql) và [kết quả nghiệm thu FE-14](Frontend/docs/FE14_HANDOFF.md).
