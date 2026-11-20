# Bàn giao hiện tại

Cập nhật **2026-11-20 · BE-AUTH-PREP-01**. [Lịch sử](TASKS.md), [handoff Auth](backend-auth-prep/BE_AUTH_PREP_01_HANDOFF.md), [contract FE06](backend-auth-prep/BE_AUTH_PREP_01_API_CONTRACT.md), [test report](backend-auth-prep/BE_AUTH_PREP_01_TEST_REPORT.md).

- Đã audit 4 endpoint auth/3 role, JWT HS256/900giây, bcrypt12 và principal/RBAC đọc DB mỗi request. Logout không revoke, không refresh/cookie. Runtime giữ nguyên; chưa triển khai FE06.
- Baseline Backend172/172 và cuối **175/175**,0fail/skip; thêm3test HTTP/crypto thật với model RAM và database stub chặn SQL. Không đổi test/assertion cũ hoặc dependency.
- JWT_SECRET hiện thiếu; TEST_DB_* chưa cấu hình, integration runner dừng MISSING_TEST_DB_NAME trước kết nối/ghi. **Chưa có MySQL login thành công mới, chưa đủ điều kiện nghiệm thu FE06 end-to-end.** Không tự dựng schema/seed/instance hoặc tạo account.
- Main chỉ SELECT/metadata/SHOW GRANTS: MySQL8.0.40,16bảng,users0,roles3,category_manage0;main account có global privilege/GRANT OPTION, không dùng làm test runtime. Không đọc profile/hash/PII hoặc in credential/identity.
- Smoke9/9 current config qua factory/model thật với proxy read-only:1SELECT1,0SQLauth/0ghi/0accounttạo;login/register body hợp lệ503 đúng fail-closed. Đã đóng server/pool kiểm thử. Không gọi login thật ởmain không có guard.
- [Session policy](backend-auth-prep/BE_AUTH_PREP_01_SESSION_POLICY.md) memory-only/reload login lại là **đề xuất chưa duyệt**;cần chốt multi-tab/cache/401/403. [Account plan](backend-auth-prep/BE_AUTH_PREP_01_TEST_ACCOUNTS.md) tối đa3account, chỉ môi trường cô lập được xác minh, không credential thực trong Git/docs.
- Tạo7docs Auth+1testfile, cập nhật2docs Backend và5docs root. Không sửa Frontend (kể cảdocs/tên đã Việt hóa), source auth/JWT/password/middleware/API/schema/env/package/lock hoặc Git index/HEAD. Không cần chạy lại Frontend tests/lint/build;hash bảo toàn được kiểm riêng.
- Đủ contract/unit để giao task FE06 riêng sau nghiệm thu, cần operator cấp JWT/account/môi trường test đúng guard và kiểm MySQL/browser mới trước end-to-end acceptance. Các gaps nghiệp vụ QA01 xử lý theo feature. Dừng chờ nghiệm thu, không tự FE06 hoặc sửa auth cần phê duyệt.
