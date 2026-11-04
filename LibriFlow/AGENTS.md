# Hướng dẫn làm việc với LibriFlow

## Trước khi thực hiện task
- Đọc `docs/PROJECT_CONTEXT.md`, `docs/DATABASE.md`, `docs/DECISIONS.md`, `docs/TASKS.md` và `docs/HANDOFF.md` trước mọi task liên quan đến dự án.
- Kiểm tra source và trạng thái Git hiện tại; tài liệu là ảnh chụp tại lần xác minh, không thay thế source hoặc metadata database mới nhất.
- Chỉ ghi kết luận đã kiểm chứng, kèm đường dẫn nguồn hoặc cách kiểm tra và ngày xác minh. Ghi **Chưa xác minh** cho phần còn thiếu; không suy diễn nghiệp vụ từ tên bảng.

## Phạm vi và an toàn
- Chỉ sửa trong phạm vi task được giao. Không tự ý thay đổi schema database, chạy migration, script tạo schema, seed hoặc thao tác ghi/xóa dữ liệu; cần chỉ dẫn rõ ràng của người dùng cho các thao tác này.
- Khi khảo sát database, dùng truy vấn chỉ đọc, ưu tiên metadata; không lấy dữ liệu cá nhân nếu task không cần.
- Không ghi mật khẩu, token, chuỗi kết nối chứa bí mật, giá trị `.env` hoặc dữ liệu cá nhân vào tài liệu, log chia sẻ hay commit. Chỉ ghi tên biến cấu hình cần thiết.
- Giữ tài liệu ngắn gọn, dẫn chiếu source thay vì sao chép code. Phân biệt thiết kế trong repo với trạng thái database thực tế.

## Sau mỗi task
- Cập nhật `docs/TASKS.md` và `docs/HANDOFF.md` trước khi báo cáo, kể cả task chỉ khảo sát hoặc chưa hoàn tất.
- Ghi: mục tiêu/trạng thái, các file đã tạo/sửa (hoặc không có), lệnh/cách kiểm tra và kết quả, kiểm tra chưa chạy, vấn đề còn tồn tại và bước tiếp theo.
- Khi thông tin xác minh thay đổi, cập nhật tài liệu chuyên đề tương ứng; quyết định mới phải nêu căn cứ và trạng thái được duyệt.
- `TASKS.md` giữ lịch sử tóm tắt; `HANDOFF.md` giữ trạng thái bàn giao mới nhất và dẫn chiếu task để tránh lặp lại.
