# Theo dõi task

## RESTORE-001 — Tạo lại thư mục khung backend (2026-11-05)
- Trạng thái: hoàn tất theo yêu cầu người dùng; tạo lại 6 thư mục rỗng `Backend/src/{controllers,middlewares,models,routes,services,utils}` đã xóa ở CLEAN-001.
- File sửa: `docs/TASKS.md`, `docs/HANDOFF.md`; không thêm file vào các thư mục, không sửa source hay DB. Giữ các thay đổi tài liệu chưa commit từ task trước.
- Kiểm tra: cả 6 đường dẫn tồn tại, là thư mục và rỗng; source/SQL không có diff, `git diff --check` đạt. Không chạy ứng dụng/test vì chỉ tạo thư mục rỗng.
- Tồn tại: Git không theo dõi thư mục rỗng; chưa thêm `.gitkeep` vì yêu cầu hiện tại chỉ tạo lại thư mục rỗng.
- Bước tiếp theo: sử dụng các thư mục khi triển khai nghiệp vụ; push của GIT-001 vẫn chờ xác nhận riêng. Không commit hoặc push trong task này.

## CLEAN-001 — Rà soát thư mục thừa (2026-11-05)
- Trạng thái: hoàn tất; xóa 6 thư mục rỗng `Backend/src/{controllers,middlewares,models,routes,services,utils}` sau khi xác minh không có tệp ẩn, không phải liên kết và không được source/cấu hình hiện tại tham chiếu.
- File sửa: `docs/TASKS.md`, `docs/HANDOFF.md`; không xóa tệp source. Các thư mục rỗng không được Git theo dõi nên việc xóa không tạo diff source.
- Kiểm tra: Git ban đầu sạch trên `main` tại `791dee4`; liệt kê thư mục, đọc source và tìm tham chiếu bằng `rg` (không có kết quả); mọi tệp Git theo dõi đều tồn tại. Sau dọn, xác minh 6 thư mục không còn, source/SQL không đổi và `git diff --check` đạt.
- Giữ `Frontend/` rỗng theo bố cục đã thống nhất; giữ `.git`, dependency `Backend/node_modules`, các thư mục chứa source, SQL và tài liệu. Không thấy thư mục trùng `LibriFlow/`.
- Chưa chạy: ứng dụng/test hoặc truy vấn DB vì chỉ xóa thư mục rỗng. Không commit hoặc push.
- Tồn tại/bước tiếp theo: không có vấn đề mới; yêu cầu xác nhận push của GIT-001 vẫn đang chờ, task dọn thư mục không phải xác nhận push.

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
