# FE-01 — Ánh xạ màn hình với API

Xác minh source 2026-11-19. Công nghệ FE theo yêu cầu: React + Vite, JavaScript/JSX; định hướng Warm Wooden Library (nâu gỗ, kem, be, xanh lá trầm). Đây là bản đồ chuẩn bị, chưa khởi tạo ứng dụng. DTO/body/lỗi: [01](01_BACKEND_API_INVENTORY.md); quyền DB thực tế: [02](02_AUTHORIZATION_MATRIX.md).

| Màn hình dự kiến | API thực tế | Vai trò/quyền | Trạng thái và phụ thuộc |
|---|---|---|---|
| Đăng nhập | POST /api/auth/login → GET /api/auth/me | Public rồi JWT active | Có code; JWT cấu hình chưa hợp lệ, chưa có user; hết hạn 900s, không refresh |
| Đăng ký | POST /api/auth/register | Public, server chỉ tạo reader | Có code; phụ thuộc JWT/reader role; sau thành công chuyển login vì register không trả token |
| Dashboard nhân viên | GET /api/statistics/overview, /api/statistics/borrows, /api/statistics/users | report_view | Có aggregate; inventory là hiện tại, dữ liệu trong kỳ theo UTC; không tự hứa revenue/top-books |
| Trang chủ reader | GET /api/books, /api/borrows, /api/overdues, /api/fines | Catalog public; reader own ở nghiệp vụ | Ghép nhiều request; không dùng staff dashboard khi thiếu report_view |
| Danh sách sách | GET /api/books?page&limit&search; GET /api/categories khi cần nhãn | Public | Có; không lọc category/series hoặc sort qua query sách; category_id gửi vào sẽ 400 |
| Chi tiết sách | GET /api/books/:id; GET /api/books/:id/copies | Public | Có; sách không có ảnh bìa/cover endpoint; join nhãn danh mục qua API riêng nếu cần |
| Tạo/sửa/xóa sách | POST /api/books; PUT/DELETE /api/books/:id | book_create/book_update/book_delete | Có code; PUT đầy đủ; xóa có copy 409; chọn series thiếu API lookup BoSach |
| Quản lý danh mục | GET/POST /api/categories; GET/PUT/DELETE /api/categories/:id | Đọc public; ghi category_manage | Có code; ghi bị chặn ở DB hiện tại, thiếu grant; tên UNIQUE, còn sách thì không xóa |
| Quản lý bản sao | GET/POST /api/book-copies; GET/PUT/DELETE /api/book-copies/:id | Public đọc; copy_manage ghi | Có; chỉ sửa available/maintenance, book_id bất biến; GET không trả note nên form sửa note chưa thể nạp giá trị cũ |
| Danh sách phiếu | GET /api/borrows?page&limit&status; user_id chỉ borrow_manage | borrow_manage toàn bộ hoặc reader own | Có; reader không gửi user_id kể cả own; status=overdue không thay thế API tính quá hạn |
| Chi tiết phiếu | GET /api/borrows/:id | Như list phiếu | Có; list không details, cần detail riêng; ngoài scope 404 |
| Tạo phiếu | POST /api/borrows; GET /api/book-copies?availability_status=available&condition_status=good | borrow_manage | Một phần: thiếu user lookup để chọn borrower; 1–100 copy không trùng; date UTC tương lai; copy đổi trạng thái đồng thời có thể 409 |
| Trả sách một phần | GET /api/borrows/:id → POST /api/borrows/:id/return với items | return_process để ghi; borrow_manage/reader own để đọc | Có; quyền trả riêng không bảo đảm quyền đọc detail; thiết kế workflow dùng grant đủ, không hứa return-only user đọc mọi phiếu |
| Trả sách toàn bộ | Cùng POST return với return_all:true + condition_after | return_process | Có; chỉ copy còn mở; damaged→maintenance; không tự sinh phạt; trả lặp 409 |
| Theo dõi quá hạn | GET /api/overdues; GET /api/borrows/:id/overdue | borrow_manage toàn bộ hoặc reader own | Có code; days_overdue tính theo UTC DB, GET không ghi status/phạt |
| Danh sách/chi tiết phạt | GET /api/fines; GET /api/fines/:id | fine_manage toàn bộ hoặc reader own | Có; amount là chuỗi; không có endpoint tổng công nợ tổng quát, không suy tổng toàn DB từ một trang |
| Chốt phạt / ghi nhận thanh toán | POST /api/fines; PATCH /api/fines/:id/payment | fine_manage | Một phần: active rule=0, thiếu API chọn/quản trị rule; chỉ sau trả; payment ghi paid toàn bộ, không cổng thu tiền |
| Quản lý người dùng | Không có user CRUD/list/search REST | Có tên user_manage trong DB nhưng không có handler | Thiếu; không dùng /statistics/users làm danh bạ vì chỉ ID + aggregate người có hoạt động |
| Hồ sơ cá nhân | GET /api/auth/me | JWT active | Chỉ đọc; thiếu sửa profile/avatar/password; không mở form lưu giả |
| Lịch sử cá nhân | GET /api/borrows, /api/usage-history/me, /api/fines | Own theo quyền/role ở từng nhóm | Có theo phạm vi hiện tại; event login/borrow/return không đồng nghĩa số lần đến thư viện |
| Lịch sử quản trị | GET /api/usage-history | report_view | Có; date range ≤366 ngày; không trả details JSON cũ/PII |
| Thống kê/báo cáo | 3 GET /api/statistics/* | report_view | Có aggregate JSON; thiếu export CSV/PDF, báo cáo tài chính, top books chuyên biệt |
| Dự báo cá nhân/quản trị | GET /api/forecasts/me; GET /api/forecasts/users/:id | JWT own / forecast_view | Preview có; thiếu coverage audit → insufficient_data; dự báo theo số phiếu/ngày, không số copy/login |
| Tạo/lưu dự báo | POST /api/forecasts/users/:id/generate | forecast_view qua cổng | Có route nhưng luôn 503; khóa nút tạo/lưu, không hiển thị thành công |
| Đăng xuất | POST /api/auth/logout rồi xóa phiên FE | JWT active | Có stateless; vẫn xóa phiên local khi request logout thất bại; server không revoke token |

Nguồn route của toàn bộ ánh xạ: [app-factory](../../Backend/src/app-factory.js#L56), [inventory có line từng handler](01_BACKEND_API_INVENTORY.md). Nguồn điều kiện nghiệp vụ: [borrow model](../../Backend/src/models/phieu-muon.model.js#L51), [copy model](../../Backend/src/models/ban-sao-sach.model.js#L16), [fine model](../../Backend/src/models/tien-phat.model.js#L33), [forecast gate](../../Backend/src/services/du-bao.service.js#L16).

FE cần trạng thái loading/empty/error/forbidden/unavailable cho từng màn hình, không dùng dữ liệu giả thay response thật. Sau 409 phải tải lại dữ liệu trước thao tác tiếp; sau 400 gắn lỗi field, sau 503 giữ form và báo chưa sẵn sàng. Hiện chỉ có docs trong Frontend, không tự mở FE-02.
