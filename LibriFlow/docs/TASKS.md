# Theo dõi task

## CTX-001 — Thiết lập chia sẻ ngữ cảnh (2026-11-04)
- Trạng thái: đã tạo tài liệu, chờ người dùng duyệt; chưa được duyệt.
- Phạm vi: khảo sát source/thư mục, đọc metadata database, tạo hướng dẫn và tài liệu bàn giao.
- File tạo: `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/DATABASE.md`, `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/HANDOFF.md`.
- Kiểm tra: Git ban đầu sạch; đọc source backend và cấu trúc frontend; truy vấn metadata chỉ đọc thành công, xác minh 16 bảng cùng PK/FK. Lần gọi Node inline đầu lỗi trích dẫn PowerShell trước khi chạy truy vấn; đã chạy lại qua stdin thành công.
- Kiểm tra tài liệu: đủ sáu tệp, liên kết nội bộ tồn tại, `git diff --check` đạt; Git chỉ liệt kê tài liệu mới, không có thay đổi tệp source đã theo dõi.
- Chưa chạy: server/API HTTP, bộ test ứng dụng (không có script test); task chỉ tạo tài liệu.
- Tồn tại: repo chưa có DDL tạo các bảng thực tế; nghiệp vụ chi tiết và nguồn schema **Chưa xác minh**.
- Bước tiếp theo: người dùng duyệt bộ tài liệu; sau duyệt, nhận task cụ thể và xác minh lại phần liên quan trước khi triển khai.

Task tiếp theo ghi cùng các trường: mã/ngày, trạng thái, phạm vi, file tạo/sửa, kiểm tra và kết quả, phần chưa kiểm tra, tồn tại, bước tiếp theo. Bàn giao mới nhất xem `HANDOFF.md`.
