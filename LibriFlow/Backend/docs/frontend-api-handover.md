# Hợp đồng bàn giao API cho Frontend — TASK-018

Xác minh **2026-11-07** từ `src/app-factory.js`, stack router thực tế, controller/validation/service/model và test. **40 cặp method/path**, không đổi URL hoặc JSON keys. Chi tiết kiểm thử: [báo cáo cuối](backend-final-report.md); điều kiện triển khai: [tồn đọng](backend-known-issues.md). Chưa triển khai React trong task này.

## Quy ước dùng chung

- Base URL cục bộ: `http://127.0.0.1:3000`; giữ tiền tố `/api`. Đường dẫn có/không `/` cuối đều được router hiện tại xử lý. `:id` là tham số, không gửi dấu `:` hoặc hai dấu `/` thay ID.
- Body JSON, header `Content-Type: application/json`; Bearer dùng `Authorization: Bearer <accessToken>`. Không gửi roles/permissions/status do client tự chọn. ID BIGINT nên giữ dạng chuỗi, không ép sang Number; DECIMAL amount/predicted_count là chuỗi thập phân.
- **P** dưới đây = `page=1&limit=10`, limit tối đa 100. List trả **L**: `{success:true,data:[...],pagination:{page,limit,total,totalPages}}`. **O** là `{success:true,data:{...}}`; **X** là `{success:true,data:null,message:"..."}`. Các ví dụ phía dưới định nghĩa từng DTO được bảng tham chiếu; đều là fixture minh họa, không phải dữ liệu chính.
- **D** = `start_date,end_date` dạng `YYYY-MM-DD` UTC, mặc định 30 ngày kết thúc hôm nay, tối đa 366 ngày tính cả hai đầu. History/statistics thêm `period:{start_date,end_date,timezone:"UTC"}`. Không dùng múi giờ máy React để suy lại ngày nghiệp vụ.
- Lỗi chung **E**: 400 validation/JSON/ID/query sai; 401 thiếu/sai/hết hạn token; 403 thiếu quyền/tài khoản không active; 404 không có/ngoài phạm vi tài nguyên; 409 UNIQUE/xung đột nghiệp vụ; 415 Content-Type; 429 auth rate limit; 503 cấu hình/DB chưa sẵn sàng; 500 lỗi ngoài dự kiến được che nội bộ. Public không tự trả 401/403; chỉ các lỗi phù hợp endpoint được áp dụng. Không phụ thuộc nguyên văn message, dùng status + error.code.
- Không coi tên role admin là quyền. Middleware đọc lại grant và trạng thái MySQL mỗi request. Reader không có quyền quản lý chỉ được xem tài nguyên của mình ở nhóm phiếu/quá hạn/phạt; user_id do JWT quyết định, query user_id bị 403 kể cả gửi ID của chính mình. Với GET chi tiết ngoài phạm vi trả 404.
- Ký hiệu kiểm chứng: **I** = luồng nêu trong dòng đã chạy MySQL test thật; **U** = phần thành công mới unit/mock; **K** = bị giữ fail-closed. I không có nghĩa mọi nhánh của endpoint đã được kiểm thử.

## Authentication và health (6 API)

| Method / endpoint | JWT / quyền | Query; body | Thành công / response mẫu | Lỗi chính; trạng thái |
| --- | --- | --- | --- | --- |
| GET /api/health | Public | Không; không | 200 `{success:true,message:"LibriFlow Backend is running"}` | I, không truy vấn DB |
| GET /api/health/db | Public | Không; không | 200 `{success:true,database:"connected"}` | 503 `{success:false,database:"disconnected"}`; I |
| POST /api/auth/register | Public | Không; A1 | 201 O(User), không trả token | E, 409 email trùng, 503 thiếu secret/reader role; I trên test, cấu hình chính hiện K |
| POST /api/auth/login | Public | Không; A2 | 200 O(Token) | E, 401 sai thông tin, 403 inactive/locked, 429; I trên test, cấu hình chính hiện K |
| GET /api/auth/me | JWT active | Không; không | 200 O(User) | E, 401/403; I |
| POST /api/auth/logout | JWT active | Không; không cần body | 200 X, message yêu cầu xóa token ở client | E, JWT còn hợp lệ đến hết hạn; U cho ngữ nghĩa logout, 401 smoke thật |

**A1**: `{"name":"Doc gia thu nghiem","email":"reader@example.invalid","password":"<mat-khau-rieng-toi-thieu-12-ky-tu>","phone":null}`. Name tối đa 100, email hợp lệ tối đa 150 và chuẩn hóa, phone tùy chọn tối đa 20, password ít nhất 12 ký tự và tối đa 72 byte UTF-8. Chỉ bốn khóa này. Reader role được server xác minh từ seed/DB, không thể đăng ký staff. **A2**: `{"email":"reader@example.invalid","password":"<mat-khau-rieng>"}`.

User ví dụ (có thể thêm timestamp/phone/avatar theo schema):

```json
{"success":true,"data":{"user_id":"30","name":"Doc gia thu nghiem","email":"reader@example.invalid","phone":null,"avatar":null,"status":"active","created_at":"2026-11-01T00:00:00.000Z","updated_at":"2026-11-01T00:00:00.000Z","roles":["reader"],"permissions":["book_view"]}}
```

Token: `{"success":true,"data":{"accessToken":"<JWT-khong-duoc-ghi-log>","tokenType":"Bearer","expiresIn":900}}`. JWT HS256 15 phút, không có refresh/revocation; server lấy secret từ environment. Login thành công **có ghi event**, không dùng tài khoản chính để chạy bài kiểm thử.

## Sách, danh mục, bản sao (16 API)

| Method / endpoint | JWT / quyền | Query; body | Thành công / DTO | Lỗi chính; kiểm chứng |
| --- | --- | --- | --- | --- |
| GET /api/books | Public | P, search; không | 200 L(Book) | E; I và smoke chính |
| GET /api/books/:id | Public | Không; không | 200 O(Book) | E, 404; U |
| POST /api/books | JWT + book_create | Không; B1 | 201 O(Book), Location | E, 400 FK; I |
| PUT /api/books/:id | JWT + book_update | Không; B1 đầy đủ | 200 O(Book) | E, 404/400 FK; U |
| DELETE /api/books/:id | JWT + book_delete | Không; không | 200 X | E, 404/409 có copies/liên quan; U |
| GET /api/categories | Public | P, search; không | 200 L(Category) | E; I và smoke chính |
| GET /api/categories/:id | Public | Không; không | 200 O(Category) | E, 404; U |
| POST /api/categories | JWT + category_manage | Không; C1 | 201 O(Category), Location | E, 409 tên trùng; I test, chính thiếu quyền → 403 |
| PUT /api/categories/:id | JWT + category_manage | Không; C1 đầy đủ | 200 O(Category) | E, 404/409; U, chính thiếu quyền → 403 |
| DELETE /api/categories/:id | JWT + category_manage | Không; không | 200 X | E, 404/409 còn sách; chặn xóa I, xóa thành công U; chính thiếu quyền → 403 |
| GET /api/book-copies | Public | P, search, book_id, condition_status, availability_status; không | 200 L(Copy), không note | E; I và smoke chính |
| GET /api/book-copies/:id | Public | Không; không | 200 O(Copy), không note | E, 404; U |
| GET /api/books/:id/copies | Public | P, search, condition_status, availability_status; không | 200 L(Copy), không note | E, 404 sách không có; U |
| POST /api/book-copies | JWT + copy_manage | Không; CP1 | 201 O(Copy), có note, Location | E, 400 book FK, 409 barcode/ISBN trùng; I |
| PUT /api/book-copies/:id | JWT + copy_manage | Không; CP1 đầy đủ hai trạng thái | 200 O(Copy), có note | E, 404/409 đang mượn/đổi sách; U |
| DELETE /api/book-copies/:id | JWT + copy_manage | Không; không | 200 X | E, 404/409 có lịch sử mượn/usage; chặn xóa I, xóa thành công U |

**B1**: `{"title":"Sach minh hoa","author":"Tac gia minh hoa","category_id":"1","series_id":null,"publisher":null,"description":null,"publication_year":2026}`. Title 255, author 150 bắt buộc; publisher 150, description TEXT UTF-8, category_id/series_id là FK nullable; publication_year theo SMALLINT UNSIGNED và validation source. Search chỉ title/author/publisher; không hỗ trợ lọc category_id ở GET sách. Xem [validation sách](sach-api.md).

**C1**: `{"name":"Danh muc minh hoa","description":null}`. Name bắt buộc, tối đa 100 và UNIQUE theo collation DB; description TEXT tùy chọn. Search tên/mô tả. Chặn xóa khi còn sách dù FK schema là SET NULL.

**CP1**: `{"book_id":"1","barcode":"COPY-DEMO-001","isbn":null,"condition_status":"good","availability_status":"available","note":null}`. Book_id/barcode bắt buộc; barcode tối đa 50 UNIQUE, isbn tối đa 20 nullable UNIQUE **trên từng copy**; condition good/damaged. POST mặc định good/available; PUT phải gửi hai trạng thái. CRUD chỉ cho availability available/maintenance; borrowed/lost chỉ qua nghiệp vụ phù hợp, không sửa trực tiếp copy đang có lượt mượn mở. Không chuyển copy sang book khác. Search theo barcode/ISBN; ENUM filter đọc cho phép available/borrowed/lost/maintenance. Nested copies không nhận query book_id.

**PUT là thay thế đầy đủ**: title/author, name hoặc book_id/barcode phải gửi lại; trường tùy chọn bỏ qua sẽ thành null. Không dùng PUT để gửi một trường như PATCH.

Response Book/Category/Copy minh họa (timestamp có thể được bổ sung theo DTO source):

```json
{"success":true,"data":{"book_id":"1","category_id":"1","series_id":null,"title":"Sach minh hoa","author":"Tac gia minh hoa","publisher":null,"description":null,"publication_year":2026}}
```

```json
{"success":true,"data":[{"category_id":"1","name":"Danh muc minh hoa","description":null}],"pagination":{"page":1,"limit":10,"total":1,"totalPages":1}}
```

```json
{"success":true,"data":{"copy_id":"21","book_id":"1","isbn":null,"barcode":"COPY-DEMO-001","condition_status":"good","availability_status":"available"}}
```

## Mượn/trả và quá hạn (6 API)

| Method / endpoint | JWT / quyền | Query; body | Thành công / DTO | Lỗi chính; kiểm chứng |
| --- | --- | --- | --- | --- |
| GET /api/borrows | JWT; borrow_manage toàn bộ, reader own | P, status; user_id chỉ staff; không body | 200 L(Borrow header) | E, 403 chọn user_id trái quyền; I |
| GET /api/borrows/:id | Cùng phạm vi | Không; không | 200 O(Borrow có details) | E, 404 ngoài phạm vi; I |
| POST /api/borrows | JWT + borrow_manage | Không; BR1 | 201 O(Borrow), Location | E, 404 user/copy, 409 không thể mượn; I |
| POST /api/borrows/:id/return | JWT + return_process | Không; BR2 hoặc BR3 | 200 O(Borrow sau trả) | E, 400 copy ngoài phiếu, 404, 409 trả lặp/bất nhất; I |
| GET /api/overdues | JWT; borrow_manage toàn bộ, reader own | P, borrow_id, user_id chỉ staff; không | 200 L(Overdue detail), thêm as_of | E; U list, summary thật I |
| GET /api/borrows/:id/overdue | Cùng phạm vi | Không; không | 200 O(Overdue summary) | E, 404 ngoài phạm vi; I |

**BR1**: `{"user_id":"30","copy_ids":["21","22"],"due_date":"2030-01-15T10:00:00Z","note":null}`; thay ngày bằng UTC tương lai tại lúc gửi. 1–100 copy khác nhau, ID tồn tại, user active, copy good + available và không có loan mở. Không nhận status/borrow_date do client gửi. Reader không được lập phiếu, kể cả own; staff dùng user_id để chỉ người mượn có kiểm tra quyền.

**BR2** trả một phần: `{"items":[{"copy_id":"21","condition_after":"good"}]}`. **BR3** trả mọi copy còn mở: `{"return_all":true,"condition_after":"good"}`. Không kết hợp hai hình thức; condition_after chỉ good/damaged. Damaged chuyển maintenance, good chuyển available; giữ lịch sử, không tự tạo tiền phạt.

Borrow chi tiết ví dụ (list chỉ có header; note ở header, chi tiết gồm tình trạng/ngày trả theo [API phiếu mượn](phieu-muon-api.md)):

```json
{"success":true,"data":{"borrow_id":"10","user_id":"30","borrow_date":"2026-11-07 09:00:00","due_date":"2030-01-15 10:00:00","status":"borrowed","note":null,"details":[{"borrow_detail_id":"11","copy_id":"21","status":"borrowed","returned_at":null,"condition_before":"good","condition_after":null}]}}
```

Transaction khóa hàng theo thứ tự copy ID; rollback toàn bộ nếu có copy không hợp lệ hoặc ghi event lỗi. Trả một phần → partially_returned, trả hết → returned. Danh sách có thể lọc status borrowed/partially_returned/returned/overdue/cancelled; không cung cấp API tùy ý chuyển cancelled/lost.

Quá hạn = hạn trả trước giờ UTC MySQL + header đang mở + detail borrowed chưa returned_at; API GET không UPDATE status. `days_overdue=ceil(giây trễ/86400)` chỉ là chỉ số ngày, không phải tiền. Summary ví dụ:

```json
{"success":true,"data":{"borrow_id":"10","due_date":"2026-11-01 00:00:00","status":"partially_returned","as_of":"2026-11-02 00:00:01","is_overdue":true,"overdue_count":1,"details":[{"borrow_detail_id":"11","copy_id":"21","days_overdue":2}]}}
```

Overdue list dùng L với mỗi dòng `{borrow_id,user_id,borrow_detail_id,copy_id,due_date,days_overdue}`, thêm `as_of` ở cấp ngoài. Không trả note/email/phone. SQL DATETIME ở nhóm này là chuỗi UTC không có hậu tố Z theo hợp đồng mới; dữ liệu legacy chưa xác minh, không áp timezone máy client vào dữ liệu cũ để giả định chính xác.

## Tiền phạt (4 API)

| Method / endpoint | JWT / quyền | Query; body | Thành công / DTO | Lỗi chính; kiểm chứng |
| --- | --- | --- | --- | --- |
| GET /api/fines | JWT; fine_manage toàn bộ, reader own | P, borrow_id, borrow_detail_id, fine_type, payment_status, user_id chỉ staff; không | 200 L(Fine) | E; U dữ liệu không rỗng |
| GET /api/fines/:id | Cùng phạm vi | Không; không | 200 O(Fine) | E, 404 ngoài phạm vi; U |
| POST /api/fines | JWT + fine_manage | Không; F1 | 201 O(Fine), Location | E, 404 rule/detail, 409 không đủ điều kiện/trùng; I nhánh thiếu rule, thành công U |
| PATCH /api/fines/:id/payment | JWT + fine_manage | Không; F2 | 200 O(Fine paid) | E, 404, 409 paid/waived/bất nhất; I nhánh không tồn tại, thành công U |

**F1**: `{"borrow_detail_id":"11","fine_rule_id":"1","reason":null}`. Không gửi amount/fine_type/payment_status/paid_at. Chỉ sau khi trả và có rule active: late fixed hoặc per_day tính ceil số ngày trễ theo thời gian trả thực tế; damage fixed khi good→damaged. Số tiền lấy cấu hình, tính số nguyên cent, không âm. Lost/other/damage per_day chưa hỗ trợ → 409. Không phạt trùng cùng detail/type dù khoản trước đã paid/waived. **F2** chỉ `{"payment_status":"paid"}`; server ghi paid_at, không thanh toán lặp, không partial/waive/refund/cổng thanh toán. Reason tối đa 255 tùy chọn.

Fine ví dụ **chỉ cấu trúc, mức tiền giả định trong tài liệu, không phải mức phạt được phê duyệt**:

```json
{"success":true,"data":{"fine_id":"1","borrow_detail_id":"11","fine_rule_id":"1","fine_type":"late","amount":"0.00","reason":null,"assessed_at":"2026-11-07 10:00:00","payment_status":"unpaid","paid_at":null}}
```

DTO còn có borrow_id/copy_id/user_id từ JOIN theo source. Không có API quản trị quy định phạt trong phạm vi này. Hiện chưa có active rule ở DB chính hoặc test seed; không hardcode mức tiền để làm nút tạo phạt hoạt động. Frontend phải báo chưa cấu hình và không tuyên bố đã thanh toán khi request lỗi.

## Lịch sử và thống kê (5 API)

| Method / endpoint | JWT / quyền | Query; body | Thành công / DTO | Lỗi chính; kiểm chứng |
| --- | --- | --- | --- | --- |
| GET /api/usage-history | JWT; report_view toàn bộ, reader own | P, D, action_type, user_id chỉ report_view; không | 200 L(Usage) + period | E; I reader/scope |
| GET /api/usage-history/me | JWT active, luôn own | P, D, action_type; không | 200 L(Usage) + period | E, gửi user_id 403; I |
| GET /api/statistics/overview | JWT + report_view | D; không | 200 O(Overview) + period | E, 403; I |
| GET /api/statistics/borrows | JWT + report_view | D, group_by=day/week/month, user_id; không | 200 `{success:true,data:[Series],period:{...,group_by}}` | E, tối đa 400 bucket; I |
| GET /api/statistics/users | JWT + report_view | P, D, user_id; không | 200 L(UserStats) + period | E; I |

Usage `action_type` chỉ login/borrow/return. DTO không trả JSON details hoặc hồ sơ; ví dụ một dòng `{"usage_id":"1","user_id":"30","copy_id":"21","action_type":"borrow","action_date":"2026-11-07 09:00:00"}`. Login ghi một event, mượn/trả ghi từng copy cho borrower cùng transaction; GET không ghi. Chỉ các event có source/version tin cậy tham gia thống kê hoạt động.

```json
{"success":true,"data":{"books_total":2,"copies_total":3,"users_total":2,"borrows_total":2,"borrows_in_period":2,"borrowed_copies_in_period":3,"returned_copies_in_period":1},"period":{"start_date":"2026-11-01","end_date":"2026-11-03","timezone":"UTC"}}
```

Series ví dụ `{"period_start":"2026-11-01","borrow_count":2,"borrowed_copy_count":3}`. Một phiếu nhiều copy tính một borrow_count; loại cancelled. Tuần bắt đầu thứ Hai, tháng dùng YYYY-MM. Không tự điền bucket trống bằng 0. Overview inventory/users là hiện tại, không phải snapshot tại end_date; trả theo returned_at.

UserStats ví dụ `{"user_id":"30","borrow_count":2,"usage_event_count":4,"active_days":1,"login_count":1,"borrow_copy_events":2,"return_copy_events":1}`. Chỉ người có hoạt động trong kỳ; không trả PII. Tổng hợp phiếu/event riêng tránh nhân đếm khi JOIN; active_days đếm ngày có event tin cậy, không phải số lần đến thư viện vật lý.

## Dự báo (3 API)

| Method / endpoint | JWT / quyền | Query; body | Thành công / DTO | Lỗi chính; trạng thái |
| --- | --- | --- | --- | --- |
| GET /api/forecasts/me | JWT active, own | Không nhận query; không body | 200 O(Forecast), ready hoặc insufficient_data | E; I insufficient_data, ready U |
| GET /api/forecasts/users/:id | JWT + forecast_view | Không nhận query; không | 200 O(Forecast) | E, 404 user; I insufficient_data |
| POST /api/forecasts/users/:id/generate | JWT + forecast_view, sau đó cổng đóng | Không nhận query; không cần body | **Không có response thành công hiện tại** | 401/403 trước gate, ID sai 400; 503 FORECAST_GENERATION_NOT_CONFIGURED; K, I |

```json
{"success":true,"data":{"user_id":"30","cutoff_date":"2026-11-07","status":"insufficient_data","reason":"COVERAGE_UNVERIFIED","model_version":"borrow_daily_sma7_v1","target":"borrow_receipts_per_user_per_day","timezone":"UTC","horizon_days":7,"predictions":[],"evaluation":{"status":"insufficient_data","sample_count":0,"mae":null,"folds":[]},"persisted":false}}
```

SMA7 dùng số phiếu/người/ngày của bảy ngày UTC đã kết thúc; không dùng login hoặc số copy. Chỉ bù ngày không có phiếu thành 0 khi coverage liên tục đã được audit phía server; không nhận coverage/cutoff từ client. Ready có training và bảy predictions `{forecast_date,predicted_count}` cho ngày mai..D+7. Mọi preview persisted=false; không lưu DuBaoTanSuat. MAE chỉ hiện khi đủ dữ liệu backtest tách thời gian; chưa có MAE thực tế. Xem [thuật toán](thuat-toan-du-bao.md).

## Ma trận vai trò theo seed, không thay grant thực tế

| Nhóm | Public | Reader | Librarian | Admin |
| --- | --- | --- | --- | --- |
| Đọc sách/danh mục/copies, health | Có | Có | Có | Có |
| Auth/me, logout, usage/me, forecasts/me | Không | Own | Own | Own |
| Phiếu/quá hạn/phạt/history | Không | Own theo phạm vi trên | Toàn bộ khi có grant | Toàn bộ khi có grant |
| Tạo/cập nhật sách | Không | Không | book_create/book_update | Cùng quyền |
| Xóa sách | Không | Không | Không có book_delete trong seed | book_delete |
| Ghi copies/danh mục | Không | Không | copy_manage/category_manage | Cùng quyền |
| Lập phiếu/trả | Không | Không | borrow_manage/return_process | Cùng quyền |
| Tạo phạt/ghi paid | Không | Không | fine_manage, còn cần cấu hình | Cùng điều kiện |
| Thống kê | Không | Không | report_view | report_view |
| Forecast user/generate | Không | Không | forecast_view; generate vẫn khóa | Cùng điều kiện |

Seed mới gán category_manage cho admin/librarian; database chính chưa áp dụng migration 001 nên role label không đủ. Tài khoản mới đăng ký chỉ reader. Không thiết kế nút “trở thành admin”.

## Kết nối React và xử lý lỗi

Vite chỉ cấu hình `VITE_API_BASE_URL=http://127.0.0.1:3000`; biến VITE được công khai cho trình duyệt, tuyệt đối không chứa DB password/JWT_SECRET. Ví dụ fetch dùng token do login trả, không nhúng token mẫu thật:

```js
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const payload = await response.json();
if (!response.ok) throw { status: response.status, ...payload.error };
return payload.data;
```

Lưu token trong bộ nhớ theo thiết kế UI; không ghi console/token vào URL, tránh lưu lâu dài chưa đánh giá XSS. Khi logout, gọi endpoint nếu còn token rồi xóa token/profile phía client. Khi 401 xóa phiên và yêu cầu đăng nhập lại; 403 báo thiếu quyền, không tự gửi role/user_id khác. 400 hiển thị lỗi field từ details nếu có; 409 tải lại trạng thái trước thao tác tiếp; 503 báo dịch vụ/chức năng chưa sẵn sàng, không retry ghi mù hoặc tạo dữ liệu giả. Kiểm tra cả response.ok và success; health/db là ngoại lệ cấu trúc không có error object.

Lỗi điển hình: `{"success":false,"error":{"code":"FORBIDDEN","message":"Không có quyền thực hiện thao tác này."}}`; validation có thể kèm details, xem middleware và tài liệu module. Không cần/không được dựa vào SQL/stack nội bộ. Dùng permissions từ /auth/me để trình bày nút; server vẫn là bên quyết định quyền.

**Điều kiện bàn giao hiện tại:** thiếu JWT secret hợp lệ và chưa có user ở DB chính, category_manage chưa migrate, chưa có quy định phạt, generate khóa. Có thể dựng UI public và thiết kế UI auth/nghiệp vụ từ hợp đồng; cần môi trường dev/demo được duyệt trước thử các request ghi từ Frontend. Runner integration tạo instance dùng một lần và tự dừng, không cung cấp backend demo chạy lâu dài. Không chạy bài test trên DB chính. [Hướng dẫn integration](kiem-thu-tich-hop.md) ghi rõ phần đã và chưa kiểm chứng.
