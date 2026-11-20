# BE-AUTH-SETUP-01 — Session policy cho FE-06

Ngày **2026-11-20**. Mục 14 của yêu cầu đã chỉ định chính sách memory-only. Đây là tài liệu cho FE-06 sau, **chưa triển khai Frontend**. Trạng thái “đề xuất chưa duyệt” của BE-AUTH-PREP là lịch sử trước chỉ dẫn mới.

- Access token giữ trong RAM React của mỗi tab. Không localStorage/sessionStorage, URL, query keys, logs hoặc UI hiển thị token. Reload yêu cầu login lại; không tự refresh hoặc remember-me.
- Login trả Bearer/900 giây, không profile. Sau login gọi me trước khi xác nhận principal/permissions. Axios lấy token của phiên hiện hành cho protected request; giữ contract và retry=false cho login/writes.
- Token hết hạn cố định, không gia hạn theo hoạt động. Timer hỗ trợ UX; Backend kiểm signature/issuer/audience/expiry là nguồn quyết định.
- 401 khi login sai thông tin là lỗi form. 401 từ protected request của phiên hiện hành xử lý xóa phiên/cache theo state, không retry vòng lặp. Response chậm của phiên cũ không được logout hoặc ghi đè phiên mới.
- 403 FORBIDDEN là thiếu quyền, không tự coi hết phiên. 403 ACCOUNT_INACTIVE cần thông báo account bị chặn và ngăn thao tác protected; không gộp mọi 403 thành token expired hoặc global logout.
- Logout thử endpoint khi phù hợp nhưng luôn xóa token/principal cục bộ kể cả offline/error. Endpoint không revoke JWT; token có thể dùng tới exp nếu account active. Không báo đã thu hồi trên server.
- Hủy request và xóa cache protected của user cũ khi logout/đổi user. Không đưa token vào cache key hoặc thêm persistence. Lỗi mạng/503 không tự chứng minh sai password hoặc đã logout.
- Tab độc lập theo memory. Nếu cần đồng bộ logout giữa tab, phải có đặc tả FE-06 riêng; không truyền token giữa tab. Backend không có logout-all.

Memory giảm lưu bền nhưng XSS đang chạy vẫn có thể lấy/dùng phiên; không loại bỏ hoàn toàn rủi ro đánh cắp token. Không chuyển sang cookie/refresh/BFF trong task này.

[Phân tích lựa chọn và nguồn bảo mật BE-AUTH-PREP](../backend-auth-prep/BE_AUTH_PREP_01_SESSION_POLICY.md) giữ các tradeoff. Browser, race và cache behavior phải được kiểm ở FE-06; không suy từ HTTP/crypto tests Backend.
