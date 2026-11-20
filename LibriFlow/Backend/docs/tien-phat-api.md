# API tiền phạt — TASK-014

> Cập nhật TASK-018 (2026-11-07): Integration đã kiểm tra thiếu rule trả 404, reader 403 và không tạo tiền/phạt; payment không tồn tại 404. Thành công tạo/trùng/thanh toán chưa chạy MySQL vì chưa có mức phạt được cung cấp, không tự đặt cấu hình. Kết quả tổng thể 21/21 scenario thật và 172/172 unit tại [báo cáo bàn giao](backend-final-report.md). Các kết quả task trước bên dưới giữ lịch sử.

Xác minh: 2026-11-07. Nguồn: `sql/schema.sql`, `sql/seeds/initial-permissions.sql`, `src/{routes,controllers,services,models}/tien-phat.*.js`, `src/utils/{kiem-tra-tien-phat,quy-tac-tien-phat}.js`. Chỉ phát triển cục bộ; không ghi MySQL chính trong task.

## Schema và điều kiện sử dụng

`Phat`: fine_id PK, borrow_detail_id FK bắt buộc tới ChiTietPhieuMuon (RESTRICT), fine_rule_id FK nullable tới QuyDinhPhat (SET NULL), fine_type late/damage/lost/other, amount DECIMAL(12,2) CHECK >= 0, reason VARCHAR(255), assessed_at, payment_status unpaid/paid/waived, paid_at nullable. Không có UNIQUE theo chi tiết/loại phạt, không có cột người thu, tiền tệ hoặc lịch sử thanh toán.

`QuyDinhPhat`: fine_rule_id PK, rule_type late/damage/lost, amount DECIMAL(12,2) CHECK >= 0, unit per_day/fixed, is_active. Nhiều quy định cùng loại có thể tồn tại; API bắt buộc nhận ID quy định cụ thể, không tự chọn theo thứ tự ID hoặc đặt mức tiền mặc định.

SELECT metadata/quyền/cấu hình thực tế ngày 2026-11-07 xác nhận các cột/ENUM trên, `fine_manage` cho admin/librarian; **bảng QuyDinhPhat đang trống**. Tạo phạt chưa thể dùng với dữ liệu thật khi chưa cấu hình. Task không thêm quy định hoặc chạy seed/migration.

## Quy tắc nghiệp vụ được triển khai

Đây là chính sách API của TASK-014 theo yêu cầu xác định quy tắc đơn giản; schema chỉ cung cấp các trường lưu trữ, không định nghĩa sẵn công thức. Chưa coi đây là chính sách tài chính đã kiểm chứng vận hành.

- Chỉ chốt phạt cho chi tiết `returned` có returned_at, phiếu `partially_returned` hoặc `returned`. Hạn trả phải sau ngày mượn; ngày trả từ ngày mượn đến giờ UTC hiện tại. Chi tiết đang mượn chưa được chốt phạt để tránh thu thiếu khi thời gian trễ tiếp tục tăng.
- `late/per_day`: số ngày = ceil(số giây từ due_date đến returned_at / 86400). Trễ 1 giây tính 1 ngày; đúng hạn hoặc sớm không phạt. Tiền = số ngày × amount của quy định đang active.
- `late/fixed`: một lần amount nếu trả trễ. `damage/fixed`: một lần amount nếu condition_before=good và condition_after=damaged sau khi trả. Có thể có một khoản late và một khoản damage trên cùng chi tiết.
- Chưa triển khai tạo `lost`, `other`, damage/per_day, miễn/giảm, hoàn tiền hoặc thanh toán một phần. Rule lost/damage-per_day trả 409; client gửi fine_type/amount trả 400. Các khoản legacy lost/other/waived vẫn có thể được đọc; khoản unpaid hợp lệ có thể được nhân viên ghi nhận thanh toán.
- Tiền tính bằng số nguyên đơn vị nhỏ nhất với BigInt, trả chuỗi thập phân 2 chữ số; không dùng phép nhân số thực. Chặn số âm/cấu hình sai và vượt 9.999.999.999,99 (giới hạn DECIMAL, không phải mức phạt). Giá trị 0 được phép theo CHECK. Schema chưa quy định đơn vị tiền; phải thống nhất khi cấu hình, API không tự suy đoán.
- Một khoản cho mỗi `(borrow_detail_id, fine_type)`, kể cả khoản đã paid/waived và kể cả chọn rule khác. Không tự cộng dồn, thay thế hoặc sửa khoản cũ.
- Không tự tạo phạt khi trả sách; `POST /api/borrows/:id/return` và transaction cũ giữ nguyên. Không cron, không cập nhật overdue trong GET.

Mốc thời gian mới của API dùng UTC DATETIME, định dạng response `YYYY-MM-DD HH:mm:ss`. Timezone dữ liệu legacy **Chưa xác minh**; cần đối chiếu trước khi thu phạt từ dữ liệu legacy, không tự chuyển múi giờ hoặc chỉnh ngày cũ.

## Endpoint và RBAC

Tất cả yêu cầu Bearer JWT; middleware tải lại tài khoản active và quyền từ MySQL mỗi request. Không có bypass theo tên role.

| Endpoint | Quyền/phạm vi |
| --- | --- |
| GET /api/fines (cả dấu / cuối) | fine_manage đọc toàn bộ; reader không có quyền quản lý chỉ đọc của mình |
| GET /api/fines/:id | Tương tự; ID của người khác trả 404 |
| POST /api/fines | fine_manage |
| PATCH /api/fines/:id/payment | fine_manage |

List: page mặc định 1, limit mặc định 10/tối đa 100; lọc borrow_id, borrow_detail_id, fine_type, payment_status; user_id chỉ cho người có fine_manage. Reader gửi user_id kể cả của mình trả 403. SQL JOIN tới PhieuMuon và WHERE user_id từ JWT trước COUNT/list/detail; không JOIN email, tên hoặc mật khẩu.

## Postman

Base URL `http://127.0.0.1:3000`; Authorization → Bearer Token từ login. Ví dụ ID dưới đây là minh họa, phải thay bằng fixture của **database test độc lập**. Không thử ghi trên DB chính. Xem `kiem-thu-tich-hop.md` để chuẩn bị môi trường an toàn; chưa có scenario MySQL thật cho module phạt.

1. Reader: `GET {{baseUrl}}/api/fines?page=1&limit=10&payment_status=unpaid`.
2. Admin/librarian có fine_manage: `POST {{baseUrl}}/api/fines`, Content-Type application/json:

```json
{"borrow_detail_id":"11","fine_rule_id":"2","reason":"Ghi nhận trả trễ"}
```

Ví dụ response sau khi quy định hợp lệ đã được cấu hình: late/per_day=1.25 và trễ 86401 giây (mức tiền chỉ minh họa):

```json
{"success":true,"data":{"fine_id":"5","borrow_detail_id":"11","fine_rule_id":"2","fine_type":"late","amount":"2.50","reason":"Ghi nhận trả trễ","assessed_at":"2026-11-07 00:00:00","payment_status":"unpaid","paid_at":null,"borrow_id":"1","copy_id":"21","user_id":"30"}}
```

HTTP 201 + Location `/api/fines/5`. Gửi lại cùng vi phạm: 409 DUPLICATE_FINE. Không gửi amount, fine_type, payment_status, paid_at, assessed_at hoặc user_id trong request tạo.

3. `PATCH {{baseUrl}}/api/fines/5/payment`:

```json
{"payment_status":"paid"}
```

HTTP 200, payment_status=paid, paid_at do server đặt. Đây là **ghi nhận nhân viên đã thu tiền**, không phải cổng thanh toán hay bằng chứng chuyển khoản. Gửi lại: 409 FINE_NOT_PAYABLE; không nhận waived, thời điểm hoặc số tiền client tự khai báo.

## Transaction và lỗi

Tạo phạt: transaction đọc borrow_id → khóa header FOR SHARE → khóa detail FOR UPDATE → khóa rule FOR SHARE → tính tiền → locking read kiểm tra trùng → INSERT Phat → đọc kết quả → commit. Lỗi ở bất kỳ bước nào rollback và release. Không UPDATE/DELETE lịch sử mượn hoặc bản sao. Header dùng khóa chia sẻ; SELECT khóa detail không JOIN khóa nâng cấp header, tránh hai người lập phạt cùng phiếu cùng nâng khóa header.

Thanh toán: khóa Phat FOR UPDATE; chỉ unpaid + paid_at NULL chuyển paid, ghi UTC_TIMESTAMP trong cùng transaction. Request đồng thời cùng khoản chỉ được ghi nhận một lần.

| HTTP | Trường hợp |
| --- | --- |
| 400 | Body/query/ID sai, trường không cho phép, FK không hợp lệ |
| 401 | Thiếu JWT/không hợp lệ hoặc tài khoản không còn active |
| 403 | Không có fine_manage để ghi hoặc không có phạm vi đọc |
| 404 | Chi tiết, rule, khoản phạt không tồn tại hoặc bị giới hạn ownership |
| 409 | Chưa trả/không trễ/chưa xác nhận hỏng, rule inactive/không hỗ trợ, tiền vượt phạm vi, trùng khoản, thanh toán lặp hoặc waived |
| 503 | DB không sẵn sàng, deadlock/timeout; toàn transaction rollback, có thể thử lại |

Phản hồi lỗi JSON thống nhất, không trả SQL/stack/secret. Schema **không** có UNIQUE chống phạt trùng; bảo đảm chỉ đúng khi mọi writer khóa detail theo quy ước này. Script bên ngoài không theo khóa vẫn có thể tạo trùng; không tự sửa schema trong task. Quy định được khóa khi tính nhưng schema chưa lưu snapshot toàn bộ rule/người thu/audit; amount Phat đã chốt vẫn giữ nguyên nếu rule đổi sau này.

## Kiểm thử và giới hạn

`npm.cmd test`: mock HTTP/model/transaction; test công thức làm tròn/tiền chính xác, thiếu rule, trùng phạt, phân quyền/ownership, rollback, thanh toán lặp và cạnh tranh mô phỏng. 6 truy vấn SELECT của hai module được probe cú pháp trên MySQL với WHERE 1=0, không trả dữ liệu nghiệp vụ. **Chưa kiểm thử INSERT/UPDATE, khóa/rollback/cạnh tranh thật hoặc quy trình thu tiền trên MySQL độc lập**. Không coi mock là kiểm chứng InnoDB.
