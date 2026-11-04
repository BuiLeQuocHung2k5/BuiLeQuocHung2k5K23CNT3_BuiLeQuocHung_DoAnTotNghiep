# Quyết định và căn cứ

Xác minh: 2026-11-04. Không suy diễn lý do thiết kế nếu chưa có bằng chứng.

| Mục | Trạng thái và căn cứ |
| --- | --- |
| Backend dùng ES modules, Express và MySQL trực tiếp qua mysql2 | Đã hiện diện trong `Backend/package.json`, `src/app.js`, `src/config/database.js`; lý do lựa chọn: **Chưa xác minh**. |
| Chỉ mở API sau khi kiểm tra DB thành công | Hành vi đã xác minh trong `Backend/src/server.js`; lý do thiết kế: **Chưa xác minh**. |
| Tách ngữ cảnh, database, quyết định, lịch sử task và bàn giao | Theo yêu cầu người dùng ngày 2026-11-04; tài liệu đã tạo, đang chờ người dùng duyệt. Quy tắc thao tác nằm ở `AGENTS.md`. |

Chưa có quyết định được xác minh về frontend, kiến trúc nghiệp vụ, cơ chế xác thực hoặc công cụ migration. Ghi **Chưa xác minh**, không coi các bảng đang tồn tại là bằng chứng tính năng đã triển khai.

Khi thêm quyết định: ghi ngày, nội dung, căn cứ/source, trạng thái (đề xuất/được duyệt/đã hiện diện) và hệ quả cần theo dõi. Chỉ ghi lý do khi đã có nguồn.

Ngày 2026-11-05, theo task đồng bộ Git của người dùng: giữ bố cục ở gốc, loại `LibriFlow/` sau khi xác minh 16 cặp Git blob giống nhau và nội dung working tree chỉ khác CRLF/LF; giữ nguyên SQL từ GitHub. Người dùng đã cho phép merge và fast-forward local, yêu cầu xác nhận riêng trước push; không viết lại lịch sử.
