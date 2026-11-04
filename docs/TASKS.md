# Theo dõi task

## GIT-001 — Hợp nhất lịch sử local/GitHub (2026-11-05)
- Trạng thái: đã hoàn tất merge local và fast-forward `main` tới merge commit `fdb7037`; chưa push, chờ người dùng xác nhận.
- Căn cứ ban đầu: `integrate-github`, `main`, `backup-local-main` tại `a7ff7e0`; `MERGE_HEAD` và `origin/main` tại `eded2dd`; merge không có conflict, 17 tệp mới staged.
- Đối chiếu: 16 tệp `LibriFlow/` có blob index giống bản gốc; nội dung working tree giống sau chuẩn hóa CRLF/LF, không có tệp phụ trong thư mục trùng. Giữ nguyên các tệp gốc và SQL.
- File thay đổi trong merge: thêm `.gitignore`, giữ thêm `libriflow_database.sql` từ GitHub; sửa `docs/PROJECT_CONTEXT.md`, `docs/DATABASE.md`, `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/HANDOFF.md`; bỏ 16 bản sao `LibriFlow/` khỏi kết quả hợp nhất.
- Kiểm tra đã chạy: status/remote/staged/refs/log; đọc toàn SQL (DDL và seed vai trò/quyền, không dữ liệu người dùng); rà 17 blob duy nhất trong lịch sử hai nhánh theo mẫu bí mật và đường dẫn nhạy cảm, không phát hiện vấn đề chưa xử lý. Mẫu mật khẩu trong README là placeholder. `.env` và `node_modules` local đã được ignore.
- Kết quả local: `fdb7037` có hai parent `a7ff7e0` và `eded2dd`; `merge-base --is-ancestor` đạt với cả hai lịch sử, `backup-local-main` vẫn ở `a7ff7e0`. `main` đã fast-forward thành công; status sạch sau merge. Toàn bộ 16 tệp gốc còn tồn tại, source và SQL không đổi; cây kết quả có 18 tệp theo dõi. `git diff --cached --check` đạt; các mẫu ignore đã kiểm tra ở gốc và thư mục con, `.env.example` không bị ignore.
- Chưa chạy: SQL, truy vấn DB và kiểm thử ứng dụng vì không sửa logic; chưa push. Không chạy lại fetch trong task này; `origin/main` là bản fetch hiện có, phải kiểm tra remote mới nhất trước push.
- Tồn tại: chưa đối chiếu đầy đủ SQL với DB thực tế; xác nhận push còn chờ người dùng.
- Bước tiếp theo: commit cập nhật bàn giao trên `integrate-github`, fast-forward `main` theo commit tài liệu; xin người dùng xác nhận trước push. Khi được duyệt, kiểm tra remote mới nhất rồi dùng `git push origin main`; nếu remote thay đổi không tương thích, dừng và báo, tuyệt đối không force.

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
