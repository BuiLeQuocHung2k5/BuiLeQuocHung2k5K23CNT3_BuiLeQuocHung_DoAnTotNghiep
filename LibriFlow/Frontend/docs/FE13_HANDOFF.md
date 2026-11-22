# FE-13 — Thống kê và dự báo

Xác minh **2026-11-21**. Hoàn tất phần Frontend theo API hiện hữu, **dừng chờ nghiệm thu**. Không tự triển khai FE14; chưa kiểm chứng MySQL/browser end-to-end.

## Trang và quyền

- **/app/thong-ke**: guard/menu report_view. Bảy chỉ số thật từ overview, phân biệt tồn kho/tài khoản hiện tại và tổng phiếu mọi thời gian với số phiếu/bản sao mượn/trả trong kỳ. users_total là mọi tài khoản, không riêng độc giả; không tạo số đang mượn/quá hạn khi API chưa cung cấp.
- Lọc ngày UTC (tính cả hai đầu, tối đa 366 ngày), nhóm ngày/tuần/tháng và user_id chỉ cho chuỗi mượn. Bộ lọc user không áp dụng tồn kho/overview. Biểu đồ cột phiếu/bản sao cùng thang đo và bảng số liệu thật; không thêm bucket trống bằng số 0, tuần/tháng đầu-cuối có thể không đủ kỳ.
- **/app/du-bao**: guard/menu forecast_view. Mặc định xem của tôi, hoặc nhập ID thật để xem người khác; không giả lập danh sách người dùng. Trang Admin bổ sung hai lối tắt theo đúng report_view/forecast_view, không Admin bypass.
- Trạng thái loading/empty/error/retry, cấu hình thiếu và 401/403 theo FE06/FE05; không đổi phiên hoặc tự logout khi 403.

## API và khả năng dự báo

| GET /api/... | Quyền / contract dùng |
| --- | --- |
| statistics/overview | report_view; start_date/end_date; 7 count + period UTC. |
| statistics/borrows | report_view; thêm group_by=day/week/month và user_id; period_start/borrow_count/borrowed_copy_count. |
| forecasts/me | JWT ở Backend; trang FE13 yêu cầu forecast_view, trả preview của chính phiên. |
| forecasts/users/:id | forecast_view; preview người được chọn, không nhận query thời gian/coverage/mô hình. |

Nguồn: Backend [statistics model](../../Backend/src/models/thong-ke.model.js), [validation](../../Backend/src/utils/kiem-tra-thong-ke.js), [forecast controller](../../Backend/src/controllers/du-bao.controller.js), [service](../../Backend/src/services/du-bao.service.js), [thuật toán](../../Backend/src/utils/thuat-toan-du-bao.js), [contract](../../Backend/docs/du-bao-api.md).

- Backend SMA7 borrow_daily_sma7_v1 dự báo **số phiếu không hủy/người/ngày**, không lượt đến thư viện hoặc số bản sao. training có 7 ngày hoàn chỉnh trước cutoff; bỏ ngày cutoff chưa kết thúc, dự báo D+1 đến D+7. Frontend chỉ vẽ 7 giá trị Backend trả, không tính/huấn luyện mô hình.
- Khi ready: hiển thị cutoff/training/tổng phiếu, bảng dự báo, biểu đồ đường đứt nét. Có thêm report_view thì lấy lịch sử thật theo ngày từ statistics/borrows với cùng user_id/khoảng training; đường lịch sử riêng, không nối qua ngày thiếu hoặc nối sang dự báo. Thiếu quyền/lỗi lịch sử thì giữ dự báo và thông báo, không chế lịch sử.
- insufficient_data là dữ liệu HTTP200 chưa đủ điều kiện: giải thích lý do coverage/lịch sử/tài khoản, không vẽ dự báo 0. Giá trị âm/NaN/định dạng sai bị từ chối, không âm thầm clamp.
- MAE và sample_count chỉ hiện nếu evaluation=evaluated; null/insufficient không biến thành MAE0 hay phần trăm chính xác. Không cam kết dự báo đúng. API không có timestamp cập nhật riêng nên chỉ hiển thị cutoff.
- **POST forecasts/users/:id/generate luôn bị Backend chặn 503**; không gọi POST, không nút tạo/lưu, kết quả persisted=false. Ready/coverage/MAE thật phụ thuộc cấu hình và dữ liệu Backend, chưa được xác minh trong FE13.

## File và kiểm tra

- Tạo src/chuc-nang/phan-tich/{TrangThongKe,TrangDuBao}.jsx, dich-vu-phan-tich.js, phan-tich.test.jsx và src/kieu-dang/phan-tich.css. Biểu đồ HTML/SVG nhỏ, kèm bảng, không chart framework/dependency mới.
- Sửa route config/DinhTuyenKhung và TrangAdmin.jsx: dùng chung service overview, thêm lối tắt; không viết lại Admin. Fixture overview FE12 được bổ sung đủ 7 count + period theo contract, giữ assertion/bảo mật. Tạo tài liệu này, cập nhật TASKS/HANDOFF.
- **302/302 tests tại 20 file**, 0 fail/skip; baseline tham chiếu296, thêm6 mock tests. Lượt targeted đầu 5/6 do giữ tham chiếu bảng đã unmount sau lọc; đã chờ cell trên DOM hiện tại, giữ kiểm params/dữ liệu. Full suite cuối đạt.
- Lệnh từ Frontend: npm.cmd run test:run -- --maxWorkers=1; npm.cmd run lint; npm.cmd run build -- --logLevel=warn. Tất cả đạt. Mock ready/insufficient/negative chỉ trong .test, không runtime.
- 3 production SPA shells (thống kê/dự báo/Admin) trả 200; preview đóng. Không coi shell HTTP là UI hoặc API/guard E2E.
- Chưa kiểm browser/resize/AT/đồ thị thực hoặc số liệu MySQL/ready/MAE thật: browser host/native pipe unavailable, TCP3000 không mở, chưa có dev account được bàn giao. Không tạo account, fixture hoặc coverage để ép ready.
- 107 Backend giữ SHA-256; không đổi DB/schema/API/env/package/Auth/Authorization hoặc các nghiệp vụ FE08–11. Giữ HEAD/index và thay đổi trước task, không stage/commit/push. FE12 CRUD người dùng vẫn bị chặn bởi API riêng.

Tiếp theo: nghiệm thu giao diện; FE14 chỉ theo task mới để cấp môi trường dev/MySQL cô lập và kiểm dữ liệu/độ phủ/phân quyền thực. Không tự mở cổng generate hoặc tạo dự báo giả.
