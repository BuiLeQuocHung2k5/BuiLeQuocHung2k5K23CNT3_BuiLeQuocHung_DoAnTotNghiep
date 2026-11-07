# API quá hạn — TASK-014

> Cập nhật TASK-018 (2026-11-07): Summary quá hạn đã kiểm chứng MySQL độc lập bằng fixture của run và SELECT xác nhận GET không UPDATE trạng thái. List/biên thời gian khác vẫn theo unit, chưa kiểm chứng mọi nhánh thật. Kết quả tổng thể 21/21 scenario thật và 172/172 unit tại [báo cáo bàn giao](backend-final-report.md). Các kết quả task trước bên dưới giữ lịch sử.

Xác minh: 2026-11-07. Nguồn: `sql/schema.sql`, `src/{routes,controllers,services,models}/qua-han.*.js`, `utils/kiem-tra-tien-phat.js`. Endpoint chỉ SELECT; không đánh dấu status=overdue trong database, không tạo tiền phạt hoặc chạy cron.

## Cách xác định

Một **chi tiết đang quá hạn** khi đủ mọi điều kiện:

- PhieuMuon.status thuộc borrowed/partially_returned/overdue.
- ChiTietPhieuMuon.status=borrowed và returned_at IS NULL.
- PhieuMuon.due_date < giờ UTC thực tế của MySQL.

Không dựa riêng vào status=overdue. Phiếu chưa đến hạn, đã trả toàn bộ hoặc cancelled không thuộc danh sách hiện tại. Trả một phần chỉ đếm phần còn borrowed/chưa trả. Chi tiết lost, dữ liệu bất nhất hoặc đã trả trễ không nằm trong danh sách đang quá hạn; khoản phạt sau trả được xử lý riêng trong `tien-phat-api.md`. API này không thay thế công cụ kiểm toán dữ liệu legacy.

`days_overdue = ceil(số giây quá hạn / 86400)`, tại thời điểm `as_of` do MySQL cung cấp, cùng một mốc cho count và page. Đúng hạn không quá hạn; trễ 1 giây thành 1 ngày. Đây là số ngày hiển thị, **không phải số tiền**. Không nhận thời gian từ client. Dùng UTC DATETIME như module mượn/trả; timezone dữ liệu legacy **Chưa xác minh**, phải đối chiếu trước vận hành.

## Endpoint và quyền

| Endpoint | Kết quả |
| --- | --- |
| GET /api/overdues | Danh sách chi tiết đang quá hạn, phân trang |
| GET /api/borrows/:id/overdue | Tóm tắt một phiếu: is_overdue, overdue_count, các chi tiết đang quá hạn |

Tất cả yêu cầu JWT. Người có `borrow_manage` đọc toàn bộ; reader không có quyền quản lý chỉ đọc của mình. SQL áp dụng WHERE p.user_id từ JWT trước trả dữ liệu. Chỉ có tên role admin không cấp quyền; fine_manage cũng không tự cấp borrow_manage. Tài khoản bị khóa bị middleware hiện tại từ chối.

List nhận page (1), limit (10, tối đa 100), borrow_id; staff có borrow_manage được lọc thêm user_id. Reader gửi user_id trả 403. Không hỗ trợ search/status hoặc query thời gian. Endpoint tóm tắt không nhận query; phiếu của người khác hoặc không tồn tại trả 404 như nhau.

## Ví dụ Postman

Authorization → Bearer Token từ login. Dữ liệu bên dưới chỉ minh họa trên fixture test, không phải dữ liệu MySQL chính.

`GET http://127.0.0.1:3000/api/overdues?page=1&limit=10`

```json
{"success":true,"data":[{"borrow_id":"1","user_id":"30","borrow_detail_id":"11","copy_id":"21","due_date":"2026-11-01 00:00:00","days_overdue":2}],"pagination":{"page":1,"limit":10,"total":1,"totalPages":1},"as_of":"2026-11-02 00:00:01"}
```

`GET http://127.0.0.1:3000/api/borrows/1/overdue`

```json
{"success":true,"data":{"borrow_id":"1","due_date":"2026-11-01 00:00:00","status":"partially_returned","as_of":"2026-11-02 00:00:01","is_overdue":true,"overdue_count":1,"details":[{"borrow_detail_id":"11","copy_id":"21","days_overdue":2}]}}
```

Phiếu đã trả hết: HTTP 200 với is_overdue=false, overdue_count=0, details=[]. Thiếu token 401; không có phạm vi đọc 403; query/ID sai 400; phiếu không tồn tại/ngoài phạm vi 404. Không JOIN hồ sơ/email/điện thoại/mật khẩu; không trả note phiếu hoặc chi tiết.

## Kiểm thử và giới hạn

`test/tien-phat-qua-han.test.js` dùng mock để kiểm tra chưa quá hạn, đang quá hạn, status overdue nhưng hạn tương lai, trả toàn bộ, trả một phần, reader ownership, SQL scope và chỉ SELECT. Truy vấn đọc thật đã probe với WHERE 1=0 để xác nhận cú pháp, không trả dữ liệu nghiệp vụ. Chưa kiểm thử các tình huống bằng dữ liệu thật trên MySQL test độc lập.

COUNT và page là hai SELECT độc lập; khi có người trả sách đồng thời, total và items có thể thay đổi giữa hai truy vấn dù dùng chung as_of. Endpoint tóm tắt dùng một SELECT JOIN cho header/details. Không có tác dụng phụ, không thay đổi transaction mượn/trả.
