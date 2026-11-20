# FE-01 — Ma trận xác thực và phân quyền

Xác minh 2026-11-19 từ source và SELECT bảng phân quyền; không đọc tài khoản/PII. Contract chi tiết từng endpoint: [01](01_BACKEND_API_INVENTORY.md). Có **3 tên vai trò hiện hữu: admin, librarian, reader**. Quyền từ DB quyết định thao tác; tên admin không tạo bypass.

## Vòng đời xác thực

| Bước | Hành vi hiện tại | Nguồn |
|---|---|---|
| Register | POST /api/auth/register chỉ name/email/password/phone; bcrypt cost 12; transaction tạo active user + reader; trả profile, không token; role thiếu → 503, email trùng → 409 | [service](../../Backend/src/services/xac-thuc.service.js#L20), [model](../../Backend/src/models/xac-thuc.model.js#L28) |
| Login | POST /api/auth/login email/password; trả accessToken/tokenType/expiresIn=900; ghi usage event trước trả token, ghi lỗi thì login thất bại | [service](../../Backend/src/services/xac-thuc.service.js#L26) |
| Gửi token | Authorization: Bearer token; không cookie/session, không nhận token qua query | [middleware](../../Backend/src/middlewares/xac-thuc.js#L3) |
| JWT | HS256, sub/iat/exp, issuer libriflow-api, audience libriflow-client, 15 phút; JWT_SECRET ít nhất 32 byte sau trim để kiểm tra cấu hình | [jwt](../../Backend/src/utils/jwt.js#L8) |
| Principal | Mỗi request đọc trạng thái/roles/permissions bằng JOIN DB; JWT không chứa quyền được tin để cấp quyền | [model](../../Backend/src/models/xac-thuc.model.js#L7), [middleware](../../Backend/src/middlewares/xac-thuc.js#L9) |
| Me | GET /api/auth/me trả chính user của JWT: profile, roles, permissions; không hash/password | [controller](../../Backend/src/controllers/xac-thuc.controller.js#L16) |
| Logout | POST /api/auth/logout cần JWT active, chỉ hướng dẫn client xóa token; token cũ còn hiệu lực tới exp nếu account vẫn active | [controller](../../Backend/src/controllers/xac-thuc.controller.js#L17) |
| Refresh/đổi mật khẩu | Không có route refresh, reset/forgot/change password, update profile hoặc cấp staff | [mount](../../Backend/src/app-factory.js#L56), [auth router](../../Backend/src/routes/xac-thuc.routes.js#L6) |

Login giới hạn 10 request/IP/15 phút, register 5/IP/15 phút, bộ đếm in-memory: [router](../../Backend/src/routes/xac-thuc.routes.js#L9). Không có persistence phiên hoặc blacklist. Không lấy role/status từ form đăng ký.

## Grant trong DB và trong seed

SELECT VaiTro LEFT JOIN VaiTro_QuyenHan LEFT JOIN QuyenHan ngày 2026-11-19 xác nhận bảng dưới. **Seed là thiết kế trong repo; không đồng nghĩa đã áp dụng lên DB.** Nguồn: [seed](../../Backend/sql/seeds/initial-permissions.sql#L3), [migration chưa chạy](../../Backend/sql/migrations/001_add_category_manage.sql), [DATABASE](../../docs/DATABASE.md).

| Quyền | reader DB | librarian DB | admin DB | Seed repo khác DB |
|---|---|---|---|---|
| book_view | Có | Có | Có | Không; GET catalog thực tế public, không kiểm quyền này |
| book_create, book_update | Không | Có | Có | Không |
| book_delete | Không | Không | Có | Không |
| copy_manage | Không | Có | Có | Không |
| borrow_manage, return_process | Không | Có | Có | Không |
| fine_manage | Không | Có | Có | Không |
| report_view, forecast_view | Không | Có | Có | Không |
| user_manage | Không | Không | Có | Không có API user CRUD tương ứng |
| category_manage | Không | Không | Không | Seed/migration gán cho admin và librarian; DB chưa có quyền |

## Ma trận truy cập endpoint

Các cột role là kết quả của grant DB hiện tại khi có tài khoản active; hiện user count=0 nên không đồng nghĩa đã có tài khoản dùng được. Đối với grant thay đổi/custom role, áp dụng điều kiện ở cột cuối.

| Nhóm endpoint (số) | Public | reader | librarian | admin | Điều kiện thực tế |
|---|---|---|---|---|---|
| Health (2), GET catalog (7) | Có | Có | Có | Có | Không cần token |
| Register/login (2) | Có | Có | Có | Có | JWT cấu hình hợp lệ cho body hợp lệ; limiter |
| Me/logout (2) | Không | Own | Own | Own | Bất kỳ JWT active |
| Sách POST/PUT (2) | Không | Không | Có | Có | book_create / book_update |
| Sách DELETE (1) | Không | Không | Không | Có | book_delete |
| Danh mục POST/PUT/DELETE (3) | Không | Không | Không ở DB hiện tại | Không ở DB hiện tại | category_manage; thiếu grant → 403 |
| Copy POST/PUT/DELETE (3) | Không | Không | Có | Có | copy_manage |
| Phiếu GET list/detail (2), quá hạn GET (2) | Không | Own | Toàn bộ | Toàn bộ | borrow_manage → toàn bộ; nếu không, phải có reader → own; khác → 403 |
| Phiếu POST (1) | Không | Không | Có | Có | borrow_manage; staff chọn user_id borrower active |
| Trả POST (1) | Không | Không | Có | Có | return_process, không bắt buộc thêm borrow_manage |
| Fine GET list/detail (2) | Không | Own | Toàn bộ | Toàn bộ | fine_manage → toàn bộ; nếu không, reader → own |
| Fine POST/payment PATCH (2) | Không | Không | Có theo quyền | Có theo quyền | fine_manage + điều kiện nghiệp vụ/rule |
| Usage GET / (1) | Không | Own | Toàn bộ | Toàn bộ | report_view → toàn bộ; nếu không, reader → own |
| Usage GET /me (1) | Không | Own | Own | Own | Bất kỳ JWT active, không mở rộng theo grant |
| Statistics GET (3) | Không | Không | Có | Có | report_view |
| Forecast GET /me (1) | Không | Own | Own | Own | Bất kỳ JWT active |
| Forecast GET /users/:id (1) | Không | Không | Có | Có | forecast_view |
| Forecast POST generate (1) | Không | Không | 503 sau quyền | 503 sau quyền | forecast_view chỉ qua cổng, service luôn khóa ghi |

Own do JWT + WHERE SQL, không lọc ở client. Reader không có quyền quản lý gửi query user_id, kể cả chính mình, nhận 403. Detail ngoài scope trả 404 để không tiết lộ tài nguyên. /usage-history/me luôn cấm user_id. Role không có reader và không có quyền quản lý không tự nhận scope own ở các route đọc toàn bộ. Nguồn scope: [borrow](../../Backend/src/utils/kiem-tra-phieu-muon.js#L45), [fine/overdue](../../Backend/src/utils/kiem-tra-tien-phat.js#L23), [history](../../Backend/src/utils/kiem-tra-thong-ke.js#L27).

## Phân biệt lỗi

| Status | Code / ngữ nghĩa | Xử lý FE |
|---|---|---|
| 401 | AUTHENTICATION_REQUIRED / INVALID_TOKEN / TOKEN_EXPIRED; login INVALID_CREDENTIALS | Phiên hết hạn thì xóa token/profile và yêu cầu login; login sai thì hiển thị lỗi form |
| 403 | FORBIDDEN hoặc ACCOUNT_INACTIVE | Báo thiếu quyền/tài khoản bị khóa, không lặp login tự động để vượt quyền |
| 404 | Resource thiếu hoặc ngoài scope | Hiển thị không tìm thấy, không suy ra owner khác |
| 503 | JWT_NOT_CONFIGURED / REGISTRATION_NOT_CONFIGURED / DB | Báo chưa sẵn sàng; không coi là sai mật khẩu |

401 có WWW-Authenticate: Bearer tại [error middleware](../../Backend/src/middlewares/xu-ly-loi.js#L34). Cấu hình hôm nay: JWT chưa hợp lệ, users=0; chỉ kiểm tra boolean/count, không công bố secret. Auth thành công trên cấu hình hiện tại **chưa kiểm thử**. Test liên quan: [auth](../../Backend/test/xac-thuc.test.js), [scope borrow](../../Backend/test/phieu-muon.test.js), [history](../../Backend/test/lich-su-thong-ke.test.js).
