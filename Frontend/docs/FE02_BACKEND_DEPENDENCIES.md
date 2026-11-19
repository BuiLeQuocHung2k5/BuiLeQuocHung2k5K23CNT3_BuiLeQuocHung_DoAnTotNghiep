# FE-02 — Phụ thuộc Backend theo phương án C

Xác minh source/tài liệu 2026-11-19. Người dùng đã duyệt phương án C: triển khai Frontend theo kế hoạch, xử lý Backend bằng task riêng khi thành phụ thuộc thực tế. FE-02 không truy vấn MySQL hoặc kiểm lại cấu hình riêng; users=0/rules=0/category grant/JWT là **snapshot FE-01**, chưa chứng minh trạng thái DB mới trong FE-02.

Phân loại: **A** không ảnh hưởng FE-02; **B** ảnh hưởng nền tảng/cấu hình FE-02; **C** chặn nghiệm thu chức năng FE tương lai; **D** cần task Backend riêng. Một vấn đề có thể thuộc A+C+D vì không chặn nền tảng nhưng chặn feature sau.

| Vấn đề | Nhóm | Ảnh hưởng / feature phụ thuộc | Điều kiện và task riêng đề xuất |
|---|---|---|---|
| Origin/prefix/CORS | B | HTTP client và health | Đã đối chiếu guide và source: default loopback3000, /api, cors wildcard; env origin rõ ràng, không credentials. Nếu operator đổi PORT phải cập nhật FE; không đổi Backend config |
| Inventory FE-01 bị lỗi mã hóa và mục contract trống | B+C | Tài liệu không đủ để tự xây service nghiệp vụ | Giữ nguyên 6 file theo yêu cầu; dùng 05 guide đọc được + health source cho FE-02; dừng phần service nghiệp vụ phụ thuộc 01. Cần task sửa tài liệu/đối chiếu contract trước feature API tương lai, không suy từ tên route |
| JWT chưa cấu hình hợp lệ, chưa có user/staff theo FE-01 | A+C+D | Login và quản trị thật | Operator chuẩn bị môi trường/account/JWT an toàn; kiểm thử auth riêng. Không tạo token giả hay auth provider |
| User CRUD/borrower lookup thiếu | A+C+D | Người dùng và form lập phiếu | Task Backend lookup/scoped user API và chính sách PII |
| Series lookup thiếu | A+C+D | Chọn bộ sách khi tạo/sửa | Xác nhận scope BoSach/API trước form liên quan |
| Sửa hồ sơ/password/reset/refresh thiếu | A+C+D | Profile và vòng đời phiên | Task auth/profile riêng; không thêm refresh ngầm ở client |
| Upload/cover/avatar thiếu | A+C+D | Ảnh sách/hồ sơ | Task API/storage/validation riêng; không tạo upload service giả |
| category_manage chưa có ở DB theo FE-01 | A+C+D | Ghi danh mục | Xác minh môi trường/grant và chỉ áp migration nếu có chỉ dẫn rõ; không role bypass |
| Active fine rule=0, thiếu rule lookup/quản trị | A+C+D | Chốt phạt, thanh toán | Duyệt mức tiền/đơn vị tiền/rule, API chọn rule và integration fine thật |
| Generate forecast luôn khóa 503 | A+C+D | Tạo/lưu dự báo | Task quyền ghi/persistence/run/idempotency riêng; giữ gate, không mở từ FE |
| Coverage/UTC/MAE chưa audit | A+C+D | Preview forecast và báo cáo tin cậy | Audit phía server, không lấy ngày thiếu làm zero; insufficient_data là trạng thái hợp lệ |
| Copy GET ẩn note nhưng PUT thay thế | A+C+D | Form sửa copy đầy đủ | Task staff detail/PATCH hoặc giải pháp bảo toàn note được duyệt trước sửa |
| Date/ENUM/report/payment hạn chế | A+C+D | Lưu thông/phạt/thống kê | Adapter thời gian theo module, chốt feature thực; không action từ mọi ENUM, không xem paid như giao dịch ngân hàng |

Nguồn chính: [FE-01 gaps](04_API_GAPS_AND_RISKS.md), [handoff](FE01_HANDOFF.md), [guide](05_FRONTEND_INTEGRATION_GUIDE.md). Source mới đã đọc lại: [server](../../Backend/src/server.js#L4), [factory](../../Backend/src/app-factory.js#L49), [quy ước](../../Backend/docs/quy-uoc-dat-ten.md). Không thay API contract hoặc sửa các vấn đề nhóm C/D trong FE-02. Không blocker Backend nào ngăn app FE-02 render/build/test khi offline hoặc thiếu env.
