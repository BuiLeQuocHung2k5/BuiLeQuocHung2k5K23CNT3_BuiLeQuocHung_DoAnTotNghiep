# BE-AUTH-PREP-01 — Contract tích hợp FE-06

Đối chiếu source **2026-11-20**, không tạo/đổi API. Prefix `/api/auth` từ [factory:56](../../Backend/src/app-factory.js#L56); [router](../../Backend/src/routes/xac-thuc.routes.js), [controller](../../Backend/src/controllers/xac-thuc.controller.js), [service](../../Backend/src/services/xac-thuc.service.js), [validator](../../Backend/src/utils/kiem-tra-xac-thuc.js), [model](../../Backend/src/models/xac-thuc.model.js), [errors](../../Backend/src/middlewares/xu-ly-loi.js).

## Request/response

| Method/path | Auth/body | Thành công | Lỗi riêng chính |
| --- | --- | --- | --- |
| POST /api/auth/register | Public; JSON{name,email,password,phone?}; không role/status/permission/avatar |201 `{success:true,data:User}`; không token |400 VALIDATION_ERROR;409 EMAIL_ALREADY_EXISTS;503 JWT_NOT_CONFIGURED/REGISTRATION_NOT_CONFIGURED;429 TOO_MANY_ATTEMPTS |
| POST /api/auth/login | Public; JSON{email,password}; không thêm field |200 `{success:true,data:{accessToken:string,tokenType:'Bearer',expiresIn:900}}`; không profile |400 VALIDATION_ERROR;401 INVALID_CREDENTIALS;403 ACCOUNT_INACTIVE;503 JWT_NOT_CONFIGURED;429 TOO_MANY_ATTEMPTS |
| GET /api/auth/me | Authorization: Bearer <access token>; không body/query nghiệp vụ |200 `{success:true,data:User}` với principal mới đọc từ DB |401 AUTHENTICATION_REQUIRED/INVALID_TOKEN/TOKEN_EXPIRED;403 ACCOUNT_INACTIVE;503 JWT_NOT_CONFIGURED/DB |
| POST /api/auth/logout | Bearer; không cần body |200 `{success:true,data:null,message:string}` yêu cầu client xóa token |Cùng lỗi xác thực như me; không revoke JWT |

Placeholder token ở bảng chỉ mô tả header, không phải credential. Không gửi token qua URL/query/cookie; Backend không đọc các kênh đó để xác thực. Không có cookie session/Set-Cookie trong auth source. Giữ withCredentials=false theo Bearer hiện tại; không tự triển khai refresh.

User là allowlist: user_id dạng string; name,email; phone/avatar nullable; status; created_at/updated_at; roles:string[];permissions:string[]. Model SELECT không lấy password cho principal. Không parseInt ID. Timestamps theo mysql2 Date/JSON hiện hữu; timezone pool không đặt tường minh, chưa quan sát profile timestamp trên DB thật vì users0. Không đổi contract ngày giờ trong task này.

Register thành công không đăng nhập tự động: cần login riêng rồi me. Login không trả role; không suy role từ form/email hoặc decode token. Role/permission do me và Backend quyết định; giao diện ẩn action không thay authorization.

## Validation và thứ tự xử lý

- name: string Unicode hợp lệ, trim,1..100code point; email: trim/lowercase,≤150 và định dạng cơ bản; phone: omitted/null hoặc string trim≤20; name/email/phone cấm ký tự điều khiển.
- Password: register≥12code point,login≥1; cả hai≤72byte UTF-8 và Unicode hợp lệ; **giữ nguyên khoảng trắng**, không trim ở FE. Validator không đặt tiêu chí bắt buộc chữ hoa/số/ký hiệu.
- Body phải object, không array/null; unknown fields trả400 VALIDATION_ERROR với details:[{field,message}]. Login chỉ email/password; register chỉ name/email/password/phone. Không mặc định Backend nhận rememberMe/roles/captcha.
- Parser JSON256kb chạy trước auth router. Body JSON lỗi400 INVALID_JSON; quá lớn413 PAYLOAD_TOO_LARGE. Controller yêu cầu application/json cho register/login, sai415 UNSUPPORTED_MEDIA_TYPE. Validation sai có thể400 trước khi phát hiện JWT config thiếu; không suy mọi request auth sẽ503.
- Register limiter5/login limiter10 lần mỗi15phút/IP chạy trước controller; có429 và Retry-After/RateLimit headers. Không tự retry đăng nhập/đăng ký; attempt không hợp lệ cũng có thể bị tính giới hạn.

## Error envelope và header

`{success:false,error:{code:string,message:string,details?:[{field,message}]}}`. UI render text và dùng code/status để phân loại, không HTML/stack/raw SQL/cause/config headers. Không tự sửa envelope hoặc làm mất Axios status.

| HTTP/code | Ý nghĩa cho FE06 |
| --- | --- |
|400 VALIDATION_ERROR/INVALID_JSON | Sửa input/request; không xóa session vì lỗi form. |
|401 INVALID_CREDENTIALS | Sai login,unknown account/hash không hỗ trợ; thông báo form chung, không xác nhận email có tồn tại. |
|401 AUTHENTICATION_REQUIRED | Thiếu/sai định dạng Authorization; không đồng nghĩa JWT_SECRET đã sẵn sàng. |
|401 INVALID_TOKEN/TOKEN_EXPIRED | Protected request không còn phiên dùng được; xử lý theo policy được duyệt. |
|403 ACCOUNT_INACTIVE | Tài khoản inactive/locked; khác với thiếu permission. |
|403 FORBIDDEN | Endpoint nghiệp vụ thiếu permission; không lặp login/đổi user_id để vượt quyền. Auth me/logout không có permission gate riêng. |
|409 EMAIL_ALREADY_EXISTS | Register bị trùng; không replay tự động. |
|413/415 | Kích thước/định dạng; không có upload API auth. |
|429 TOO_MANY_ATTEMPTS | Tôn trọng thời gian/header; không vòng lặp retry. |
|503 JWT_NOT_CONFIGURED | Server chưa sẵn sàng, không phải sai mật khẩu. |
|503 REGISTRATION_NOT_CONFIGURED | Thiếu reader role đúng seed; registration rollback. |
|503 DATABASE_UNAVAILABLE | Lỗi kết nối/locking được error middleware nhận diện; login event lỗi cũng có thể làm login thất bại. |
|500 INTERNAL_ERROR | Lỗi chưa được phân loại; không trả stack/SQL, không tự kết luận login đã thành công. |

Mọi401 qua error middleware có WWW-Authenticate: Bearer. Response đi qua auth router có Cache-Control:no-store, kể cả lỗi controller/service/limiter. Lỗi JSON parser trước router và CORS preflight có thể không mang header này; không cam kết mọi response đều có no-store. Preflight được cors() xử lý trước auth, không cấp quyền cho GET/POST tiếp theo.

## Logout, expiry và API chưa có

JWT phát hành hạn900giây kể từ iat, không sliding session/refresh. POST logout chỉ trả hướng dẫn client xóa token, **không vô hiệu hóa chữ ký/token**. Token vẫn có thể dùng tới exp nếu account active và quyền còn phù hợp. Đổi status/quyền có hiệu lực request tiếp theo vì principal được đọc lại; không có logout-all/revocation list.

Không có refresh,change password,forgot/reset password,verify email,update profile,admin cấp role/user CRUD trong auth router hiện tại. Không tạo endpoint giả để đáp ứng UI. [Session policy](BE_AUTH_PREP_01_SESSION_POLICY.md) là đề xuất chưa triển khai; [test report](BE_AUTH_PREP_01_TEST_REPORT.md) phân biệt HTTP/crypto với MySQL thật.
