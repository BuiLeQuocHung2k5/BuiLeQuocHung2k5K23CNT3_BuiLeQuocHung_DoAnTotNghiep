# API dự báo tần suất — TASK-016

> Cập nhật TASK-018 (2026-11-07): Đã kiểm chứng MySQL riêng trả insufficient_data và generate 503, không lưu DuBaoTanSuat. Ready/coverage/MAE thực và persistence chưa xác minh/triển khai; không mở cổng generate. Kết quả tổng thể 21/21 scenario thật và 172/172 unit tại [báo cáo bàn giao](backend-final-report.md). Các kết quả task trước bên dưới giữ lịch sử.

Xác minh 2026-11-07. Nguồn: `src/{routes,controllers,services,models}/du-bao.*.js`, `utils/thuat-toan-du-bao.js`, `config/do-phu-du-bao.js`; công thức và coverage tại [thuat-toan-du-bao.md](thuat-toan-du-bao.md).

## Endpoint và quyền

| Endpoint | Hành vi hiện tại |
| --- | --- |
| GET /api/forecasts/me | JWT + tài khoản active; luôn tính preview cho user_id từ JWT |
| GET /api/forecasts/users/:id | JWT + forecast_view; tính preview cho ID được yêu cầu |
| POST /api/forecasts/users/:id/generate | JWT + forecast_view trước cổng kiểm tra; **luôn 503** do chưa có quyền tạo/lưu được phê duyệt |

Seed và SELECT thực tế xác nhận forecast_view cho admin/librarian, reader chỉ book_view. Không bypass theo tên admin; report_view không thay forecast_view. Reader xem dự báo của mình qua /me, không được gọi đường dẫn quản trị /users/:id. Middleware hiện tại kiểm tra lại trạng thái/quyền mỗi request.

GET dùng SELECT và JavaScript, **không ghi** hay ghi usage. POST bị giữ fail-closed trước mọi thao tác tạo/lưu, không tự đặt tên quyền mới hoặc dùng quyền xem để ghi. Không nhận query cutoff_date/user_id/coverage hoặc tham số tùy chỉnh mô hình; ngày cắt từ đồng hồ UTC MySQL, coverage từ cấu hình server. Response có Cache-Control: no-store.

## Response

GET với người tồn tại nhưng thiếu lịch sử/cấu hình trả HTTP 200:

```json
{"success":true,"data":{"user_id":"30","cutoff_date":"2026-11-07","status":"insufficient_data","reason":"COVERAGE_UNVERIFIED","model_version":"borrow_daily_sma7_v1","target":"borrow_receipts_per_user_per_day","timezone":"UTC","horizon_days":7,"predictions":[],"evaluation":{"status":"insufficient_data","sample_count":0,"mae":null,"folds":[]},"persisted":false}}
```

Khi đủ điều kiện: status=ready; training gồm start_date/end_date/observed_days=7/borrow_count; predictions có đúng 7 dòng từ ngày mai đến D+7, mỗi dòng `{forecast_date,predicted_count}`. Ví dụ fixture có trung bình 4 lượt/ngày thì predicted_count="4.00" ở cả 7 dòng. Các ví dụ là fixture test, không phải dự báo thật đang tồn tại trên MySQL.

evaluation có thể insufficient_data dù preview ready khi chưa đủ 15 ngày để backtest; MAE khi đó vẫn null. Nếu được đánh giá thì trả các fold thời gian và sample_count, không chỉ một con số thiếu ngữ cảnh. Không trả tên, email, mật khẩu, JWT, raw history, server UUID, DB name, đường dẫn hoặc bằng chứng coverage.

HTTP 400 cho ID/query sai; 401 thiếu/sai JWT; 403 thiếu forecast_view hoặc tài khoản không hoạt động theo middleware; 404 người đích không tồn tại; 503 DB/đồng hồ không sẵn sàng hoặc POST generate chưa đủ điều kiện. status insufficient_data là tình trạng dữ liệu, không phải lỗi HTTP. Target inactive được người có quyền truy vấn sẽ trả insufficient_data/USER_INACTIVE.

## Postman

Base URL `http://127.0.0.1:3000`, Authorization → Bearer Token từ môi trường test độc lập. Login thành công cũng ghi usage nên không dùng DB chính để tạo token kiểm thử.

1. Reader: `GET {{baseUrl}}/api/forecasts/me` — ready hoặc insufficient_data, luôn own.
2. Admin/librarian có grant: `GET {{baseUrl}}/api/forecasts/users/{{userId}}`.
3. `POST {{baseUrl}}/api/forecasts/users/{{userId}}/generate` — hiện 503 FORECAST_GENERATION_NOT_CONFIGURED, không ghi gì, kể cả body yêu cầu persisted hoặc gửi coverage giả.
4. Bỏ Bearer: 401; reader gọi /users/:id: 403; staff truy vấn người không tồn tại: 404.

Không tự thêm user/phiếu/coverage/quyền vào DB chính để làm API trả ready. Cách tiếp nhận coverage được audit và ví dụ test nằm trong tài liệu thuật toán; task không tạo file xác nhận hoặc chỉnh `.env`.

## DuBaoTanSuat và phần bị chặn

Schema: forecast_id PK, user_id FK NguoiDung DELETE CASCADE, forecast_date DATE, predicted_count DECIMAL(12,2) CHECK >=0, model_version VARCHAR(50) nullable, created_at. Chỉ mục (user_id,forecast_date), **không UNIQUE** theo user/ngày/version, không cột train cutoff/coverage/forecast run/horizon/unit.

Ngày riêng + model_version có thể biểu diễn count/ngày khi có hợp đồng rõ; version borrow_daily_sma7_v1 đã được định nghĩa cho baseline. Tuy nhiên hiện chưa có quyền ghi dự báo trong seed/DB, coverage thực tế chưa được xác minh và chưa có hợp đồng run/dedup được phê duyệt. Vì vậy module **không có INSERT/UPDATE vào DuBaoTanSuat**, mọi preview persisted=false; không đọc các dự báo legacy chưa rõ đơn vị/version để giả làm baseline hiện tại.

Khi người dùng duyệt mở phần ghi trong task riêng, cần xác nhận quyền tạo/lưu, chính sách giữ run/ghi trùng và kiểm thử transaction trên DB độc lập. Khóa user theo cùng quy ước rồi kiểm tra user/ngày/version có thể hạn chế trùng ở ứng dụng; không có UNIQUE nên không được tuyên bố chống trùng toàn DB. Chưa tự triển khai giải pháp này hoặc sửa schema/seed.

## Xác minh và Frontend tiếp theo

Unit/mock bao phủ SMA7, thiếu/đủ coverage, cold start/ngày tạo chưa đủ, ngày thiếu quan sát, số lượt nhiều cùng ngày, số âm/NaN/Infinity/overflow, 7 ngày đầu ra, làm tròn, MAE tách thời gian, 401/403/404 và không ghi. SELECT metadata/quyền/aggregate thật xác nhận cấu trúc và dữ liệu rỗng; hai SELECT nguồn đã probe cú pháp WHERE 1=0, không trả bản ghi người dùng. Health/health-db thật 200, ba endpoint dự báo thiếu JWT 401.

Chưa có MAE thực tế, preview ready với lịch sử MySQL thật, hoặc kiểm thử integration độc lập. Không công bố baseline chính xác từ MAE fixture.

Nhiệm vụ Frontend đề xuất: tạo trang React + Vite **Dự báo của tôi**, gọi GET /api/forecasts/me, hiển thị 7 ngày khi ready hoặc thông báo theo insufficient_data; xử lý 401/403 và hiển thị training/evaluation. Giữ chức năng tạo/lưu bị khóa theo trạng thái Backend; chưa thực hiện Frontend trong task này.
