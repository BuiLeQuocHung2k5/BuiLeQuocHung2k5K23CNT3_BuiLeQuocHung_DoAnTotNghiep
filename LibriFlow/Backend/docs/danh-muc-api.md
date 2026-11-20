# API danh mục — TASK-011

> Cập nhật TASK-018 (2026-11-07): Tạo danh mục/quyền và chặn xóa khi có sách đã chạy MySQL độc lập với seed mới. Database chính vẫn chưa có category_manage, migration chưa chạy. Kết quả tổng thể 21/21 scenario thật và 172/172 unit tại [báo cáo bàn giao](backend-final-report.md). Các kết quả task trước bên dưới giữ lịch sử.

Xác minh: 2026-11-06 qua schema/seed, source category.*, test và SELECT quyền thực tế. Code đã mở ghi bằng category_manage; database chính chưa cài quyền này, chưa chạy migration.

## Trạng thái và phân quyền

GET public. POST/PUT/DELETE yêu cầu `authenticate` rồi `yeuCauQuyen("category_manage")`. Seed cập nhật gán quyền cho admin và librarian, không gán reader. Không có bypass theo tên vai trò hoặc quyền sách.

Request ghi thiếu/sai token trả 401; thiếu category_manage trong dữ liệu DB trả **403 FORBIDDEN**, kể cả admin. Tài khoản inactive/locked bị từ chối. Nếu database chưa chạy migration hoặc chưa gán quyền, endpoint vẫn fail-closed, không tự cấp quyền hay tự seed. Không còn chốt tạm 503 CATEGORY_WRITE_PERMISSION_UNAVAILABLE của TASK-010. Middleware đọc quyền DB mỗi request, không cần nhúng quyền vào JWT.

## Endpoint

| Method | URL | Hành vi |
| --- | --- | --- |
| GET | `/api/categories`, `/api/categories/` | 200, danh sách/phân trang |
| GET | `/api/categories/:id` | 200 hoặc 404 CATEGORY_NOT_FOUND |
| POST | `/api/categories` | 201 + Location; cần category_manage |
| PUT | `/api/categories/:id` | 200; cần category_manage |
| DELETE | `/api/categories/:id` | 200; cần category_manage; có sách trả 409 |

Trong Postman đặt `baseUrl=http://127.0.0.1:3000`:

```http
GET {{baseUrl}}/api/categories?page=1&limit=10&search=Test
GET {{baseUrl}}/api/categories/1
```

`page` mặc định 1, `limit` mặc định 10/tối đa 100. `search` tối đa 255 ký tự, tìm chuỗi con name/description, escape `%`, `_`, `=` như ký tự thường; collation MySQL quyết định so sánh hoa/dấu. Sắp xếp category_id DESC. Chỉ nhận page/limit/search; ID dương BIGINT UNSIGNED, trả ID dạng chuỗi. ID sai/query sai trả 400; page không có kết quả trả mảng rỗng. COUNT và danh sách là hai SELECT riêng, có thể khác snapshot khi ghi đồng thời.

Ví dụ không có kết quả:

```json
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 } }
```

Mỗi phần tử gồm category_id, name, description, created_at; không JOIN dữ liệu người dùng.

## Ghi dữ liệu và Postman

Chỉ thử ghi trên database thử nghiệm độc lập đã có migration và tài khoản fixture có category_manage. Không chạy request ghi trên DB chính để kiểm thử. Xem `sql/README.md` cho migration thủ công; task này không tự chạy migration.

Sau login, chọn Authorization → Bearer Token → `{{accessToken}}`, Body → raw → JSON. Gửi POST `{{baseUrl}}/api/categories` hoặc PUT `{{baseUrl}}/api/categories/{{categoryId}}`:

```json
{ "name": "Test category", "description": "Catalog description" }
```

Chỉ nhận name/description. name trim, bắt buộc, tối đa 100 ký tự Unicode, UNIQUE do MySQL kiểm tra. description tùy chọn/null, tối đa 65535 byte UTF-8 (TEXT). Từ chối trường lạ, category_id và created_at. PUT thay thế đầy đủ: name bắt buộc, description bị bỏ qua thành null.

POST thành công: status 201, `Location: /api/categories/<id>`, JSON `{ "success": true, "data": { "category_id": "...", "name": "Test category", "description": "Catalog description", "created_at": "..." } }`. Có thể lưu `categoryId` từ `pm.response.json().data.category_id` trong Post-response script khi response là 201.

PUT thành công trả 200 với data cùng dạng; PUT không đổi vẫn 200. DELETE `{{baseUrl}}/api/categories/{{categoryId}}` thành công trả `{ "success": true, "data": null, "message": "Đã xóa danh mục." }`; gọi lại trả 404. Token/quyền phải hợp lệ trước validation: body sai trả 400 khi được phép; thiếu quyền vẫn 403, không tới model.

Duplicate name → 409 DUPLICATE_VALUE, không tìm thấy → 404 CATEGORY_NOT_FOUND, không xóa danh mục có sách → 409 CATEGORY_IN_USE. DELETE khóa DanhMuc bằng FOR UPDATE, kiểm tra Sach bằng locking read rồi mới xóa; không để FK ON DELETE SET NULL tự tách các sách hiện có khỏi danh mục. Không thay đổi FK/schema.

## Kiểm thử và giới hạn

`npm.cmd test`: 69/69 đạt. Category HTTP dùng JWT thật với DB model mô phỏng: admin/librarian có category_manage ghi được; reader/admin thiếu quyền/không cài quyền bị 403; không token 401. Bao phủ POST/PUT/DELETE, validation 400, 404, duplicate 409, HTTP DELETE qua model thật với connection mock khóa/chặn có sách và rollback. Kiểm tra tĩnh seed giữ nguyên các quyền cũ và reader; migration chỉ thêm quyền/liên kết qua khóa tự nhiên với INSERT IGNORE.

MySQL chính: SELECT xác nhận category_manage chưa tồn tại, chưa có liên kết vai trò; snapshot trước/sau không đổi. Health/public GET đạt 200; smoke test dùng role/permission từ SELECT thật và principal mô phỏng (không đọc tài khoản) xác nhận 401/403 trước ghi, chặn getConnection. Không thực thi migration/seed hoặc ghi dữ liệu. Chưa kiểm thử migration chạy hai lần, CRUD/UNIQUE/concurrency trên MySQL thử nghiệm độc lập vì chưa có môi trường được chỉ định. Static test không thay thế việc thực thi SQL. Server vẫn loopback, không public API.
