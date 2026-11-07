# API mượn/trả — TASK-012

Xác minh: 2026-11-06 qua `sql/schema.sql`, seed, SELECT metadata/quyền, `src/{routes,controllers,services,models}/borrow.*.js` và `src/utils/borrow-validation.js`. Không chạy ghi trên MySQL chính.

## Quyền và phạm vi dữ liệu

| Endpoint | Điều kiện |
| --- | --- |
| POST /api/borrows | JWT + borrow_manage |
| GET /api/borrows (cả trailing slash) | JWT; borrow_manage xem toàn bộ, reader không có quyền đó chỉ xem chính mình |
| GET /api/borrows/:id | Cùng phạm vi trên; phiếu ngoài phạm vi reader trả 404 |
| POST /api/borrows/:id/return | JWT + return_process |

Seed và DB hiện tại xác nhận admin/librarian được cấp borrow_manage và return_process; reader chỉ book_view. Không tạo quyền mới hoặc bypass theo tên admin/librarian. Quyền/status/role lấy lại từ DB qua middleware hiện có; tài khoản không active bị từ chối. Người dùng không có borrow_manage và không có role reader không được đọc phiếu. Ai được DB cấp borrow_manage có quyền xem/quản lý phiếu theo quyền đó, kể cả tài khoản nhiều role.

Reader không được lập/trả phiếu, kể cả cho chính mình. Reader không được gửi query user_id (kể cả ID của mình); server tự lấy owner từ JWT đã xác thực và đặt điều kiện WHERE trên cả COUNT/list/detail. Không JOIN NguoiDung để lấy email/phone/hash. Người có borrow_manage được chọn user_id khi lập phiếu cho một người mượn active; đây là thao tác được ủy quyền theo permission, không phải tự cấp quyền qua body. Client không gửi user_id ở request trả sách.

## Postman — chỉ thử ghi trên database thử nghiệm độc lập

Đặt `baseUrl=http://127.0.0.1:3000`, `accessToken` từ login tài khoản fixture có quyền, `borrowId` từ POST. Chọn Bearer Token `{{accessToken}}` và Body → raw → JSON. Không thêm quyền/tài khoản vào DB chính để thử, không public API. Hướng dẫn JWT: [auth-api.md](auth-api.md).

### Lập phiếu

```http
POST {{baseUrl}}/api/borrows
Content-Type: application/json
```

```json
{
  "user_id": "30",
  "copy_ids": ["1", "2"],
  "due_date": "2035-01-01T12:00:00Z",
  "note": "Synthetic fixture"
}
```

Các ID là fixture minh họa, phải có trong DB thử nghiệm. Ngày hẹn trả phải nằm trong tương lai tại lúc gửi và sau khi đã lấy khóa. API nhận đúng UTC ISO `YYYY-MM-DDTHH:mm:ssZ` (không offset, không mili giây); kiểm tra ngày lịch thực, năm trong phạm vi MySQL DATETIME. Không suy diễn giới hạn thời gian mượn nghiệp vụ khi chưa có yêu cầu.

user_id/copy_ids là ID dương BIGINT UNSIGNED; ID lớn gửi chuỗi, không dùng số vượt JS safe integer. copy_ids cần 1–100 phần tử, không trùng sau chuẩn hóa ID. 100 là giới hạn vận hành request/khóa hàng của API, không phải hạn mức mượn trong schema. note tùy chọn/null, Unicode tối đa 65535 byte UTF-8. Không nhận status, borrow_date, returned_at, trạng thái bản sao hoặc trường lạ.

Người mượn phải tồn tại/active. Mọi bản sao phải tồn tại, availability_status=available và condition_status=good; không có chi tiết mượn đang mở/bất nhất. Chính sách chỉ cho mượn sách good là giới hạn an toàn của API, không phải đổi enum trong schema.

Thành công **201**, Location `/api/borrows/<id>`:

```json
{
  "success": true,
  "data": {
    "borrow_id": "10", "user_id": "30",
    "borrow_date": "2026-11-06 00:00:00", "due_date": "2035-01-01 12:00:00",
    "status": "borrowed", "note": "Synthetic fixture", "created_at": "2026-11-06 00:00:00",
    "details": [
      { "borrow_detail_id": "100", "copy_id": "1", "returned_at": null, "condition_before": "good", "condition_after": null, "status": "borrowed" },
      { "borrow_detail_id": "101", "copy_id": "2", "returned_at": null, "condition_before": "good", "condition_after": null, "status": "borrowed" }
    ]
  }
}
```

Response minh họa; thời gian tạo/mượn/trả của bản ghi **mới** do module ghi bằng UTC_TIMESTAMP, due_date lưu UTC DATETIME. Định dạng response là chuỗi `YYYY-MM-DD HH:mm:ss` (SQL DATE_FORMAT), không bị mysql2 tự chuyển timezone. Timezone của bản ghi legacy tạo ngoài module: **chưa xác minh**, không tự migrate/diễn giải lại. Module không nhận ngày mượn/trả từ client.

### Xem phiếu

```http
GET {{baseUrl}}/api/borrows?page=1&limit=10&status=borrowed
GET {{baseUrl}}/api/borrows/{{borrowId}}
```

page mặc định 1, limit mặc định 10/tối đa 100. status lọc đúng enum borrowed/partially_returned/returned/overdue/cancelled. Staff có borrow_manage có thể thêm user_id để lọc; reader không được làm vậy. Không nhận search hoặc query lạ/lặp sai kiểu. List sắp borrow_id DESC, trả `{success:true,data:[...headers],pagination:{page,limit,total,totalPages}}`; detail trả header cùng details như ví dụ. Tổng và list là hai SELECT riêng, có thể khác snapshot khi ghi đồng thời; detail dùng một SELECT JOIN để nhất quán trong statement. Không có endpoint công khai cho dữ liệu mượn.

### Trả một phần

```http
POST {{baseUrl}}/api/borrows/{{borrowId}}/return
Content-Type: application/json
```

```json
{ "items": [{ "copy_id": "1", "condition_after": "good" }] }
```

items cần 1–100 bản sao không trùng, mỗi phần tử chỉ có copy_id và condition_after (good/damaged). Bản sao phải thuộc đúng phiếu, chi tiết đang borrowed/returned_at NULL và bản sao đang borrowed. Module còn kiểm tra không có lượt mượn đang mở khác cho cùng copy. Trả lặp hoặc dữ liệu không nhất quán bị 409, không tự sửa lịch sử.

### Trả toàn bộ phần còn lại

```json
{ "return_all": true, "condition_after": "good" }
```

Không kết hợp items với return_all. Chọn cùng condition_after cho mọi bản sao chưa trả; nếu tình trạng khác nhau, dùng items liệt kê. Những chi tiết đã trả được giữ nguyên, không ghi đè thời gian/tình trạng cũ. Không có bản sao còn trả → 409. Phiếu returned/cancelled không được xử lý lại.

Trả thành công **200**, data là phiếu sau cập nhật. Detail được cập nhật returned_at UTC, condition_after và status=returned; copy good → available, damaged → maintenance và cập nhật condition_status. Header thành returned nếu tất cả chi tiết đã trả, nếu chưa hết thì partially_returned. Chỉ cập nhật các cột cần thiết, giữ note và condition_before/lịch sử cũ. Không tự đánh dấu overdue theo lịch, không tạo tiền phạt, xóa bản ghi, hủy phiếu hoặc xử lý mất sách.

## Transaction và khóa

- Lập phiếu: transaction → khóa chia sẻ NguoiDung → khóa từng copy FOR UPDATE theo ID số tăng dần → kiểm tra mọi copy/lượt mượn mở/ngày hẹn theo đồng hồ DB → tạo PhieuMuon/ChiTietPhieuMuon và đổi copy sang borrowed → đọc kết quả → commit.
- Trả: transaction → khóa header FOR UPDATE → đọc danh sách detail → khóa tất cả copy theo thứ tự ID tăng dần → đọc lại detail FOR UPDATE và đối chiếu membership → kiểm tra toàn bộ batch/lượt mượn mở → cập nhật detail/copy/header → đọc kết quả → commit.
- Lỗi bất kỳ bước nào rollback toàn bộ và release connection. Không viết dữ liệu trước khi kiểm tra đủ batch. Tối đa 100 detail/phiếu theo API; phiếu legacy trống/trùng/quá lớn hoặc membership thay đổi bị 409 để rà soát riêng.
- Thứ tự copy → detail tương thích module bản sao. Tất cả writer tương lai phải tuân theo khóa copy; schema không có UNIQUE ngăn hai lượt mượn mở cùng copy. Không tuyên bố chống mọi thay đổi SQL ngoài protocol. Deadlock/timeout trả 503 theo middleware hiện có; client thử lại sau khi tải trạng thái mới. Không tự retry thao tác ghi.
- Detail lost/copy lost hoặc trạng thái bất nhất: giữ fail-closed cho phần bị ảnh hưởng, không hợp thức hóa bằng tạo/xóa lịch sử. Return-all có mục không hợp lệ rollback toàn bộ; có thể trả các mục hợp lệ bằng items nếu các điều kiện còn lại thỏa mãn.

## Lỗi cần thử

| HTTP | Trường hợp |
| --- | --- |
| 400 | ID/body/ngày sai, trùng copy, query trái hợp đồng; COPY_NOT_IN_BORROW |
| 401 | Thiếu/sai/hết hạn JWT |
| 403 | Thiếu borrow_manage/return_process; reader chọn user_id hoặc không đủ quyền đọc |
| 404 | BORROWER_NOT_FOUND, COPY_NOT_FOUND, BORROW_NOT_FOUND; phiếu ngoài phạm vi reader cũng 404 |
| 409 | Người mượn inactive/locked; copy không sẵn sàng; lượt mượn mở; trả lặp; lost/cancelled/chi tiết bất nhất |
| 503 | Database không sẵn sàng/deadlock/lock timeout; không lộ SQL/stack |

## Kiểm thử và phần chưa xác minh

`npm.cmd test`: **89/89 đạt**, gồm 69 test cũ và 20 test mượn/trả. Có create một/nhiều, rollback lỗi giữa chừng, borrower/copy sai, trùng/ngày sai, trả một phần/toàn bộ/lặp/sai phiếu, quyền/ownership SQL, HTTP 400/401/403/404/409 và mô phỏng hai lượt mượn cùng copy chỉ một commit.

Kiểm tra MySQL thật chỉ SELECT metadata/quyền/đồng hồ và thử câu SELECT list/count/detail với `WHERE 1=0` để kiểm chứng cú pháp mà không đọc phiếu thật. Smoke test dùng principal mô phỏng, predicate rỗng và guard chống transaction: health/catalog thật đạt, borrowing 401/403 và reader probe 200/404 đạt. Không đọc dữ liệu người dùng/hash hoặc lịch sử mượn thật; không tạo dữ liệu hoặc chạy migration/seed trên DB chính.

Chưa kiểm thử INSERT/UPDATE, FOR UPDATE/concurrency/deadlock/rollback bằng MySQL độc lập, legacy timezone, tải lớn, mất sách/tiền phạt hoặc phiếu quá hạn tự động. Mock lock không thay thế kiểm chứng InnoDB nhiều kết nối. Chỉ triển khai thử ghi trên database độc lập được người dùng chỉ định trong bước riêng.
## Cập nhật TASK-015 (2026-11-07)

Mượn/trả thành công giờ ghi một usage event cho mỗi bản sao trong **cùng connection/transaction** với nghiệp vụ. user_id là người mượn trên phiếu; trả một phần chỉ ghi cho bản sao vừa trả. Lỗi ghi lịch sử rollback cả phiếu/detail/bản sao và event của batch; không ghi cho thao tác thất bại/GET hoặc tự tạo tiền phạt. Các mục lịch sử trước TASK-015 mô tả trạng thái khi chưa có logging. Chi tiết: [Lịch sử sử dụng](usage-history-api.md).
