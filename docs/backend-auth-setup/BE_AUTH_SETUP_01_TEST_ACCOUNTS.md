# BE-AUTH-SETUP-01 — Test accounts

Xác minh **2026-11-20**. **Chưa tạo tài khoản.** Đây là fixture của [auth suite](../../Backend/integration/xac-thuc.mjs) đang chờ môi trường/phê duyệt; không có credential để bàn giao.

| Fixture | Cách tạo và phạm vi |
| --- | --- |
| Reader | POST register qua route/controller/service/model thật; bcrypt cost 12, active, role reader theo seed. |
| Staff | Register reader trước, thêm relation librarian chỉ cho account thuộc run có ID/email/name khớp; giữ reader nên có hai role reader+librarian. |

Hai account đủ kiểm login/me và report_view 403/200. Không tạo admin hoặc thay role permissions. Source/seed có ba role admin/librarian/reader; không suy ra cần tạo cả ba tài khoản. Account ứng dụng khác account MySQL giới hạn quyền.

Dữ liệu giả dùng runId ngẫu nhiên và domain example.test; password CSPRNG trong RAM. Suite register thật để tạo hash, chỉ đọc hash fixture để kiểm bcrypt.compare/getRounds và không xuất hash. Token cũng chỉ giữ trong RAM.

Manifest ghi runId, ownership fixture và tên/kết quả scenario; không chứa token/password/hash. Ownership được ghi trước request register để cleanup vẫn định danh được nếu response lỗi.

Thay status inactive/locked chỉ theo ID/email fixture. Cleanup deactivate đúng fixture, không DELETE; nếu chưa nhận ID, dùng name/email ngẫu nhiên đã ghi nhận trước request. Đóng HTTP/pool trong finally, parent dừng instance riêng. Datadir chứa dữ liệu test/hash được giữ để kiểm tra, không dùng làm production.

Credential không được ghi file hoặc bàn giao sau khi process kết thúc; fixture bị vô hiệu hóa. Nếu cần Backend demo cho FE-06, phải chốt vòng đời/config/kênh bàn giao riêng, không lấy credential từ logs hoặc dùng main. Chỉ tạo fixture sau khi [kế hoạch database](BE_AUTH_SETUP_01_TEST_DATABASE.md) được duyệt và guard đạt.
