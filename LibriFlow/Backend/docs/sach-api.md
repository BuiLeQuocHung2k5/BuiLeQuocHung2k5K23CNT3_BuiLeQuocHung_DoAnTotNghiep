# Kiểm thử API sách bằng Postman

> Cập nhật TASK-018 (2026-11-07): Tạo sách/FK và phân quyền đã kiểm chứng MySQL độc lập. PUT/DELETE thành công vẫn mới unit/mock; không dùng DB chính để thử ghi. Kết quả tổng thể 21/21 scenario thật và 172/172 unit tại [báo cáo bàn giao](backend-final-report.md). Các kết quả task trước bên dưới giữ lịch sử.

Xác minh: 2026-11-05. Nguồn: `src/routes/sach.routes.js`, `src/utils/kiem-tra-sach.js`, `src/models/sach.model.js`, `sql/schema.sql`.

## Môi trường và an toàn dữ liệu

API đã có JWT/RBAC, chỉ phục vụ phát triển cục bộ, chưa sẵn sàng production. `npm start`/`npm run dev` chỉ bind `127.0.0.1`; không mở tunnel hoặc public API. GET sách public; request ghi cần Bearer token và quyền từ database. Xem [Auth API](xac-thuc-api.md).

Chỉ chạy POST/PUT/DELETE dưới đây khi backend đang kết nối **database thử nghiệm độc lập** có cùng schema. Không chạy collection ghi trên database chính. Các thao tác này ghi dữ liệu thật của database mà backend đang kết nối. Có thể chọn database thử nghiệm bằng biến môi trường tiến trình, không cần sửa `.env`:

```powershell
# Chỉ dùng khi libriflow_test đã được chuẩn bị và xác minh riêng.
cd Backend
$env:DB_NAME = "libriflow_test"
npm.cmd run db
npm.cmd start
```

Lệnh kiểm tra kết nối không chứng minh đó là môi trường thử nghiệm; phải tự xác nhận đúng database trước khi gửi request ghi. Script SQL hiện cố định tên `libriflow`, không tự chạy script đó để tạo `libriflow_test`. Không có script tạo database hoặc seed tự động trong module sách.

Trong Postman tạo biến `baseUrl = http://127.0.0.1:3000` và `bookId` (được lấy từ POST). Khi thử database chính, chỉ dùng GET. Không đặt thông tin đăng nhập MySQL vào Postman.

Với request POST/PUT/DELETE, chọn Authorization → Bearer Token → `{{accessToken}}` sau khi login bằng tài khoản fixture trên database thử nghiệm có quyền `book_create`/`book_update`/`book_delete` tương ứng. Tài khoản reader mới đăng ký chỉ xem được sách, không ghi; thiếu token trả 401, thiếu quyền trả 403. Không tự cấp admin cho tài khoản đăng ký.

## Endpoint

| Method | URL | Thành công |
| --- | --- | --- |
| GET | `{{baseUrl}}/api/books` hoặc `/api/books/` | 200, danh sách/phân trang |
| GET | `{{baseUrl}}/api/books/:id` | 200, một sách |
| POST | `{{baseUrl}}/api/books` | 201, sách mới và header Location |
| PUT | `{{baseUrl}}/api/books/:id` | 200, thay thế sách |
| DELETE | `{{baseUrl}}/api/books/:id` | 200, xác nhận xóa |

### 1. Danh sách và tìm kiếm

```http
GET {{baseUrl}}/api/books?page=1&limit=10&search=LibriFlow
```

`page` mặc định 1, `limit` mặc định 10, tối đa 100. Cả hai là số nguyên dương; offset phải là số nguyên an toàn JavaScript. Chỉ hỗ trợ ba query parameter trên; tham số lặp hoặc không hỗ trợ trả 400.

`search` tối đa 255 ký tự, tìm chuỗi con trong `title`, `author`, `publisher`. `%`, `_`, `=` được hiểu là ký tự thường; tìm kiếm có phân biệt hoa/dấu hay không tuân theo collation MySQL. Sắp xếp cố định theo `book_id DESC`. Sách chưa có hoặc page vượt tổng trang trả danh sách rỗng. COUNT và SELECT danh sách là hai truy vấn đọc riêng, không bảo đảm cùng snapshot nếu có ghi đồng thời.

Ví dụ khi không có kết quả:

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```

### 2. Tạo sách — chỉ database thử nghiệm

Chọn Body → raw → JSON; header `Content-Type: application/json`.

```http
POST {{baseUrl}}/api/books
```

```json
{
  "title": "LibriFlow test book",
  "author": "Test author",
  "isbn": null,
  "publisher": "Test publisher",
  "description": "Temporary test fixture",
  "publication_year": 2026,
  "category_id": null,
  "series_id": null
}
```

Ví dụ response (ID và thời gian minh họa):

```json
{
  "success": true,
  "data": {
    "book_id": "42",
    "category_id": null,
    "series_id": null,
    "title": "LibriFlow test book",
    "author": "Test author",
    "isbn": null,
  "publisher": "Test publisher",
    "description": "Temporary test fixture",
    "publication_year": 2026,
    "created_at": "2026-11-05T00:00:00.000Z",
    "updated_at": "2026-11-05T00:00:00.000Z"
  }
}
```

Status 201, `Location: /api/books/42`. Có thể đặt Post-response script:

```javascript
pm.test("Created", () => pm.response.to.have.status(201));
if (pm.response.code === 201) {
  pm.environment.set("bookId", pm.response.json().data.book_id);
}
```

### 3. Chi tiết

```http
GET {{baseUrl}}/api/books/{{bookId}}
```

Trả 200 với `{ "success": true, "data": { ... } }` như POST; ID hợp lệ nhưng không có bản ghi trả 404 `BOOK_NOT_FOUND`.

### 4. Thay thế — chỉ database thử nghiệm

```http
PUT {{baseUrl}}/api/books/{{bookId}}
Content-Type: application/json
```

```json
{ "title": "Updated test book", "author": "Test author", "publication_year": 2025 }
```

PUT là **thay thế đầy đủ**, không phải PATCH: `title` và `author` luôn bắt buộc; các trường tùy chọn bị bỏ qua sẽ thành `null`. `book_id`, `created_at` không đổi; `updated_at` do MySQL quản lý. Cập nhật cùng dữ liệu vẫn trả 200, không bị nhầm là không tìm thấy.

### 5. Xóa — chỉ database thử nghiệm

```http
DELETE {{baseUrl}}/api/books/{{bookId}}
```

```json
{ "success": true, "data": null, "message": "Đã xóa sách." }
```

Sau đó GET cùng ID phải trả 404. Nếu sách có bản sao, trả 409 `BOOK_HAS_COPIES`; nếu FK chặn thao tác do dữ liệu liên quan/thay đổi đồng thời, trả 409 `BOOK_IN_USE`. Transaction khóa sách trước khi kiểm tra, không xóa bản sao hoặc dữ liệu nghiệp vụ khác. Chỉ thử trường hợp 409 trên fixture có sẵn của database thử nghiệm; module này không tạo bản sao sách.

## Quy tắc dữ liệu và lỗi

| Trường | Quy tắc từ schema và hợp đồng API |
| --- | --- |
| `title` | Bắt buộc, chuỗi Unicode, trim, 1–255 ký tự |
| `author` | Bắt buộc, chuỗi Unicode, trim, 1–150 ký tự |
| `isbn` | Chuỗi ISBN-10 hoặc ISBN-13 có số kiểm tra hợp lệ, hoặc null. Chuẩn hóa khoảng trắng, gạch nối và X. Giá trị đã chuẩn hóa là duy nhất giữa các đầu sách. |
| `publisher` | Chuỗi trim tối đa 150 ký tự hoặc null |
| `description` | Unicode hợp lệ, tối đa 65535 byte UTF-8 (TEXT), hoặc null |
| `publication_year` | JSON number nguyên 0–65535 (SMALLINT UNSIGNED), hoặc null; không suy diễn giới hạn năm nghiệp vụ |
| `category_id`, `series_id` | null hoặc ID dương BIGINT UNSIGNED, phải tham chiếu bản ghi tồn tại |

ID đường dẫn/FK tối đa `18446744073709551615`. Dùng chuỗi thập phân cho ID lớn; number vượt `Number.MAX_SAFE_INTEGER` bị từ chối. Response luôn biểu diễn ID bằng chuỗi để tránh mất chính xác. Không nhận trường lạ hoặc trường do server quản lý (`book_id`, timestamps).

FE-14, kiểm chứng 22/11/2026. GET danh sách và chi tiết trả về `isbn`. POST/PUT trùng ISBN trả 409 `DUPLICATE_ISBN`. Barcode thuộc bản sao. Hai đầu sách có thể cùng tiêu đề.

Ví dụ lỗi validation:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ.",
    "details": [{ "field": "title", "message": "Trường bắt buộc." }]
  }
}
```

| HTTP | Các trường hợp cần thử |
| --- | --- |
| 400 | Thiếu title/author, ID sai, chuỗi quá dài, năm ngoài phạm vi, JSON lỗi, tham chiếu category/series không tồn tại (`INVALID_REFERENCE`) |
| 401/403 | Thiếu/sai/hết hạn token hoặc thiếu quyền; tài khoản inactive/locked bị từ chối |
| 404 | ID hợp lệ không có sách hoặc endpoint không tồn tại |
| 409 | Sách có bản sao/dữ liệu liên quan; trùng UNIQUE nếu phát sinh |
| 413 | Body vượt giới hạn 256 KiB |
| 415 | POST/PUT không gửi application/json |
| 503 | Database không sẵn sàng, deadlock hoặc lock timeout; có thể thử lại |
| 500 | Lỗi không dự kiến; response không chứa SQL, stack trace hoặc cấu hình |

Không dừng MySQL chính để thử lỗi. Các trường hợp FK race, UNIQUE và database lỗi đã kiểm thử bằng mô phỏng.

## Kết quả xác minh và giới hạn

- `npm.cmd test`: 40/40 đạt sau khi thêm auth; dùng `node:test`, JWT/bcrypt thật và mô hình lưu trữ/connection mô phỏng; không gửi lệnh ghi đến MySQL. Test sách dùng Bearer hợp lệ với quyền DB mô phỏng; test auth kiểm tra 401/403/RBAC. Bao phủ lifecycle HTTP, validation, query có tham số, transaction, rollback, chặn xóa và ẩn lỗi SQL.
- Kiểm tra thật ngày 2026-11-05: startup server, `/api/health`, `/api/health/db`, danh sách, phân trang, tìm kiếm chuỗi có ký tự đặc biệt, chi tiết không tồn tại và ID lỗi đều đạt. Chỉ GET/SELECT trên MySQL chính; không in nội dung bản ghi.
- Bảng sách trống tại lần kiểm tra: chưa kiểm thử GET chi tiết có sẵn hoặc POST/PUT/DELETE trên MySQL thật. Chưa xác minh cạnh tranh transaction bằng nhiều kết nối thật, môi trường phân biệt hoa/thường, timezone khác hoặc tải lớn. Không coi các kiểm thử mô phỏng là kiểm chứng SQL ghi thực thi thành công.
