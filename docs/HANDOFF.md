# Bàn giao hiện tại

Cập nhật: 2026-11-04 · Task: **CTX-001** (`TASKS.md`).

- Đã thiết lập bộ tài liệu ngữ cảnh và hướng dẫn Codex đọc/cập nhật tài liệu. Trạng thái: **Chờ người dùng duyệt**.
- File tạo/sửa: tạo mới `AGENTS.md` và năm tệp `docs/{PROJECT_CONTEXT,DATABASE,DECISIONS,TASKS,HANDOFF}.md`; không sửa source, cấu hình hoặc database.
- Kiểm tra: khảo sát source; metadata DB đọc thành công (16 bảng, PK/FK); đủ sáu tệp và liên kết nội bộ; `git diff --check` đạt, không có thay đổi source đã theo dõi. Chi tiết và kiểm tra chưa chạy: CTX-001 trong `TASKS.md`.
- Vấn đề còn tồn tại: SQL trong repo chỉ tạo schema, chưa tái tạo được bảng thực tế; nguồn DDL và quy tắc nghiệp vụ **Chưa xác minh**.
- Bước tiếp theo: chờ người dùng duyệt. Sau đó thực hiện task được giao, đối chiếu source/metadata phù hợp và cập nhật hai tệp theo dõi sau mỗi task.

Trước khi tiếp tục: đọc `AGENTS.md` và toàn bộ tài liệu được chỉ định; không tự chạy script SQL hoặc bổ sung migration để xử lý khoảng trống schema.
