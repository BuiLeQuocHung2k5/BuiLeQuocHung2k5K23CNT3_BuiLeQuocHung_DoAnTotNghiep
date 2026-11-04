# Quyết định và căn cứ

Xác minh: 2026-11-04. Không suy diễn lý do thiết kế nếu chưa có bằng chứng.

| Mục | Trạng thái và căn cứ |
| --- | --- |
| Backend dùng ES modules, Express và MySQL trực tiếp qua mysql2 | Đã hiện diện trong `Backend/package.json`, `src/app.js`, `src/config/database.js`; lý do lựa chọn: **Chưa xác minh**. |
| Chỉ mở API sau khi kiểm tra DB thành công | Hành vi đã xác minh trong `Backend/src/server.js`; lý do thiết kế: **Chưa xác minh**. |
| Tách ngữ cảnh, database, quyết định, lịch sử task và bàn giao | Theo yêu cầu người dùng ngày 2026-11-04; tài liệu đã tạo, đang chờ người dùng duyệt. Quy tắc thao tác nằm ở `AGENTS.md`. |

Chưa có quyết định được xác minh về frontend, kiến trúc nghiệp vụ, cơ chế xác thực hoặc công cụ migration. Ghi **Chưa xác minh**, không coi các bảng đang tồn tại là bằng chứng tính năng đã triển khai.

Khi thêm quyết định: ghi ngày, nội dung, căn cứ/source, trạng thái (đề xuất/được duyệt/đã hiện diện) và hệ quả cần theo dõi. Chỉ ghi lý do khi đã có nguồn.
