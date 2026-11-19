# FE-01 — Backend API inventory

Cập nhật QA-01, xác minh source/runtime **2026-11-19**. **40 endpoint duy nhất: 11 public, 29 JWT**, 10 module nghiệp vụ + health; không cộng HEAD/OPTIONS tự động. 39 route có handler thực hiện chức năng; POST forecast generate luôn khóa503 có chủ đích. Có route không đồng nghĩa đã nghiệm thu luồng ghi thật. [Bằng chứng runtime và smoke chỉ đọc](../../docs/quality-audit/evidence/smoke.json).

Bản FE-01 trước QA-01 chứa dấu `?` đã mất thông tin ngay trong bytes UTF-8 và thiếu bảng contract; không thể phục hồi bằng đổi console encoding. QA-01 biên soạn lại từ source, giữ nguyên API. Bàn giao FE01/FE02/FE03 là lịch sử, không bị ghi đè.

## Quy ước chung

Entry [server.js](../../Backend/src/server.js) từ npm start/dev, mặc định loopback3000, chỉ listen sau SELECT1; [app.js](../../Backend/src/app.js) bọc pool, [factory](../../Backend/src/app-factory.js) mount /api, cors wildcard, JSON256kb, not-found/error. QA-01 đã start entrypoint thật tại3000/health-db200 rồi dừng tiến trình kiểm thử; không bảo đảm server đang chạy sau audit.

- ID/`:id`: số nguyên dương dạng string, không số0 đầu, tối đa18446744073709551615. Body ID dạng number chỉ nhận safe integer; FE nên giữ string. FK nullable giữ null.
- `P`: query page=1, limit=10 mặc định, limit≤100, page/offset phải safe integer; số query là chuỗi nguyên dương chuẩn. totalPages=ceil(total/limit), total0→totalPages0.
- `S`: P + search trim≤255 ký tự Unicode; tìm literal substring. Books không nhận category_id/sort. Copies search barcode/isbn; categories search name/description.
- `D`: start_date/end_date UTC YYYY-MM-DD, mặc định30 ngày kết thúc hôm nay; inclusive/max366, ngày1000-01-01..9999-12-30. Response period={start_date,end_date,timezone:'UTC'}.
- `L(X)`: {success:true,data:X[],pagination:{page,limit,total,totalPages}}. `O(X)`: {success:true,data:X}. Success DELETE/logout: {success:true,data:null,message:string}. Không bỏ metadata ngoài data trong adapter FE.
- `—` = không dùng theo handler; không mặc định là bị từ chối. Catalog detail/auth và phần lớn mutation không reject query lạ; list validators reject unknown query; forecast và overdue detail reject mọi query. JSON body unknown fields bị từ chối trên các validator tương ứng; forecast generate không parse body vì gate luôn503.
- Auth `JWT` yêu cầu Bearer; middleware đọc status/roles/permissions từ DB mỗi request. Tên role không cấp quyền ghi ngầm. `own` = reader không có quyền quản lý chỉ đọc user từ JWT, không gửi query user_id; người không có grant và không reader bị403. /me luôn own kể cả staff. [Authorization matrix](02_AUTHORIZATION_MATRIX.md).

## Contract từng endpoint

Các alias body/DTO được định nghĩa ngay dưới; mỗi dòng gồm method/path, params/query, body, quyền, success/status và nhóm lỗi đặc thù. Lỗi chung nằm ở mục lỗi, nguồn theo module ở cuối.

| Method | Endpoint | Params / query | Body | Auth / quyền | Success | Lỗi đặc thù ngoài lỗi chung |
|---|---|---|---|---|---|---|
| GET | `/api/health` | — | — | Public | 200 {success:true,message:string} | Không query DB |
| GET | `/api/health/db` | — | — | Public | 200 {success:true,database:'connected'} | 503 {success:false,database:'disconnected'}, không error envelope |
| POST | `/api/auth/register` | — | Register | Public; limiter5/15phút/IP | 201 O(User), không token | 409 EMAIL_ALREADY_EXISTS; 503 JWT_NOT_CONFIGURED/REGISTRATION_NOT_CONFIGURED; 429 |
| POST | `/api/auth/login` | — | Login | Public; limiter10/15phút/IP | 200 O({accessToken,tokenType:'Bearer',expiresIn:900}) | 401 INVALID_CREDENTIALS; 403 ACCOUNT_INACTIVE; 503 JWT_NOT_CONFIGURED; 429 |
| GET | `/api/auth/me` | — | — | JWT, own | 200 O(User) | JWT/account lỗi |
| POST | `/api/auth/logout` | — | — | JWT | 200 null+message | Không revoke token server, không cần body |
| GET | `/api/books` | S | — | Public | 200 L(Book) | 400 validation |
| GET | `/api/books/:id` | id | — | Public | 200 O(Book) | 404 BOOK_NOT_FOUND |
| POST | `/api/books` | — | BookWrite | JWT + book_create | 201 O(Book), Location | 400 invalid reference |
| PUT | `/api/books/:id` | id | BookWrite, replacement | JWT + book_update | 200 O(Book) | 404 BOOK_NOT_FOUND; 400 invalid reference |
| DELETE | `/api/books/:id` | id | — | JWT + book_delete | 200 null+message | 404 BOOK_NOT_FOUND; 409 BOOK_HAS_COPIES/BOOK_IN_USE |
| GET | `/api/categories` | S | — | Public | 200 L(Category) | 400 validation |
| GET | `/api/categories/:id` | id | — | Public | 200 O(Category) | 404 CATEGORY_NOT_FOUND |
| POST | `/api/categories` | — | CategoryWrite | JWT + category_manage | 201 O(Category), Location | 409 DUPLICATE_VALUE |
| PUT | `/api/categories/:id` | id | CategoryWrite, replacement | JWT + category_manage | 200 O(Category) | 404 CATEGORY_NOT_FOUND; 409 DUPLICATE_VALUE |
| DELETE | `/api/categories/:id` | id | — | JWT + category_manage | 200 null+message | 404 CATEGORY_NOT_FOUND; 409 CATEGORY_IN_USE |
| GET | `/api/book-copies` | S + book_id?,condition_status?,availability_status? | — | Public | 200 L(CopyPublic) | 400 validation |
| GET | `/api/book-copies/:id` | id | — | Public | 200 O(CopyPublic) | 404 COPY_NOT_FOUND |
| POST | `/api/book-copies` | — | CopyWrite | JWT + copy_manage | 201 O(CopyStaff), Location | 400 INVALID_REFERENCE; 409 DUPLICATE_VALUE/CIRCULATION_STATE_MANAGED |
| PUT | `/api/book-copies/:id` | id | CopyWrite, replacement | JWT + copy_manage | 200 O(CopyStaff) | 404 COPY_NOT_FOUND; 409 COPY_CIRCULATION_LOCKED/COPY_BOOK_IMMUTABLE/CIRCULATION_STATE_MANAGED/DUPLICATE_VALUE |
| DELETE | `/api/book-copies/:id` | id | — | JWT + copy_manage | 200 null+message | 404 COPY_NOT_FOUND; 409 COPY_CIRCULATION_LOCKED/COPY_HAS_LOAN_HISTORY/COPY_HAS_USAGE_HISTORY/COPY_IN_USE |
| GET | `/api/books/:id/copies` | id=book; S + condition_status?,availability_status?, không book_id query | — | Public | 200 L(CopyPublic) | 404 BOOK_NOT_FOUND |
| GET | `/api/borrows` | P + status?,user_id? | — | JWT + borrow_manage hoặc reader own | 200 L(BorrowHeader) | 403 reader chọn user_id |
| GET | `/api/borrows/:id` | id | — | JWT + borrow_manage hoặc reader own | 200 O(Borrow) | 404 BORROW_NOT_FOUND, kể cả ngoài scope |
| POST | `/api/borrows` | — | BorrowWrite | JWT + borrow_manage | 201 O(Borrow), Location | 404 BORROWER_NOT_FOUND/COPY_NOT_FOUND; 400 INVALID_DUE_DATE; 409 BORROWER_INACTIVE/COPY_NOT_BORROWABLE/COPY_HAS_OPEN_LOAN |
| POST | `/api/borrows/:id/return` | id | ReturnWrite | JWT + return_process | 200 O(Borrow) | 404 BORROW_NOT_FOUND/COPY_NOT_FOUND; 400 COPY_NOT_IN_BORROW; nhóm Return409 |
| GET | `/api/overdues` | P + user_id?,borrow_id? | — | JWT + borrow_manage hoặc reader own | 200 L(OverdueItem)+as_of | 403 reader chọn user_id |
| GET | `/api/borrows/:id/overdue` | id; không query | — | JWT + borrow_manage hoặc reader own | 200 O(OverdueSummary) | 404 BORROW_NOT_FOUND |
| GET | `/api/fines` | P + user_id?,borrow_id?,borrow_detail_id?,fine_type?,payment_status? | — | JWT + fine_manage hoặc reader own | 200 L(Fine) | 403 reader chọn user_id |
| GET | `/api/fines/:id` | id | — | JWT + fine_manage hoặc reader own | 200 O(Fine) | 404 FINE_NOT_FOUND |
| POST | `/api/fines` | — | FineWrite | JWT + fine_manage | 201 O(Fine), Location | 404 BORROW_DETAIL_NOT_FOUND/BORROW_NOT_FOUND/FINE_RULE_NOT_FOUND; 400 INVALID_FINE_REFERENCE; nhóm Fine409 |
| PATCH | `/api/fines/:id/payment` | id | {payment_status:'paid'} | JWT + fine_manage | 200 O(Fine) | 404 FINE_NOT_FOUND; 409 FINE_NOT_PAYABLE |
| GET | `/api/usage-history` | P + D + action_type?,user_id? | — | JWT + report_view hoặc reader own | 200 L(Usage)+period | 403 own chọn user_id |
| GET | `/api/usage-history/me` | P + D + action_type?, không user_id | — | JWT, own | 200 L(Usage)+period | 403 chọn user_id |
| GET | `/api/statistics/overview` | D | — | JWT + report_view | 200 O(Overview)+period | 400 validation |
| GET | `/api/statistics/borrows` | D + group_by=day/week/month(default day),user_id? | — | JWT + report_view | 200 O(BorrowBucket[])+period có group_by | Không pagination hoặc bucket rỗng tự bù |
| GET | `/api/statistics/users` | P + D + user_id? | — | JWT + report_view | 200 L(UserStats)+period | Không phải user profile/lookup |
| GET | `/api/forecasts/me` | Không query | — | JWT, own | 200 O(Forecast) | 404 USER_NOT_FOUND; 503 FORECAST_CLOCK_UNAVAILABLE |
| GET | `/api/forecasts/users/:id` | id=user; không query | — | JWT + forecast_view | 200 O(Forecast) | 404 USER_NOT_FOUND; 503 FORECAST_CLOCK_UNAVAILABLE |
| POST | `/api/forecasts/users/:id/generate` | id=user; không query | Không sử dụng | JWT + forecast_view | Không nhánh success | Luôn503 FORECAST_GENERATION_NOT_CONFIGURED sau auth/permission/query/ID |

## Body và validation

`?` sau trường = optional, không phải kiểu dữ liệu dấu hỏi; null chỉ ở các trường nêu rõ. Chuỗi Unicode phải well-formed, VARCHAR tính code point; TEXT tối đa65535byte UTF-8. Body phải JSON object, Content-Type application/json cho các mutation có validator body.

- Register: name string trim1..100 không control, email string≤150 trim/lowercase đúng định dạng, password≥12ký tự và≤72byte (không trim), phone optional string≤20/null. Không nhận role/status/avatar. Login: email cùng quy tắc, password1..72byte.
- BookWrite: title string trim1..255, author trim1..150; publisher? trim≤150/null, category_id?/series_id? ID/null, description? TEXT/null, publication_year? integer0..65535/null. PUT gửi đầy đủ title/author, optional thiếu→null.
- CategoryWrite: name trim1..100, description? TEXT/null. PUT replacement, thiếu description→null.
- CopyWrite: book_id ID, barcode trim1..50; isbn? trim≤20/null, note? TEXT/null; condition_status good/damaged, availability_status available/maintenance. POST mặc định good/available khi thiếu, PUT bắt buộc hai trạng thái. PUT không đổi book_id. Read filters nhận availability borrowed/lost nữa; ghi hai trạng thái này409. ISBN và barcode UNIQUE theo từng copy. **GET ẩn note, PUT thiếu note→null: chưa triển khai form sửa đầy đủ trước khi giải quyết contract note.**
- BorrowWrite: user_id ID, copy_ids mảng1..100 ID không trùng; due_date UTC chính xác YYYY-MM-DDTHH:mm:ssZ, không milliseconds/offset khác, năm≥1000 và tương lai cả Node/DB; note? TEXT/null. Chỉ active borrower và available/good copies.
- ReturnWrite: hoặc items:[{copy_id,condition_after:'good'/'damaged'}]1..100 không trùng; hoặc {return_all:true,condition_after:'good'/'damaged'}. Không kết hợp; không nhận lost/cancelled. Trả damaged→maintenance, good→available; không tự tạo fine.
- FineWrite: borrow_detail_id ID, fine_rule_id ID, reason? trim≤255/null; không nhận amount/fine_type/paid_at. Server tính late fixed/per_day và damage fixed sau trả; lost/other giữ fail-closed. Payment chỉ ghi trạng thái paid toàn bộ, không phải thanh toán ngân hàng.
- Status filters: copy condition good/damaged; availability available/borrowed/lost/maintenance; borrow borrowed/partially_returned/returned/overdue/cancelled; fine_type late/damage/lost/other; payment_status unpaid/paid/waived; usage action_type login/borrow/return. ENUM đọc không mở mọi action ghi.

## DTO và thời gian

Các khóa dưới là khóa trả về, không tự tạo body từ tất cả khóa DTO.

| DTO | Trường |
|---|---|
| User | user_id:string,name,email,phone:null/string,avatar:null/string,status,created_at,updated_at,roles:string[],permissions:string[]; không password/hash |
| Book | book_id:string,category_id:null/string,series_id:null/string,title,author,publisher:null/string,description:null/string,publication_year:null/number,created_at,updated_at |
| Category | category_id:string,name,description:null/string,created_at |
| CopyPublic | copy_id:string,book_id:string,isbn:null/string,barcode,condition_status,availability_status,created_at,updated_at; không note |
| CopyStaff | CopyPublic + note:null/string, chỉ response POST/PUT |
| BorrowHeader | borrow_id:string,user_id:string,borrow_date,due_date,status,note:null/string,created_at |
| Borrow | BorrowHeader + details:[{borrow_detail_id:string,copy_id:string,returned_at:null/string,condition_before,condition_after:null/string,status}]; không detail note |
| Fine | fine_id,borrow_detail_id,borrow_id,copy_id,user_id:string; fine_rule_id:null/string; fine_type,amount:decimal string,reason:null/string,assessed_at,payment_status,paid_at:null/string |
| OverdueItem | borrow_id,user_id,borrow_detail_id,copy_id:string; due_date,days_overdue:number |
| OverdueSummary | borrow_id:string,due_date,status,as_of,is_overdue:boolean,overdue_count:number,details:[{borrow_detail_id,copy_id:string,days_overdue:number}] |
| Usage | usage_id,user_id:string,copy_id:null/string,action_type,action_date; không details JSON legacy |
| Overview | books_total,copies_total,users_total,borrows_total,borrows_in_period,borrowed_copies_in_period,returned_copies_in_period:number |
| BorrowBucket | period_start:string,borrow_count:number,borrowed_copy_count:number; phiếu và copy riêng |
| UserStats | user_id:string,borrow_count,usage_event_count,active_days,login_count,borrow_copy_events,return_copy_events:number; không PII/profile |
| Forecast | user_id:string,cutoff_date,status,model_version,target,timezone:'UTC',horizon_days:7,predictions:[{forecast_date,predicted_count:decimal string}],evaluation,persisted:false; insufficient_data có reason; ready thêm training/coverage |

Forecast ready: training={start_date,end_date,observed_days,borrow_count}, coverage={status:'verified',start_date,end_date}; evaluation evaluated={status,method,sample_count,mae:number,folds:[{train_start,train_end,excluded_origin_date,test_start,test_end,sample_count,mae}]}. Thiếu evaluation data có status insufficient_data/sample_count0/mae:null/folds:[], reason tùy nhánh. Forecast insufficient_data là200, predictions:[], không dựng zero khi thiếu coverage. SMA7 train bảy ngày đã kết thúc, bỏ ngày cutoff và dự báo ngày mai..+7. Không SELECT/ghi DuBaoTanSuat trong preview.

Catalog/User DATETIME đi qua mysql2 Date→JSON ISO; pool không timezone tường minh, legacy timezone **Chưa xác minh**. Borrow/fine/history DATE_FORMAT trả YYYY-MM-DD HH:mm:ss, ghi mới UTC; không parse bằng timezone browser ngầm. Forecast DATE là YYYY-MM-DD không dịch timezone; observed/as_of theo nguồn module. DECIMAL tiền/dự báo là string, không dùng float tính phạt. COUNT/year/pagination number có kiểm tra safe integer. Không suy schema/ENUM thành API đã có.

## Lỗi

[Middleware](../../Backend/src/middlewares/xu-ly-loi.js): {success:false,error:{code,message,details?:[{field,message}]}}; message hiển thị bằng text React, phân nhánh code/status. Ngoại lệ health/db như bảng trên. 401 có WWW-Authenticate: Bearer.

- Chung: 400 VALIDATION_ERROR,INVALID_JSON,INVALID_URL,INVALID_DATA,INVALID_REFERENCE; 413 PAYLOAD_TOO_LARGE; 415 UNSUPPORTED_MEDIA_TYPE; 409 DUPLICATE_VALUE,BOOK_IN_USE khi DB constraint phù hợp; 503 DATABASE_UNAVAILABLE gồm deadlock/lock timeout; 500 INTERNAL_ERROR; 404 ROUTE_NOT_FOUND. Không route nào nhất thiết có mọi lỗi; áp theo nhánh controller/service/model/middleware.
- JWT: 401 AUTHENTICATION_REQUIRED,INVALID_TOKEN,TOKEN_EXPIRED; 403 FORBIDDEN/ACCOUNT_INACTIVE; 503 JWT_NOT_CONFIGURED. Missing token có thể401 ngay cả khi secret chưa sẵn sàng.
- Return409: BORROW_NOT_RETURNABLE,BORROW_REQUIRES_REVIEW,BORROW_CHANGED,RETURN_STATE_CONFLICT,ALREADY_RETURNED.
- Fine409: FINE_STATE_CONFLICT,FINE_RULE_INACTIVE,FINE_RULE_UNSUPPORTED,FINE_REQUIRES_RETURN,NOT_LATE,DAMAGE_NOT_CONFIRMED,INVALID_FINE_RULE_AMOUNT,FINE_AMOUNT_OUT_OF_RANGE,DUPLICATE_FINE; payment FINE_NOT_PAYABLE.
- Không retry mutation mù sau timeout/503; đọc lại trạng thái trước khi quyết định gửi lại. Không biến error thành success hoặc fake response.

## Nguồn theo module và phạm vi kiểm chứng

Route→controller→service→model cùng tên tại Backend/src/{routes,controllers,services,models}; validators trong utils. Từng endpoint ở bảng có method/path đối chiếu runtime40/40, không trùng. Nguồn chi tiết:

| Module | Route / validation / hợp đồng chi tiết / test |
|---|---|
| Auth | [route](../../Backend/src/routes/xac-thuc.routes.js), [validator](../../Backend/src/utils/kiem-tra-xac-thuc.js), [JWT](../../Backend/src/utils/jwt.js), [API](../../Backend/docs/xac-thuc-api.md), [test](../../Backend/test/xac-thuc.test.js) |
| Books | [route](../../Backend/src/routes/sach.routes.js), [validator](../../Backend/src/utils/kiem-tra-sach.js), [controller](../../Backend/src/controllers/sach.controller.js), [API](../../Backend/docs/sach-api.md), [test](../../Backend/test/sach.test.js) |
| Categories | [route](../../Backend/src/routes/danh-muc.routes.js), [validator](../../Backend/src/utils/kiem-tra-danh-muc-ban-sao.js), [API](../../Backend/docs/danh-muc-api.md), [test](../../Backend/test/danh-muc-ban-sao-sach.test.js) |
| Copies | [route](../../Backend/src/routes/ban-sao-sach.routes.js), [validator](../../Backend/src/utils/kiem-tra-danh-muc-ban-sao.js), [model](../../Backend/src/models/ban-sao-sach.model.js), [API](../../Backend/docs/ban-sao-sach-api.md), [test](../../Backend/test/danh-muc-ban-sao-sach.test.js) |
| Borrow/return | [route](../../Backend/src/routes/phieu-muon.routes.js), [validator](../../Backend/src/utils/kiem-tra-phieu-muon.js), [model](../../Backend/src/models/phieu-muon.model.js), [API](../../Backend/docs/phieu-muon-api.md), [test](../../Backend/test/phieu-muon.test.js) |
| Overdue/fines | [overdue route](../../Backend/src/routes/qua-han.routes.js), [fine route](../../Backend/src/routes/tien-phat.routes.js), [validator](../../Backend/src/utils/kiem-tra-tien-phat.js), [formula](../../Backend/src/utils/quy-tac-tien-phat.js), [API fine](../../Backend/docs/tien-phat-api.md), [API overdue](../../Backend/docs/qua-han-api.md), [test](../../Backend/test/tien-phat-qua-han.test.js) |
| History/statistics | [history route](../../Backend/src/routes/lich-su-su-dung.routes.js), [stats route](../../Backend/src/routes/thong-ke.routes.js), [validator](../../Backend/src/utils/kiem-tra-thong-ke.js), [stats model](../../Backend/src/models/thong-ke.model.js), [history API](../../Backend/docs/lich-su-su-dung-api.md), [stats API](../../Backend/docs/thong-ke-api.md), [test](../../Backend/test/lich-su-thong-ke.test.js) |
| Forecast | [route](../../Backend/src/routes/du-bao.routes.js), [service](../../Backend/src/services/du-bao.service.js), [algorithm](../../Backend/src/utils/thuat-toan-du-bao.js), [API](../../Backend/docs/du-bao-api.md), [test](../../Backend/test/du-bao.test.js) |

QA-01 SELECT metadata:16 bảng/96 cột,16PK/16FK/6UNIQUE/3CHECK và46 index; tên/kiểu/NULL96 cột khớp schema.sql qua verifier; chưa so đầy đủ defaults/collation/cascade/CHECK expression. SELECT aggregate/grants: users0/active rules0/category_manage0, ba role admin/librarian/reader. Không đọc PII/hash, không ghi DB hoặc chạy schema/seed/migration.

172 unit/safety mới đạt trước tối ưu; HTTP đọc health/catalog200, protected thiếuJWT401, token sai gặp JWT_NOT_CONFIGURED503. Auth/luồng ghi thành công, concurrency và fine/forecast trên MySQL độc lập chưa chạy trong QA-01. Xem [verification](../../docs/quality-audit/QA01_VERIFICATION_REPORT.md) và [risk register](../../docs/quality-audit/QA01_RISK_REGISTER.md). Không lấy kết quả21 scenario TASK-018 làm lần chạy mới.
