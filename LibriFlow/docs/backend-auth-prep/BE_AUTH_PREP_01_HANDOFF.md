# BE-AUTH-PREP-01 — Handoff cho FE06

Xác minh **2026-11-20**. **Hoàn tất audit, tài liệu và kiểm tra an toàn. Login trên MySQL cô lập mới chưa được kiểm chứng vì thiếu môi trường; chưa sẵn sàng nghiệm thu FE06 end-to-end.** Chưa triển khai FE06.

## Kết quả

- [Audit](BE_AUTH_PREP_01_AUDIT.md): 4 endpoint auth, 3 role, Bearer JWT HS256/900 giây, bcrypt cost12; principal/RBAC đọc lại DB, login ghi event.
- [API contract](BE_AUTH_PREP_01_API_CONTRACT.md): request/response, validation, errors, headers, logout không revoke và các API chưa có.
- [Session policy](BE_AUTH_PREP_01_SESSION_POLICY.md): memory-only và login lại khi reload là **đề xuất chưa duyệt**. Không tự chọn storage, cookie, refresh hoặc đồng bộ logout nhiều tab.
- [Test accounts](BE_AUTH_PREP_01_TEST_ACCOUNTS.md): phương án tối đa 3 account giả trong target đã xác minh; kiểm grants/UUID/marker/run manifest và cleanup. Chưa tạo hoặc bàn giao credential thật.
- [Test report](BE_AUTH_PREP_01_TEST_REPORT.md): baseline 172/172, sau **175/175**, 0 fail/skip. Ba test mới có HTTP/crypto thật nhưng model in-memory, SQL bị chặn. Chín smoke checks với cấu hình hiện tại và DB chỉ SELECT đạt.
- [Risks](BE_AUTH_PREP_01_RISKS.md): phân loại blocker và task riêng; chưa tự sửa auth/nghiệp vụ.

JWT_SECRET hiện **thiếu**; process không có TEST_DB_*. Runner từ chối MISSING_TEST_DB_NAME trước kết nối/ghi. Main MySQL8.0.40 có users=0, roles=3, category_manage=0. Account kết nối DB có global privileges/GRANT OPTION, không dùng làm test runtime. Không in secret/token/password/hash hoặc identity connection.

## File và phạm vi thay đổi

Tạo 7 tài liệu trong docs/backend-auth-prep và [Backend/test/chuan-bi-xac-thuc.test.js](../../Backend/test/chuan-bi-xac-thuc.test.js). Cập nhật liên kết/trạng thái trong Backend/README.md, Backend/docs/xac-thuc-api.md và 5 docs dự án: PROJECT_CONTEXT, DATABASE, DECISIONS, TASKS, HANDOFF. Không thêm dependency, script provision hoặc thay package/npm commands.

Giữ nguyên source auth/authorization/JWT/password/controller/model/validator/runtime config. Không thay algorithm, payload, expiration, middleware, API contract, seed/migration/schema hoặc business logic. **Không sửa bất kỳ file Frontend nào**, kể cả docs và tên đã Việt hóa. Baseline HEAD8d4a1d2 sạch; không reset/unstage/stage/commit/push.

Kiểm cuối bằng SHA256: 97/97 file Frontend và 83/83 file Backend được bảo vệ khớp baseline; HEAD/index entries không đổi. Chỉ 7 docs cũ sửa, 8 file mới, không xóa. 147 liên kết nội bộ, line anchors, UTF-8/whitespace, syntax test mới và diff-check đạt.

## Chứng cứ và giới hạn

Unit cũ đã có valid login/JWT/me/logout/403 và status/permission changes bằng model giả. Ba test mới xác minh password không trim, register limiter5 và CORS Bearer preflight không bypass auth. Không coi token ký thật với fixture RAM là login MySQL thật.

Smoke dùng factory/model SQL hiện hữu với proxy chặn mọi SQL ghi/transaction và JWT config hiện tại thiếu: 1 SELECT1 cho health DB, 0 SQL auth, 0 account tạo. Register/login body đúng cấu trúc trả503 trước ghi. Server/pool kiểm thử đã đóng; main users vẫn0 sau kiểm tra.

Integration ghi mới **chưa chạy**. Không chạy setup/instance-isolee để vượt blocker; kết quả TASK018 ngày2026-11-07 là lịch sử. Fixture RAM không được giữ thành account dev dùng lâu dài.

Không chạy Frontend tests/lint/build vì không sửa Frontend; kiểm hash bảo toàn thay cho tuyên bố regression mới. Browser FE06, TLS/proxy, security advisory, pentest, tải lớn và cạnh tranh MySQL chưa được kiểm trong task này.

## Điều kiện cho FE06

Có thể giao **task Frontend FE06 riêng để triển khai theo contract đã xác minh** sau khi người dùng chấp nhận bàn giao. Trước nghiệm thu login thật phải:

1. Có target test/dev cô lập đã xác minh, process ứng dụng kết nối đúng target và account MySQL test-schema-only; không dùng main DB/credential.
2. Operator cung cấp JWT_SECRET mạnh riêng và account reader/staff được phép; không gửi credential vào Git/chat/report.
3. Kiểm register/login/me/protected permission/logout/expired/inactive và event persistence bằng MySQL thật với guard, cleanup và evidence mới.
4. Duyệt policy memory-only/reload/multi-tab/cache hoặc giao Backend task cho phương án khác; không triển khai persistence âm thầm.
5. Kiểm browser CORS/Network/UX, 401/403, race/cache isolation, expiry và offline.

Không thay .env thật hoặc ghi DB chính. Không tự sửa các vấn đề cần phê duyệt. Dừng và chờ người dùng nghiệm thu BE-AUTH-PREP-01.
