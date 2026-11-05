# Quyết định và căn cứ

Xác minh: 2026-11-04. Không suy diễn lý do thiết kế nếu chưa có bằng chứng.

| Mục | Trạng thái và căn cứ |
| --- | --- |
| Backend dùng ES modules, Express và MySQL trực tiếp qua mysql2 | Đã hiện diện trong `Backend/package.json`, `src/app.js`, `src/config/database.js`; lý do lựa chọn: **Chưa xác minh**. |
| Chỉ mở API sau khi kiểm tra DB thành công | Hành vi đã xác minh trong `Backend/src/server.js`; lý do thiết kế: **Chưa xác minh**. |
| Tách ngữ cảnh, database, quyết định, lịch sử task và bàn giao | Theo yêu cầu người dùng ngày 2026-11-04; tài liệu đã tạo, đang chờ người dùng duyệt. Quy tắc thao tác nằm ở `AGENTS.md`. |

Chưa có quyết định được xác minh về frontend, kiến trúc nghiệp vụ tổng thể hoặc công cụ migration. Cơ chế xác thực hiện tại được ghi tại AUTH-001 bên dưới. Ghi **Chưa xác minh** cho phần thiếu, không coi các bảng đang tồn tại là bằng chứng tính năng đã triển khai.

Khi thêm quyết định: ghi ngày, nội dung, căn cứ/source, trạng thái (đề xuất/được duyệt/đã hiện diện) và hệ quả cần theo dõi. Chỉ ghi lý do khi đã có nguồn.

Ngày 2026-11-05, theo task đồng bộ Git của người dùng: giữ bố cục ở gốc, loại `LibriFlow/` sau khi xác minh 16 cặp Git blob giống nhau và nội dung working tree chỉ khác CRLF/LF; giữ nguyên SQL từ GitHub. Người dùng đã cho phép merge và fast-forward local, yêu cầu xác nhận riêng trước push; không viết lại lịch sử.

Ngày 2026-11-05 — SQL-007: người dùng cho phép chuẩn hóa SQL và tài liệu. Chọn bản `Backend/sql/libriflow_database.sql` làm nguồn tách DDL/seed vì ba bản chỉ khác CRLF/LF và cấu trúc đã đối chiếu với metadata MySQL hiện tại. Trạng thái: được duyệt trong phạm vi tạo file; đã tạo `schema.sql`, `seeds/initial-permissions.sql` và hướng dẫn. Giữ nguyên tên đối tượng/logic và mọi bản gốc; không thực thi SQL, commit hoặc push. Lưu ý tên bảng PascalCase trên môi trường phân biệt hoa/thường và giới hạn của `IF NOT EXISTS`/`INSERT IGNORE`.

Ngày 2026-11-05 — BOOK-001: theo nhiệm vụ module sách, đã triển khai route/controller/service/model, validation và lỗi JSON tập trung; không làm auth. Các lựa chọn triển khai: PUT thay thế đầy đủ, ID chuỗi bảo toàn BIGINT, tìm kiếm chuỗi con title/author/publisher, chỉ xóa Sach khi không có bản sao và FK cho phép. Server chỉ bind loopback do phạm vi cục bộ. Thêm alias `npm run db`, giữ các lệnh cũ; dùng node:test có sẵn, không thêm dependency. Trạng thái: đã hiện diện theo phạm vi người dùng duyệt, hợp đồng chi tiết tại `Backend/docs/books-api.md`; kiểm thử ghi trên MySQL thật còn chưa chạy.

Ngày 2026-11-05 — AUTH-001: theo yêu cầu JWT/RBAC, đã triển khai bcrypt cost 12, JWT HS256 15 phút (sub/iat/exp/iss/aud), secret chỉ lấy từ môi trường với kiểm tra tối thiểu 32 byte; thiếu cấu hình trả 503 trước ghi. Reader và ba quyền sách lấy tên từ seed, dữ liệu thực tế đã kiểm tra bằng SELECT. GET sách public; ghi sách cần authenticate + authorize dựa DB. Logout stateless nói rõ client xóa token, không server revocation/refresh token. Login 10 và register 5 request/IP/15 phút bằng bộ đếm memory. Trạng thái: triển khai theo phạm vi được duyệt; chưa production, chưa kiểm thử ghi/auth thành công trên MySQL độc lập. Không sửa schema, `.env`, Git/remote hoặc tự seed/cấp admin.
