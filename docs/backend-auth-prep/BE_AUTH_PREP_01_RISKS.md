# BE-AUTH-PREP-01 — Risks và các task riêng

Xác minh **2026-11-20**. P0 critical/P1 chặn nghiệm thu auth thật/P2 phạm vi hoặc bảo mật cần quyết định/P3 tài liệu. Không phát hiện P0 trong phạm vi này, **không phải chứng nhận không có lỗ hổng**; chưa pentest/advisory/browser/production audit.

| ID/mức | Bằng chứng/trạng thái | Ảnh hưởng FE06 | Hành động riêng, chưa thực hiện |
| --- | --- | --- | --- |
| A01 P1 | JWT_SECRET thiếu;utility và HTTP fail-closed503 |Không login thật với cấu hình hiện tại |Operator cấp secret mạnh cho môi trường test/dev được duyệt,không sửa algorithm/TTL hoặc VITE_. |
| A02 P1 | TEST_DB_* chưa cấu hình;runner dừng MISSING_TEST_DB_NAME |Chưa kiểm MySQL login/register/event/role end-to-end mới |DEV-TEST-ENV: cung cấp target hiện hữu cô lập,pins,grants,marker vàaccount đúng guard;không chạy setup/provision trong task này. |
| A03 P1 | Main users0;chưa có account dev được bàn giao |Chưa có phiên thực tế để browser nghiệm thu |DEV-ACCOUNT: tối đa3fixture theo [plan](BE_AUTH_PREP_01_TEST_ACCOUNTS.md),chỉ target cô lập vàrun manifest;không register vào main. |
| A04 P1 cho kiểm thử FE06 | Session persistence/reload/multi-tab chưa được duyệt |Không ngầm triển khai localStorage/refresh/cookie |Duyệt [memory-only proposal](BE_AUTH_PREP_01_SESSION_POLICY.md) hoặc giao thiết kế khác;chưa sửa Frontend. |
| A05 P2 | Logout stateless,không refresh/revoke/JWT logout-all |Token bị lấy vẫn có thể dùng đến expiry nếu account active;reload/tab UX có giới hạn |Giữ rõ semantics;chỉ thêm revoke/refresh/cookie bằng task auth riêng nếu có yêu cầu. |
| A06 P2 | Main MySQL account có global privilege/GRANT OPTION |Không phù hợp dùng làm test runtime/least-privilege deployment |DB-PRIVILEGES: thiết kế account test/app đúng quyền;không tự REVOKE/GRANT hoặc thay config hiện tại. |
| A07 P2 theo feature | category_manage không có ởmain,dù source/seed cần |Ghi danh mục403;kể cảrole admin;không chặn riêng login/me |BE-GRANTS riêng;cần target/grant approval,không chạy migration/seed ở đây. |
| A08 P2 | Login ghi usage event;khi ghi lỗi không trảtoken |Không retry login mù/không smoke login ởmain;timeout có thể chưa rõ event |Tôn trọng trạng thái lỗi,kiểm event trên test DB;không bỏ logging để mở login. |
| A09 P2 trước production | CORS wildcard,loopback,limiter memory/IP;chưa testTLS/proxy/multi-instance |Public exposure chưa được nghiệm thu;headers Node không thaybrowser |DEPLOY-SECURITY/QA-browser riêng;không đổi CORS/trust-proxy/cookie ở task này. |
| A10 P3 | Một số docs cũ dùng DB_NAME test chung hoặc snapshot cũ;root lịch sử có đường dẫn Backend/kiem-thu sau rename Frontend |Dễ hiểu nhầm môi trường hoặc dùng tên không allowlist |Dùng source hiện tại Backend/test vàguard thực tế;hướng dẫn mới nêu rõ,không sửa lại Frontend/hàng loạt lịch sử. |

Role/permission thay đổi và account inactive được kiểm mỗi request;đó không phải server logout/revocation endpoint. Main role matrix hiện có11/9/1permission choadmin/librarian/reader;không tạo quyền hay cấp admin để bỏ qua gaps.

Các gaps profile/password reset/email verification/user CRUD/lookup/upload/forecast/fine rules của QA01 vẫn xử lý theo feature;không tái audit/đổi chúng trong BE-AUTH-PREP-01. Không gom các vấn đề này thành điều kiện phải hoàn thành mọi nghiệp vụ trước khi viết UI login theo contract.

Đủ source/contract/unit để lập task FE06; **chưa đủ bằng chứng nghiệm thu auth thực tế**, cần giải quyết A01..A04 và kiểm chứng MySQL/browser. Những thay đổi JWT/middleware/password/permissions/schema nếu được đề xuất sau này phải có phê duyệt riêng.
