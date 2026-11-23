# API dự báo tần suất — HOTFIX FORECAST-01

Xác minh ngày 23/11/2026 bằng Express và MySQL `libriflow_demo`. Các đường dẫn dưới đây có tiền tố `/api/forecasts`, yêu cầu JWT và trả `Cache-Control: no-store`.

| Phương thức và đường dẫn | Quyền và kết quả |
| --- | --- |
| GET /me | Xem trước cho tài khoản trong JWT |
| GET /users/:id | `forecast_view`, xem trước theo mã |
| GET /lookup?search=... | `forecast_view`, tối đa 20 kết quả theo tên hoặc email, chỉ trả mã, tên và danh sách vai trò |
| POST /users/:id/generate | Cần cả `forecast_view` và `user_manage`. Server tính lại. Trả 201 khi lưu, 200 khi đã có, 409 khi thiếu dữ liệu hoặc ngày UTC đổi trong lúc ghi. |
| GET /me/history và /me/history/:ngay | Danh sách tối đa 100 ngày cắt gần nhất của chính mình hoặc các dòng dự báo của ngày cắt được chọn |
| GET /users/:id/history và /users/:id/history/:ngay | Cùng cấu trúc, cần `forecast_view` |

Frontend dùng tìm kiếm `/api/admin/users` khi có quyền quản lý, còn người chỉ có quyền xem dự báo dùng `/lookup`. Xem trước trả `name`, `user_id`, `cutoff_date`, `training`, `history` (7 cặp day/count khi ready), `predictions` và `evaluation`. Khi thiếu dữ liệu, `reason` mô tả nguyên nhân và `observed_days` cho biết số ngày hợp lệ trong cửa sổ huấn luyện nếu xác định được. Chi tiết công thức và điều kiện tại [thuật toán](thuat-toan-du-bao.md).

Một lần lưu gồm bảy dòng trong bảng InnoDB `DuBaoTanSuat` hiện có. Mô hình hiện tại dùng ngày UTC của `created_at` làm ngày cắt. API khóa hàng người dùng, kiểm tra cùng mã người dùng, ngày cắt và phiên bản mô hình, sau đó ghi cả bảy dòng trong một transaction. Khi gọi lại, bản lưu đầu tiên được giữ nguyên. Không có ràng buộc UNIQUE cho những chương trình ghi trực tiếp bằng SQL. Bảng lưu kết quả với hai chữ số thập phân, không lưu snapshot dữ liệu huấn luyện hoặc MAE. [Model](../src/models/du-bao.model.js)
