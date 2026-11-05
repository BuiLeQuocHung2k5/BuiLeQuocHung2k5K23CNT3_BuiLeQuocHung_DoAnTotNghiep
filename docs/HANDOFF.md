# Bàn giao hiện tại

Cập nhật: 2026-11-05 · Task: **AUTH-001** (`TASKS.md`).

- Trạng thái: đã triển khai JWT/RBAC và bảo vệ ghi sách. Register chỉ reader, bcrypt cost 12; login cấp JWT 15 phút, me tải lại RBAC DB; logout stateless yêu cầu client xóa token. Không thay đổi DB chính, giữ các thay đổi task trước.
- File tạo/sửa: đầy đủ tại `TASKS.md` mục AUTH-001. Hợp đồng/Postman: `Backend/docs/auth-api.md` và `Backend/docs/books-api.md`. Thêm bcryptjs/jsonwebtoken/express-rate-limit, cập nhật lockfile và `.env.example` trống secret; không sửa `.env` thật.
- Kiểm tra: 40/40 test đạt, gồm auth/RBAC và regression sách với Bearer. Cú pháp/diff-check đạt. Chỉ SELECT metadata/quyền trên MySQL chính; không đọc tài khoản/hash. Health/public GET thật HTTP 200, ghi không token 401, thiếu secret 503 trước ghi; `npm run db` đạt. Đã đóng tiến trình thử. Schema/seed/SQL gốc không đổi.
- Chưa kiểm thử: auth thành công/ghi CRUD trên MySQL thật hoặc DB thử nghiệm độc lập, concurrency thật, tải/multi-instance/proxy/HTTPS. Mock không thay thế kiểm chứng SQL ghi thực thi thành công.
- Tồn tại: cần JWT_SECRET ngẫu nhiên tối thiểu 32 byte từ môi trường, không fallback; rate limit trong memory. Không có refresh/revocation/reset password/email verification; hash cũ không phải bcrypt không được login và không tự migrate. npm audit có 2 moderate dev nodemon/minimatch đã có từ HEAD; audit omit=dev 0 cảnh báo. Server vẫn chỉ bind loopback, chưa production.
- Bước tiếp theo đề xuất: khi được duyệt, kiểm thử auth/RBAC + CRUD trên database thử nghiệm độc lập. Không tự seed/cấp admin, sửa schema/DB chính, `.env`, Git/remote, commit/push hoặc public API.

Trước task mới: đọc `AGENTS.md` và các tài liệu được chỉ định, kiểm tra lại source/Git/metadata liên quan; tài liệu là ảnh chụp tại thời điểm xác minh.
