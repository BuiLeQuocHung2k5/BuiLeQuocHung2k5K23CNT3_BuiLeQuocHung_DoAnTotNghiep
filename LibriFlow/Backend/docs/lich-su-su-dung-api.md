# Lịch sử sử dụng — TASK-015

> Cập nhật TASK-018 (2026-11-07): Login/mượn/trả, event theo copy, rollback event cùng header và GET không ghi đã kiểm chứng MySQL độc lập; reader scope và truy vấn user_id trái quyền bị chặn. Kết quả tổng thể 21/21 scenario thật và 172/172 unit tại [báo cáo bàn giao](backend-final-report.md). Các kết quả task trước bên dưới giữ lịch sử.

Xác minh 2026-11-07. Nguồn: `sql/schema.sql`, `src/{routes,controllers,services,models}/lich-su-su-dung.*.js`, `utils/kiem-tra-thong-ke.js`, `models/{xac-thuc,phieu-muon}.model.js`, `services/xac-thuc.service.js`.

## Schema và sự kiện

LichSuSuDung có usage_id PK, user_id bắt buộc FK NguoiDung (DELETE CASCADE), copy_id nullable FK BanSaoSach (DELETE SET NULL), action_type VARCHAR(50), action_date DATETIME, details JSON nullable. Có chỉ mục (user_id,action_date) và (action_type,action_date); không có cột actor, visit_id, request_id hoặc FK trực tiếp tới phiếu mượn.

Schema không có ENUM sự kiện. TASK-015 định nghĩa ba giá trị ứng dụng dưới đây; không sửa bảng/seed:

| action_type | user_id | copy_id | Thời điểm ghi |
| --- | --- | --- | --- |
| login | Người đăng nhập | NULL | Sau khi mật khẩu/trạng thái hợp lệ và JWT đã ký thành công, trước khi trả token |
| borrow | Người mượn trên phiếu | Mỗi bản sao mượn thành công | Cùng transaction tạo phiếu/detail/cập nhật bản sao |
| return | Người mượn trên phiếu | Mỗi bản sao vừa trả | Cùng transaction trả detail/bản sao/header |

Nhân viên lập/trả hộ không trở thành người dùng của sự kiện; không suy diễn đây là nhật ký thao tác của nhân viên. JSON chỉ do service tạo: source=`libriflow-api`, version=1, thêm borrow_id cho borrow/return. Không nhận JSON tùy ý, mật khẩu, JWT, email, IP, ghi chú hoặc thời gian client. borrow_id trong JSON chỉ là tham chiếu, không có FK mới.

Lỗi ghi event làm rollback toàn bộ mượn/trả, gồm event trước đó trong cùng batch. Trả một phần chỉ tạo event cho phần vừa trả; trả lặp/thao tác thất bại không tạo event. Login dùng một INSERT độc lập, nếu INSERT lỗi thì request thất bại và không trả token. Không bắt lỗi rồi bỏ qua lịch sử, không retry ghi tự động. Không ghi event cho register, logout, GET/me, health, đọc sách hoặc thống kê.

Ghi nhận server chấp nhận thao tác, không chứng minh client nhận được response khi mất kết nối. Schema chưa có idempotency key cho event hoặc audit bất biến; đăng nhập thành công lặp là nhiều lần chấp nhận đăng nhập hợp lệ. Xóa user có thể cascade mất lịch sử, xóa copy có thể NULL copy_id; các API hiện tại không tự xóa lịch sử.

## API và phân quyền

| Endpoint | Phạm vi |
| --- | --- |
| GET /api/usage-history | report_view: toàn bộ/lọc user; reader không có report_view: chỉ own |
| GET /api/usage-history/me | Mọi tài khoản active đã xác thực: luôn own từ JWT, kể cả admin |

JWT bắt buộc; middleware hiện tại tải lại trạng thái tài khoản và quyền từ DB. Không bypass theo tên admin/librarian. Seed và SELECT thực tế xác nhận report_view cho admin/librarian. Vai trò khác không có report_view chỉ dùng /me; không tự tạo quyền mới.

Query: page=1, limit=10 (max 100), start_date/end_date UTC YYYY-MM-DD (mặc định 30 ngày kết thúc hôm nay, tối đa 366 ngày tính cả hai đầu), action_type=login/borrow/return. user_id chỉ được dùng khi đọc toàn bộ bằng report_view; gửi user_id tại /me hoặc khi reader đọc own trả 403, kể cả chính ID của mình.

SQL dùng `[start_date 00:00:00, ngày sau end_date 00:00:00)` và WHERE user_id trước COUNT/page. API chỉ liệt kê ba action_type đã hỗ trợ; sự kiện legacy khác chưa có hợp đồng được loại trừ. **Không SELECT/response details JSON** hoặc JOIN hồ sơ cá nhân; JSON legacy có thể chứa nội dung chưa được kiểm tra. Timestamp hiển thị UTC với các bản ghi mới của API; timezone legacy chưa xác minh.

## Postman

Authorization → Bearer Token. Ví dụ dưới đây là fixture minh họa, không phải dữ liệu thật:

`GET {{baseUrl}}/api/usage-history/me?start_date=2026-11-01&end_date=2026-11-07&action_type=borrow&page=1&limit=10`

```json
{"success":true,"data":[{"usage_id":"1","user_id":"30","copy_id":"21","action_type":"borrow","action_date":"2026-11-01 09:00:00"}],"pagination":{"page":1,"limit":10,"total":1,"totalPages":1},"period":{"start_date":"2026-11-01","end_date":"2026-11-07","timezone":"UTC"}}
```

Admin/librarian có quyền: `GET {{baseUrl}}/api/usage-history?start_date=2026-11-01&end_date=2026-11-07&user_id=30`.

200 danh sách (rỗng hợp lệ), 400 query/ngày/phân trang sai, 401 thiếu/sai token, 403 ngoài phạm vi/quyền hoặc tài khoản inactive theo middleware hiện tại, 503 khi DB không sẵn sàng. Không có POST ghi lịch sử công khai. Response hợp lệ có Cache-Control: no-store.

## Kiểm thử và giới hạn

`test/lich-su-thong-ke.test.js`: ghi đúng schema/connection, validation/chặn JSON tùy ý, login thành công/thất bại/ký token lỗi, scope, mượn nhiều copy, trả từng phần/trả hết/trả lặp, rollback dữ liệu và lịch sử khi event thứ hai lỗi. Giữ các test trước và cập nhật fixture auth/borrow để chấp nhận INSERT mới thay vì bỏ qua logging.

Chỉ ghi trên mock. Chưa xác minh INSERT/commit/rollback/concurrency với MySQL test độc lập. Không backfill lịch sử cũ; thiếu event trước TASK-015 không đồng nghĩa không hoạt động. COUNT/page là hai SELECT nên có thể khác snapshot khi dữ liệu mới được ghi đồng thời. Xem `thiet-ke-du-lieu-du-bao.md` trước khi dùng số ngày hoạt động.
