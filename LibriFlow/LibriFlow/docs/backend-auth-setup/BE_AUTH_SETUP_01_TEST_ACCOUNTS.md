# BE-AUTH-SETUP-01 — Test accounts

Xác minh **2026-11-21**. Đã tạo đúng **hai fixture** trên MySQL test mới được phê duyệt và đã vô hiệu hóa cả hai sau kiểm thử. Không tạo user ở main. [Suite](../../Backend/integration/xac-thuc.mjs), [evidence](evidence/BE_AUTH_SETUP_01_2026-11-21.json).

| Fixture | Cách tạo và kết quả |
| --- | --- |
| Reader | Register API thật, bcrypt cost 12, active và role reader mặc định. Login/me đạt; report_view bị từ chối 403. |
| Staff | Register reader trước rồi thêm relation librarian chỉ cho fixture ID/email/name khớp; giữ reader. Me trả live roles/permissions, report_view được phép 200. |

Không tạo admin hoặc thay role permissions. Dữ liệu giả dùng runId ngẫu nhiên và domain example.test; không ghi định danh cụ thể hoặc credential vào báo cáo. Account ứng dụng khác account SQL test giới hạn quyền.

Password CSPRNG được giữ trong RAM. Suite dùng register để tạo hash, kiểm bcrypt.compare/getRounds chỉ trên fixture, không xuất hash. JWT secret/token cũng chỉ dùng trong RAM. Manifest chứa ownership và scenario status, không token/password/hash.

Ownership được ghi trước register request; cleanup vẫn nhận diện được nếu response lỗi. Status inactive/locked chỉ sửa theo fixture ID/email; cuối run đặt inactive. Runner SELECT đối chiếu ID/email/name/status và xác nhận tổng 2 user, 2 inactive, 2 login events. HTTP/pool đã đóng, mysqld riêng đã dừng; không DELETE.

Datadir giữ data/hash test để audit theo [kế hoạch](BE_AUTH_SETUP_01_TEST_DATABASE.md), không dùng làm production. Không có credential bền hoặc account demo được bàn giao cho browser FE-06; không lấy credential từ log hoặc dùng main. Backend dev lâu dài cần phạm vi/config/vòng đời riêng.
