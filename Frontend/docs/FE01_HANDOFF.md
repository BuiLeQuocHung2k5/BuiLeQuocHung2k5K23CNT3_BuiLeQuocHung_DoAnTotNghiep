# Bàn giao FE-01

Ngày: **2026-11-19**. Trạng thái: **hoàn tất rà soát và tài liệu, chờ người dùng nghiệm thu**; không triển khai FE-02. Baseline Git `3a4c69e`, working tree ban đầu sạch.

## Kết quả và file

| File | Nội dung |
|---|---|
| [01_BACKEND_API_INVENTORY.md](01_BACKEND_API_INVENTORY.md) | 40 endpoint, source/line route-controller-service-model-validation-test; body/DTO/lỗi/schema |
| [02_AUTHORIZATION_MATRIX.md](02_AUTHORIZATION_MATRIX.md) | JWT/login/logout/register/me, 3 role, grant DB khác seed, scope và 401/403 |
| [03_FRONTEND_API_MAPPING.md](03_FRONTEND_API_MAPPING.md) | Màn hình React ↔ API, quyền, điều kiện nghiệp vụ, phần hỗ trợ/thiếu |
| [04_API_GAPS_AND_RISKS.md](04_API_GAPS_AND_RISKS.md) | P1/P2/P3, API thiếu và giới hạn, đề xuất chưa duyệt |
| [05_FRONTEND_INTEGRATION_GUIDE.md](05_FRONTEND_INTEGRATION_GUIDE.md) | Base/CORS/env, fetch/session/error/pagination/date/forms |
| FE01_HANDOFF.md | Phạm vi nghiệm thu, bằng chứng và bước tiếp theo |

Cập nhật thêm `docs/TASKS.md`, `docs/HANDOFF.md`, `docs/DATABASE.md`, `docs/PROJECT_CONTEXT.md` để bàn giao và ghi lần xác minh mới. Không sửa Backend/package-lock.json đang mở trong IDE; không sửa source/test/config/SQL/package hoặc Git metadata. Không cài package, tạo Vite, migration/seed hay ghi DB.

10 module nghiệp vụ: auth 4, sách 5, danh mục 5, copy 6, borrow 4, overdue 2, fine 4, history 2, statistics 3, forecast 3; thêm health 2 = **40 endpoint, 29 JWT, 11 public**. Có **3 role admin/librarian/reader** trong DB; không role-admin bypass. 39 endpoint có handler nghiệp vụ, generate có route nhưng khóa ghi 503. Fine/category có code, phụ thuộc cấu hình/grant; không coi là endpoint chưa tồn tại.

## Kiểm tra đã thực hiện

- Đọc yêu cầu đính kèm, AGENTS và 5 tài liệu bắt buộc, cây file/source/Git; trace route → middleware → controller → service → model/utils và đối chiếu test/tài liệu API.
- Liệt kê router runtime từ app-factory với dependency rõ ràng: **40** route; kiểm kê source 40 cặp method/path duy nhất, đối chiếu tài liệu không thiếu/trùng.
- SELECT information_schema.COLUMNS/TABLE_CONSTRAINTS/KEY_COLUMN_USAGE: **16 bảng/96 cột/16 PK/16 FK/6 UNIQUE/3 CHECK**; 96 tên/kiểu/NULL khớp DDL, cột FK/tham chiếu quan sát khớp. Không đọc PII. Chưa đối chiếu lại đầy đủ default/index/collation/CHECK expression/cascade hôm nay.
- SELECT tên role/quyền/grant và COUNT aggregate: **users=0, active rules=0, category_manage chưa có**. Boolean sau nạp cấu hình: JWT chưa hợp lệ, chưa cấu hình đường dẫn coverage; không in giá trị env hoặc định danh server.
- HTTP smoke loopback cổng tạm bằng wrapper pool chỉ cho SELECT, getConnection/transaction bị cấm: health/health-db/books/categories/book-copies **200**, auth/me và forecasts/me thiếu JWT **401**. CORS header **\***. Có **7 SELECT qua wrapper**; pool/server đóng sau kiểm tra. Không login/register/POST/PATCH/PUT/DELETE thật.
- Kiểm tra file/link/line, count route duy nhất, whitespace và phạm vi diff; rà tài liệu mới theo mẫu token/private key/credential. Không phát hiện bí mật thật trong phần tài liệu mới.

Để lặp kiểm tra read-only: nạp pool hiện có mà không in env; chỉ SELECT các metadata trên, JOIN grant và COUNT; dựng `dungUngDung` với query/execute chặn mọi SQL không bắt đầu SELECT và getConnection ném lỗi; listen loopback cổng 0; GET 7 đường dẫn trên, đọc status, đóng server/pool trong finally. Không dùng app server hoặc tài khoản đăng nhập để smoke ghi event.

## Chưa kiểm tra và giới hạn bằng chứng

Không chạy lại unit/safety hoặc integration ghi: task chỉ tài liệu, không đổi logic; integration tạo schema/fixture/ghi dữ liệu nằm ngoài phạm vi FE-01. **172/172 unit và 21/21 scenario MySQL là kết quả TASK-018 ngày 2026-11-07**, nguồn [báo cáo cũ](../../Backend/docs/backend-final-report.md), không gán sang hôm nay. Fine tạo/trùng/pay thành công thật, forecast ready/MAE thật, catalog PUT/DELETE thành công vẫn chưa được xác minh mới. Chưa chạy React/Vite/browser/preflight, tải lớn/Linux/audit dependency. Smoke public không chứng minh auth/ghi hoạt động.

## Quyết định và phần cần duyệt

Không thêm quyết định kiến trúc Backend. API source là căn cứ; seed và DB ghi riêng; giữ endpoint khóa và chức năng thiếu thành trạng thái UI rõ ràng. React/Vite/JSX và phong cách Warm Wooden Library theo yêu cầu người dùng; helper/env/token-in-memory trong guide là **đề xuất FE-02, chưa phê duyệt hoặc triển khai**.

P1 cần xử lý trước nghiệm thu luồng tương ứng: JWT/account staff/môi trường dev; category grant; chính sách/rule phạt; coverage và scope forecast. P2 cần chốt: borrower lookup/user admin, series lookup, copy note khi sửa, hồ sơ/password/upload, giới hạn báo cáo. Không tự sửa Backend để giải quyết.

## Tiêu chí bàn giao và FE-02

- Đã kiểm kê đủ endpoint, auth/quyền, request/response/error, mapping, gap/risk; đủ 6 file và cập nhật task/handoff; không đổi Backend/schema/package hoặc lộ bí mật. **Đạt phạm vi FE-01 về rà soát/tài liệu, đang chờ người dùng nghiệm thu**.
- Có thể chuẩn bị FE-02 về khung React/Vite và catalog public **sau khi được giao task tiếp theo**. Chưa đủ điều kiện nghiệm thu toàn bộ auth/quản trị/ghi với môi trường hiện tại; không hứa hoàn thành các luồng còn thiếu API.
- Người dùng cần quyết định phạm vi FE-02 và môi trường dev/demo, quy trình tài khoản/grants, chính sách phạt và các API thiếu cần bổ sung. FE-01 dừng tại đây, không tự thực hiện các đề xuất.
