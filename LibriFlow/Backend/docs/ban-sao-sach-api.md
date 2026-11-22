# API bản sao sách — TASK-010

> Cập nhật TASK-018 (2026-11-07): Tạo copies/UNIQUE/FK, mượn/trả và chặn xóa có lịch sử đã chạy MySQL độc lập. PUT/DELETE thành công chưa kiểm chứng MySQL thật. Kết quả tổng thể 21/21 scenario thật và 172/172 unit tại [báo cáo bàn giao](backend-final-report.md). Các kết quả task trước bên dưới giữ lịch sử.

Xác minh: 2026-11-06 qua schema/seed, SELECT metadata/quyền hiện tại và source book-copy.*.

## Endpoint và RBAC

| Method | URL | Quyền |
| --- | --- | --- |
| GET | `/api/book-copies`, `/api/book-copies/` | Public |
| GET | `/api/book-copies/:id` | Public |
| GET | `/api/books/:id/copies` | Public; sách không tồn tại trả 404 BOOK_NOT_FOUND |
| POST | `/api/book-copies` | Bearer + copy_manage |
| PUT | `/api/book-copies/:id` | Bearer + copy_manage |
| DELETE | `/api/book-copies/:id` | Bearer + copy_manage |

copy_manage có trong seed và DB; admin/librarian được gán, reader không có. Middleware hiện có đọc lại status/quyền từ DB mỗi request; không lấy role/quyền từ client hoặc bypass theo nhãn admin. Thiếu token → 401, thiếu quyền/inactive/locked → 403. GET chỉ trả catalog bản sao, không JOIN người mượn và **không trả note nội bộ**, kể cả người gọi có token. POST/PUT đã có quyền trả bản ghi vừa ghi gồm note.

## Postman — chỉ ghi trên database thử nghiệm độc lập

Đặt baseUrl `http://127.0.0.1:3000`, accessToken từ login tài khoản fixture được cấp copy_manage trong database thử nghiệm, copyId từ POST. Không đăng ký reader rồi tự cấp admin. Không gửi request ghi tới DB chính. Chọn Authorization → Bearer Token → `{{accessToken}}` cho request ghi. Body → raw → JSON.

Danh sách:

```http
GET {{baseUrl}}/api/book-copies?page=1&limit=10&book_id=1&condition_status=good&availability_status=available&search=TEST
GET {{baseUrl}}/api/books/1/copies?page=1&limit=10
GET {{baseUrl}}/api/book-copies/{{copyId}}
```

page mặc định 1, limit mặc định 10/tối đa 100; sắp xếp copy_id DESC. search (tối đa 255 ký tự) tìm chuỗi con barcode, `%`, `_`, `=` được escape literal. Tên tham số lọc trùng tên cột, enum theo bảng bên dưới. Route lồng lấy book_id từ URL và không nhận query book_id để tránh mâu thuẫn. Route danh sách chung lọc book_id không có bản ghi trả danh sách rỗng; route lồng trả 404 nếu sách không tồn tại. Tổng và danh sách là hai SELECT riêng, không cùng snapshot khi ghi đồng thời.

```json
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 } }
```

POST:

```http
POST {{baseUrl}}/api/book-copies
Content-Type: application/json
```

```json
{ "book_id": "1", "barcode": "TEST-COPY-001", "condition_status": "good", "availability_status": "available", "note": "Synthetic test note" }
```

book_id phải trỏ tới sách fixture đã có. Thành công 201, Location `/api/book-copies/<id>`; response `{ "success": true, "data": { ... } }` gồm copy_id/book_id dạng chuỗi, barcode, hai trạng thái, note, created_at và updated_at. Lưu copyId từ `pm.response.json().data.copy_id` trong Post-response script chỉ khi status 201.

PUT (cùng book_id):

```http
PUT {{baseUrl}}/api/book-copies/{{copyId}}
Content-Type: application/json
```

```json
{ "book_id": "1", "barcode": "TEST-COPY-001", "condition_status": "damaged", "availability_status": "maintenance", "note": "Synthetic maintenance fixture" }
```

PUT là thay thế: book_id/barcode và cả hai trạng thái phải gửi rõ ràng, không tự reset trạng thái khi thiếu; note thiếu thành null. book_id phải giữ nguyên, chuyển sang sách khác trả 409 COPY_BOOK_IMMUTABLE (chính sách API bảo toàn lịch sử, không phải ràng buộc mới trong schema). Thành công 200; cập nhật không đổi vẫn 200.

DELETE:

```http
DELETE {{baseUrl}}/api/book-copies/{{copyId}}
```

Chỉ thành công nếu bản sao không có lưu thông đang mở và không có lịch sử mượn/sử dụng. Response 200 `{ "success": true, "data": null, "message": "Đã xóa bản sao sách." }`; gọi lại → 404 COPY_NOT_FOUND.

## Validation và bảo toàn dữ liệu

| Trường | Schema/hợp đồng API |
| --- | --- |
| book_id | BIGINT UNSIGNED dương, bắt buộc; kiểm tra sách tồn tại khi tạo |
| barcode | Chuỗi Unicode trim 1–50 ký tự, NOT NULL UNIQUE |
| condition_status | Enum good/damaged; POST thiếu mặc định good, PUT bắt buộc |
| availability_status | Enum DB available/borrowed/lost/maintenance; GET lọc đủ 4 giá trị; POST/PUT chỉ available/maintenance |
| note | TEXT, null hoặc Unicode tối đa 65535 byte UTF-8; ẩn khỏi GET công khai |

FE-14, kiểm chứng 22/11/2026. Mỗi bản sao tham chiếu đầu sách qua `book_id` và có `barcode` duy nhất. Gửi `isbn` vào body bản sao trả 400. Xem ISBN qua API sách.

- POST khóa chia sẻ sách (FOR SHARE) trước INSERT; sách không tồn tại → 400 INVALID_REFERENCE. Trùng barcode → 409 DUPLICATE_VALUE.
- PUT/DELETE khóa bản sao FOR UPDATE, đọc locking current read ChiTietPhieuMuon. Bản sao borrowed/lost bị chặn mọi sửa/xóa → 409 COPY_CIRCULATION_LOCKED.
- Dù availability ghi available, nếu có dòng mượn với returned_at NULL hoặc status khác returned vẫn chặn sửa/xóa. Không tự sửa trạng thái bất nhất.
- Chọn borrowed/lost trong POST/PUT → 409 CIRCULATION_STATE_MANAGED. Các trạng thái liên quan mượn/trả chỉ do module sau xử lý; không tạo lịch sử mượn/phiếu mượn ở đây.
- DELETE chặn mọi lịch sử ChiTietPhieuMuon (kể cả đã trả) → 409 COPY_HAS_LOAN_HISTORY; chặn LichSuSuDung → 409 COPY_HAS_USAGE_HISTORY, tránh ON DELETE SET NULL làm mất liên kết lịch sử.
- Chỉ DELETE BanSaoSach khi an toàn, không xóa con/cascade. FK lỗi đồng thời → 409 COPY_IN_USE; lỗi ghi rollback và release connection. Không thay khóa ngoại/schema.
- Module mượn/trả sau phải cùng khóa bản sao trước khi thay đổi trạng thái/lịch sử. Chưa kiểm thử concurrency nhiều kết nối thật; deadlock/timeout theo middleware hiện có trả 503 để thử lại.

## Kiểm thử và giới hạn

Tổng `npm.cmd test`: 63/63 đạt, gồm regression auth/sách và test catalog. Test HTTP dùng JWT/RBAC thật với model mô phỏng; test model kiểm tra câu SQL có tham số, khóa hàng, rollback và không phát lệnh DELETE khi có lịch sử. Bao phủ 400/401/403/404/409, FK sách thiếu, UNIQUE barcode, enum, trạng thái đang mượn, quyền từng vai trò, bảo mật note và chống SQL injection qua search/filter. Model không SELECT note trong GET list/detail; controller tiếp tục loại note để phòng model trả thừa trường.

Smoke test MySQL thật: GET danh sách/lọc/tìm kiếm và health đạt; detail/nested không tồn tại trả 404, input lỗi 400, ghi không token 401. Metadata xác nhận FK/UNIQUE. Chỉ SELECT và request bị chặn trước ghi; đã đóng server/pool. Chưa có kiểm thử ghi trên DB độc lập, dữ liệu thật đầy đủ, UNIQUE/concurrency thật hoặc module mượn/trả. Không tạo DB, sửa `.env`, schema, seed, Git/remote hoặc commit/push. Không mở API ra Internet.
