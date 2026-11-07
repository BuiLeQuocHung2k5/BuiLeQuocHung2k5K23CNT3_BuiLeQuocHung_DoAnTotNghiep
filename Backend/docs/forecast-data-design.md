# Dữ liệu đầu vào dự báo tần suất — TASK-015

Ngày thiết kế/xác minh source: 2026-11-07. Đây là hợp đồng dữ liệu đề xuất cho bước dự báo sau; chưa có mô hình, job, dữ liệu dự báo hoặc ghi DuBaoTanSuat.

## Đơn vị đo

Chọn mục tiêu chính **số phiếu mượn hợp lệ / người dùng / ngày UTC** (`borrow_receipts_per_user_per_day`). Nguồn là PhieuMuon: đếm borrow_id theo user_id và borrow_date, loại status=cancelled. Một phiếu 3 bản sao là **1 lượt mượn**, không phải 3; trả hoặc trả từng phần không giảm số lượt đã mượn. Định nghĩa này có thể tính từ nguồn nghiệp vụ dù chưa có usage logging; chất lượng ngày legacy vẫn cần xác minh.

Chỉ số phụ: số bản sao mượn/trả, số lần đăng nhập thành công, số ngày hoạt động. active_days là số ngày có event login/borrow/return source=libriflow-api/version=1; không phải số lần đến thư viện. Nhân viên thao tác hộ ghi hoạt động mượn/trả cho người mượn, không thể dùng bảng này làm audit người xử lý. Đăng nhập và mượn cùng ngày không cộng thành hai ngày hoạt động.

## Lược đồ đầu vào dự kiến

| Trường | Nguồn/ý nghĩa |
| --- | --- |
| user_id | ID nội bộ; không cần tên/email/điện thoại/password |
| period_start | Ngày UTC bắt đầu bucket |
| borrow_count | Số phiếu không cancelled trong bucket — mục tiêu chính |
| borrowed_copy_count | Số ChiTietPhieuMuon của các phiếu trong bucket |
| active_days | Ngày có event đã xác định hợp đồng trong bucket |
| login_count, return_copy_events | Chỉ số phụ, chỉ khi xác minh độ phủ ghi nhận |
| coverage/definition_version | Metadata của pipeline tương lai, không tự thêm cột SQL |

DuBaoTanSuat hiện chỉ có user_id, forecast_date, predicted_count DECIMAL(12,2), model_version, created_at và khóa/check trong schema. Không có cột đơn vị đo, kỳ tổng hợp, coverage hoặc tập huấn luyện. Vì vậy việc lưu dự báo cần quyết định hợp đồng phiên bản/mục tiêu trước; task này không suy đoán ý nghĩa predicted_count, thêm schema hoặc ghi số giả.

## Tổng hợp ngày, tuần, tháng

- Ngày: DATE(borrow_date) UTC; lấy `GET /api/statistics/borrows?user_id=...&group_by=day` với report_view.
- Tuần: cộng theo thứ Hai bắt đầu tuần; group_by=week trả ngày thứ Hai. active_days là số ngày khác nhau trong tuần, tối đa 7, không phải tổng số event.
- Tháng: nhóm theo YYYY-MM; group_by=month. active_days tối đa số ngày thực trong tháng. Không so sánh trực tiếp count các tháng dài ngắn khác nhau khi chưa chuẩn hóa exposure.

API range tối đa 366 ngày/request, tính cả start/end; bucket biên có thể thiếu ngày. Người vận hành phải chọn range trùng biên bucket hoặc đánh dấu kỳ chưa đủ dữ liệu. `/statistics/users` chỉ trả tổng trong range và người có hoạt động, không phải ma trận user × mọi ngày. Pipeline tương lai có thể chia range thành các đoạn không chồng lặp và lấy danh sách user được phép từ nguồn quản trị đã xác minh; chưa có export tự động trong task này.

API chỉ trả bucket có bản ghi. Khi dựng chuỗi huấn luyện, chỉ điền 0 cho ngày **đã xác minh nguồn dữ liệu hoạt động đầy đủ** mà không có phiếu. Không coi thiếu log trước khi triển khai TASK-015, sự cố logging, user chưa tồn tại hoặc dữ liệu bị xóa là hoạt động bằng 0. Việc reindex lịch thật và đếm 0 đã xác minh là tổng hợp dữ liệu, khác tạo lượt mượn hay dự báo giả. Hiện chưa có metadata coverage tự động nên không tự xây chuỗi đầy đủ.

## Chất lượng, riêng tư và giới hạn

1. Timestamp mới dùng UTC DATETIME; timezone phiếu/log legacy **Chưa xác minh**. Không trộn múi giờ hoặc backfill tùy ý.
2. Usage chỉ ghi thao tác thành công; mượn/trả cùng transaction, ghi lỗi rollback. Login không cho token khi lưu event thất bại. GET không tạo event nên kiểm thử đọc không làm tăng tần suất.
3. Event source/version giúp phân loại hợp đồng, không phải chữ ký chống giả mạo. JSON borrow_id không có FK, không thay nguồn PhieuMuon khi tính target; không cộng đồng thời borrow event và phiếu thành hai lượt.
4. LichSuSuDung có user FK CASCADE, copy FK SET NULL; không phải sổ lịch sử bất biến. Không có sự kiện vào/ra thư viện, thời lượng phiên, lượt xem đáng tin hoặc chống trùng request toàn cục; chưa hỗ trợ dự báo số lượt hiện diện vật lý.
5. Không dùng dữ liệu tương lai để tạo đặc trưng tại ngày dự báo. Chốt ngày cắt, giữ định nghĩa/kỳ tổng hợp, tách tập theo thời gian; đặc trưng trả sách chỉ được dùng khi đã quan sát trước ngày cắt. Những bước này mới là thiết kế, chưa triển khai thuật toán.
6. Chỉ report_view truy cập thống kê quản trị, reader chỉ lịch sử own. Dữ liệu mô hình chỉ nên chứa ID nội bộ và count cần thiết; không xuất token, hash, thông tin liên hệ hoặc JSON legacy tùy ý.

Kiểm thử hiện có là mock/SELECT rỗng trên MySQL chính; chưa có bộ dữ liệu integration độc lập hoặc đủ lịch sử để kết luận chất lượng dự báo. Xem `statistics-api.md`, `usage-history-api.md`, `integration-tests.md`.
