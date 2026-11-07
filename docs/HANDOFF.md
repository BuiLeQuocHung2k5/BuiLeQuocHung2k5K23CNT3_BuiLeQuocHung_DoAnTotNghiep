# Bàn giao hiện tại

Cập nhật: 2026-11-07 · Task: **TASK-015** (`TASKS.md`).

- Trạng thái: đã triển khai lịch sử sử dụng/thống kê; login thành công giờ có ghi DB. Mượn/trả tạo event mỗi copy cho borrower cùng transaction, event lỗi rollback; GET không ghi. Thống kê chỉ SELECT; không tạo thuật toán/dữ liệu dự báo.
- File: danh sách tại TASKS.md TASK-015. Tạo 8 file module usage-history/statistics + analytics-validation.js, test/usage-statistics.test.js và 3 tài liệu API/forecast. Sửa auth service/model, borrow model, app-factory, 2 fixture test, README và docs liên quan. Không thêm dependency hoặc sửa schema/seed/.env/Git.
- Quyền: report_view đọc toàn bộ usage/thống kê; reader chỉ history own, /usage-history/me luôn JWT owner; mọi route JWT, không role bypass hoặc tự cấp quyền. SELECT seed/grant thực tế xác nhận report_view admin/librarian.
- Kiểm tra: **150/150 test đạt** (126 cũ + 24 mới), 0 fail/skip; node --check 65 file, diff-check đạt. SELECT metadata 3 bảng usage/forecast/systemlog và quyền; overview/series thật trả count 0/series rỗng. 7 SELECT probe WHERE 1=0 đạt cú pháp; HTTP thật health/db 200, năm endpoint mới thiếu JWT 401; đóng server/pool. Không ghi dữ liệu chính hoặc login thành công trên DB chính.
- Thiết kế: đếm phiếu không cancelled/user/ngày là target đề xuất, khác số copy hoặc login/active_days. Week bắt đầu thứ Hai, month UTC; không điền 0 trước khi xác minh coverage. Không ghi DuBaoTanSuat/NhatKyHeThong. Hợp đồng/Postman tại Backend/docs/{usage-history-api,statistics-api,forecast-data-design}.md.
- Tồn tại/chưa kiểm thử: MySQL độc lập cho INSERT/log/rollback/concurrency và aggregates khác 0; timezone legacy/coverage/tải lớn chưa xác minh. Schema thiếu actor/idempotency/immutable audit; JSON borrow_id không FK, user CASCADE/copy SET NULL. COUNT/page riêng có thể lệch khi ghi đồng thời. Giới hạn TASK-014 còn áp dụng (QuyDinhPhat trống, lost/waive chưa mở).
- Bước tiếp theo đề xuất: kiểm thử lifecycle kèm usage trên instance MySQL test độc lập đã xác minh theo Backend/docs/integration-tests.md; chưa tự dựng DB/user/chạy schema/seed. Integration TASK-013 vẫn CHƯA CHẠY. Không commit/push/public API.

Trước task mới: đọc `AGENTS.md` và các tài liệu được chỉ định, kiểm tra lại source/Git/metadata liên quan; tài liệu là ảnh chụp tại thời điểm xác minh.
