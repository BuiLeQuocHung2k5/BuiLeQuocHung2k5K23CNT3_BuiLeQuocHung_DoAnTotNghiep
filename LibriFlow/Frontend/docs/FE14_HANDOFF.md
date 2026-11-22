# FE-14 — Bàn giao demo LibriFlow

**Sẵn sàng nghiệm thu trên Windows.** Đã kiểm chứng ngày 21–22/11/2026 bằng Chrome headless, Vite, Express và MySQL 8.0.40. Database trình diễn là `libriflow_demo`, dùng một schema và tài khoản runtime riêng trên cùng MySQL Server local. Dữ liệu chính giữ schema cũ.

## Chạy và trình diễn

Tại thư mục gốc, chạy `npm run dev` rồi mở [trang đăng nhập](http://127.0.0.1:5173/dang-nhap). Tài khoản Admin, thủ thư và độc giả nằm trong `Backend/.demo-local/tai-khoan.json` trên máy. Sang ngày UTC mới, chạy `npm run demo:setup` trước buổi trình diễn để bổ sung ngày vừa kết thúc và kiểm kê lại độ phủ. Ctrl+C đã dừng cả hai listener 3000 và 5173. Hướng dẫn máy mới, cấu hình và xử lý lỗi ở [README](../../README.md).

## Bằng chứng nghiệm thu

| Hạng mục | Kết quả quan sát |
| --- | --- |
| Đăng nhập và phân quyền | Chrome đăng nhập và đăng xuất được cả ba vai trò. Tải lại trang yêu cầu đăng nhập lại. API trả 401 khi thiếu phiên, 403 khi độc giả đọc thống kê và sau đó `/auth/me` vẫn trả 200 cho phiên đó. |
| Admin và ISBN | Từ trang Admin đã dùng lối tắt đến màn hình FE-08, tạo sách có ISBN, thêm hai barcode cùng `book_id`, tải lại trình duyệt và đăng nhập lại để đọc dữ liệu đã lưu. Đã sửa ISBN-10 sang ISBN-13 rồi khôi phục ISBN-10 có số 0 đầu và X cuối. Form hiện lỗi khi ISBN trùng. API từ chối cả ISBN trùng lẫn barcode trùng bằng 409. |
| Mượn và trả | Thủ thư lập phiếu hai bản sao trên Chrome. SELECT xác nhận cả hai sang `borrowed`, sau trả một phần chỉ một bản trở lại `available`, sau trả hết cả hai đều khả dụng. Độc giả đăng nhập ở phiên mới và đọc được phiếu đã trả của mình. Đọc phiếu của người khác bằng API trả 404. |
| Thống kê và dự báo | 7 chỉ số trên Chrome khớp API. Đã đổi bộ lọc theo tháng, kiểm tra biểu đồ và bảng. Ngày cắt 21/11 có 9 phiếu của độc giả demo trong 7 ngày, cả 7 dòng dự báo trên UI khớp API ở 1,29 phiếu/người/ngày. Ngày 22/11, sau cập nhật dữ liệu demo và đối chiếu SELECT, tổng 7 ngày là 10, giao diện hiển thị 1,43 cho từng ngày 23–29/11. Đã thấy trạng thái thiếu lịch sử của tài khoản mới, đường lịch sử và dự báo tách riêng. |
| Desktop | Đã kiểm tra ở 1366 × 768 và 1920 × 1080 trong Chrome. Sidebar, header, bảng, biểu đồ và dialog nằm trong chiều rộng trang. Dialog chi tiết dài cuộn được trên laptop. Đã thao tác các nút lưu, lập phiếu và trả bằng chuột trong trình duyệt. |
| Tiếp tục sau gián đoạn | SELECT ngày 22/11 thấy 11 đầu sách, 22 bản sao, 3 tài khoản và 35 phiếu. Sách tạo qua UI còn đúng một bản ghi và hai barcode. Cập nhật ngày UTC mới đưa số phiếu lên 37, số sách/bản sao/tài khoản giữ nguyên. Bảng dự báo lưu có 0 dòng. |

**Migration ISBN.** Trước khi sửa, metadata database chính cho thấy ISBN còn ở bản sao, số ISBN có dữ liệu và hai nhóm xung đột đều bằng 0. Migration 002 đã chạy thực trên schema thử độc lập. Hai ISBN của một sách, một ISBN chuẩn hóa thuộc hai sách và checksum sai đều bị chặn trước khi xóa cột nguồn. Trường hợp hợp lệ đã giữ ISBN-10, ISBN-13 và null, giữ ba bản sao, bỏ cột cũ và chạy lại thành công. Schema thử tạm đã được dọn. Database demo khởi tạo từ DDL mới. [Migration](../../Backend/sql/migrations/002_isbn_dau_sach.sql)

| Lệnh kiểm tra | Kết quả |
| --- | --- |
| Frontend · `npm run test:run -- --maxWorkers=1`, `npm run lint`, `npm run build` | 22/11, 302/302 test ở 20 file, ESLint và production build đạt sau thay đổi cuối ở trang chủ. |
| Backend · `npm test` | 21/11, 179/179 unit/safety đạt, gồm validation và checksum ISBN. |
| Backend · `node integration/instance-isolee.mjs` | 21/11, 21/21 kịch bản MySQL riêng đạt. Node đếm 22 mục khi gồm cả test cha. Instance test đã dừng. Metadata và số bản ghi database chính khớp trước/sau lượt chạy. |
| Gốc · `npm run dev`, HTTP health, Chrome và Ctrl+C | Express và Vite cùng chạy. Health xác nhận MySQL connected. Sau Ctrl+C, kiểm tra TCP cả hai cổng trả ECONNREFUSED. |

## File chính

- Chạy chung, tạo schema demo, seed và kiểm kê nằm trong [package.json](../../package.json) và [Backend/demo](../../Backend/demo). Cấu hình phiên MySQL demo dùng UTC. [Pool MySQL](../../Backend/src/config/co-so-du-lieu.js)
- Dữ liệu và API ISBN nằm trong [schema chuẩn](../../Backend/sql/schema.sql), [validation dùng chung](../../chung/isbn.mjs), [model sách](../../Backend/src/models/sach.model.js), [model bản sao](../../Backend/src/models/ban-sao-sach.model.js), các validator Backend và [module sách Frontend](../src/chuc-nang/sach). Đã cập nhật Vite để đọc hàm validation chung.
- Trang chủ dùng các lối tắt theo quyền hiện tại và giữ các tuyến phát triển. [Trang chủ](../src/chuc-nang/khung-ung-dung/TrangTongQuanUngDung.jsx) · [Cấu hình tuyến](../src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js) · [Bố cục](../src/bo-cuc)
- Đã đồng bộ test hợp đồng, kịch bản tích hợp và tài liệu sách/bản sao. [API sách](../../Backend/docs/sach-api.md) · [API bản sao](../../Backend/docs/ban-sao-sach-api.md) · [Danh mục API Frontend](01_BACKEND_API_INVENTORY.md)

## Giới hạn còn lại

Quản trị người dùng vẫn chờ API Backend. SMA7 hỗ trợ xem trước, endpoint tạo/lưu vẫn trả 503. Lịch sử và chỉ số của buổi trình diễn thuộc database demo. Kết quả kiểm thử không xác lập độ chính xác của mô hình trên dữ liệu thư viện vận hành. Migration trên database chính và triển khai ngoài máy cá nhân nằm ngoài lượt nghiệm thu này.
