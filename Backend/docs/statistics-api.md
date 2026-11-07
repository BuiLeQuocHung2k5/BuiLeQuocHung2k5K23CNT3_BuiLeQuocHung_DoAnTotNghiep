# API thống kê — TASK-015

Xác minh 2026-11-07. Nguồn: `src/{routes,controllers,services,models}/statistics.*.js`, `utils/analytics-validation.js`, `sql/schema.sql`, seed phân quyền. Truy vấn SELECT MySQL bằng pool được tiêm; không số liệu mẫu hoặc fallback dữ liệu khi DB lỗi.

## Quyền và khoảng thời gian

JWT + **report_view** cho mọi endpoint. SELECT role-permission thực tế và seed xác nhận admin/librarian có quyền; reader hoặc role admin không có grant trả 403. forecast_view không thay report_view. Không thêm/cấp quyền, không JOIN/response tên, email, điện thoại, mật khẩu. /users chỉ trả user_id và chỉ số quản trị. Response hợp lệ Cache-Control: no-store.

start_date/end_date là ngày UTC YYYY-MM-DD, tính cả hai đầu; mặc định 30 ngày kết thúc hôm nay; tối đa 366 ngày, ngày phải tồn tại/thứ tự tăng dần. SQL lọc `>= start 00:00:00` và `< ngày sau end 00:00:00`. Không nhận SQL/grouping tùy ý. Tất cả endpoint chỉ đọc, không ghi sự kiện sử dụng.

## GET /api/statistics/overview

Không nhận query ngoài hai ngày. Một SELECT với các subquery trả:

| Chỉ số | Cách tính |
| --- | --- |
| books_total | Số đầu sách Sach hiện tại |
| copies_total | Số bản sao hiện tại, mọi trạng thái |
| users_total | Số người dùng hiện tại, mọi vai trò/trạng thái |
| borrows_total | Tổng phiếu PhieuMuon không cancelled, mọi thời gian |
| borrows_in_period | Phiếu không cancelled có borrow_date trong khoảng |
| borrowed_copies_in_period | Số chi tiết của các phiếu trên, gồm bản sao đã trả |
| returned_copies_in_period | Chi tiết status=returned có returned_at trong khoảng |

Tổng tồn kho/người dùng là số hiện tại, **không phải snapshot lịch sử tại end_date**. Số trả theo ngày trả, độc lập với khoảng ngày mượn; không trừ lượt mượn khi trả sách. COUNT trả 0 khi bảng rỗng.

## GET /api/statistics/borrows

Thêm group_by=day/week/month (mặc định day), user_id tùy chọn cho staff lọc một người. Trả period_start, borrow_count và borrowed_copy_count. GROUP theo borrow_date UTC; đếm DISTINCT borrow_id để phiếu nhiều bản sao chỉ là một lượt; đếm detail riêng cho số bản sao. Loại cancelled. Phiếu legacy không có detail vẫn đếm một phiếu và 0 bản sao, chưa sửa dữ liệu đó.

Day: YYYY-MM-DD; week: ngày thứ Hai YYYY-MM-DD; month: YYYY-MM. Chỉ trả bucket có dữ liệu, không chèn ngày/tuần trống giả. Bucket đầu/cuối có thể chỉ chứa một phần tuần/tháng nếu range không trùng biên. SQL LIMIT 400 cộng giới hạn 366 ngày chặn kết quả quá lớn. Chưa có pagination cho series đã giới hạn này.

## GET /api/statistics/users

Thêm page=1, limit=10 (max 100), user_id tùy chọn. Chỉ liệt kê người có phiếu không cancelled trong khoảng **hoặc** event có cấu trúc được module mới hỗ trợ trong khoảng. Người không phát sinh hoạt động không xuất hiện trong bảng này.

- borrow_count: số phiếu không cancelled từ PhieuMuon theo borrow_date; có thể gồm dữ liệu trước khi có usage logging.
- usage_event_count: số event login/borrow/return có JSON source=libriflow-api, version=1 trong LichSuSuDung.
- active_days: COUNT DISTINCT ngày UTC có các event trên; một ngày nhiều bản sao vẫn là một ngày hoạt động.
- login_count, borrow_copy_events, return_copy_events: số event từng loại; borrow_copy_events là số bản sao, khác borrow_count là số phiếu.

Tổng hợp phiếu và event riêng theo user trước khi JOIN, tránh nhân chéo số đếm. Không coi login là lượt đến thư viện vật lý. Bản ghi usage legacy thiếu source/version không đưa vào các chỉ số hoạt động, tránh gộp dữ liệu chưa rõ hợp đồng. COUNT/page thực thi riêng nên có thể lệch snapshot khi phát sinh ghi đồng thời. Các count vượt số nguyên an toàn JS bị từ chối thay vì làm tròn.

## Postman và lỗi

`GET {{baseUrl}}/api/statistics/overview?start_date=2026-11-01&end_date=2026-11-03`

Ví dụ fixture minh họa, không phải dữ liệu thật:

```json
{"success":true,"data":{"books_total":2,"copies_total":3,"users_total":2,"borrows_total":2,"borrows_in_period":2,"borrowed_copies_in_period":3,"returned_copies_in_period":1},"period":{"start_date":"2026-11-01","end_date":"2026-11-03","timezone":"UTC"}}
```

`GET {{baseUrl}}/api/statistics/borrows?start_date=2026-11-01&end_date=2026-11-03&group_by=day&user_id=30`

```json
{"success":true,"data":[{"period_start":"2026-11-01","borrow_count":2,"borrowed_copy_count":3}],"period":{"start_date":"2026-11-01","end_date":"2026-11-03","timezone":"UTC","group_by":"day"}}
```

`GET {{baseUrl}}/api/statistics/users?start_date=2026-11-01&end_date=2026-11-03&page=1&limit=10`

```json
{"success":true,"data":[{"user_id":"30","borrow_count":2,"usage_event_count":4,"active_days":1,"login_count":1,"borrow_copy_events":2,"return_copy_events":1}],"pagination":{"page":1,"limit":10,"total":1,"totalPages":1},"period":{"start_date":"2026-11-01","end_date":"2026-11-03","timezone":"UTC"}}
```

Authorization → Bearer Token từ môi trường test độc lập. Đăng nhập thành công giờ ghi usage nên không thử đăng nhập trên DB chính để smoke test. 400 ngày/group/page/query sai; 401 token thiếu/sai; 403 thiếu report_view; 503 DB lỗi. Không POST thống kê, không ghi DuBaoTanSuat hoặc NhatKyHeThong.

## Kết quả kiểm tra

Mock có số đếm biết trước: 2 phiếu/3 bản sao, nhiều event cùng một ngày, bảng rỗng, range/phân trang/RBAC/privacy. Ngày 2026-11-07 đã chạy SELECT overview và borrow-series trên MySQL thực tế: các count 0, series rỗng; đây là kết quả thật tại thời điểm đọc, không phải fallback. 7 query khác được probe SELECT derived table WHERE 1=0 để kiểm tra cú pháp mà không trả bản ghi nghiệp vụ.

Chưa kiểm chứng bộ số đếm có dữ liệu khác 0, tải lớn, snapshot đồng thời hoặc các luồng ghi bằng MySQL test độc lập. Không sửa schema/chỉ mục; cần EXPLAIN và kiểm thử độc lập trước tối ưu. Timezone dữ liệu legacy chưa xác minh.
