# FE-05 — Error handling

Xác minh 2026-11-20. Utility: [chuan-hoa-loi.js](../src/thu-vien/api/chuan-hoa-loi.js); test transport và lỗi: [dich-vu-cong-khai.test.js](../src/chuc-nang/api-cong-khai/dich-vu-cong-khai.test.js).

Transport không bị thay đổi: service/hook reject AxiosError gốc; component gọi `chuanHoaLoiApi(error)` khi cần render. Kết quả có `status`, `code`, `message`, `details`, `isNetworkError`, `isCancelled`, `isTimeout` và `cause` gốc non-enumerable. Không tự toast, retry, redirect, logout hoặc sửa cache.

| Loại | Phân loại / thông báo UI |
| --- | --- |
| Network | Axios browser `ERR_NETWORK`, status null; nhắc kiểm mạng/URL/CORS, không kết luận lỗi CORS nếu chưa có chứng cứ. |
| Timeout | `ECONNABORTED` hoặc `ETIMEDOUT`; thông báo quá thời gian chờ, không tự gửi lại. |
| Cancel | Axios cancellation hoặc `ERR_CANCELED`; trạng thái người dùng hủy, không báo dịch vụ hỏng. Query cancellation thường hoàn nguyên state thay vì lưu error. |
| 400 | Dữ liệu yêu cầu chưa hợp lệ. |
| 401 | Yêu cầu cần xác thực hợp lệ; truyền status/code, không suy ra đã logout. |
| 403 | Không có quyền; không đổi role/redirect hoặc retry. |
| 404 | Không tìm thấy tài nguyên. |
| 409 | Dữ liệu thay đổi hoặc xung đột; feature tương lai quyết định cách xử lý. |
| 429 | Nhắc thử lại sau; Backend có limiter auth, không suy ra public list có limiter này. Không retry tự động. |
| 500+ | Dịch vụ tạm chưa sẵn sàng, gồm 503 DB/JWT/forecast theo source; giữ status/code để feature phân biệt. |
| Client/config hoặc HTTP khác | Thông báo chung; không tự tạo status cho lỗi không có response. |

Source [xu-ly-loi.js](../../Backend/src/middlewares/xu-ly-loi.js), [LoiHttp](../../Backend/src/utils/loi-http.js), routes/validators cho thấy các status 400/401/403/404/409/413/415/429/500/503. **Không thấy 422 trong contract hiện tại**; 413/415 giữ status/code và dùng thông báo chung. Test 422 chỉ chứng minh fallback khi gặp status ngoài dự kiến, không xác nhận Backend hỗ trợ nó.

Backend code hợp lệ theo dạng chữ hoa/số/underscore được giữ; thiếu hoặc dạng bất thường dùng mã phân loại frontend. Mã và details nguyên bản vẫn ở `cause.response.data.error`. `message` backend không được echo; details UI giới hạn 20 mục có tên field hợp lệ, thay nội dung bằng gợi ý chung. Không hiển thị request config, SQL, stack, token, giá trị đầu vào hoặc toàn response. Không log cause/raw error hoặc serialize để gửi telemetry; non-enumerable không phải cơ chế che bí mật khi truy cập trực tiếp.

[TrangKiemTraApi](../src/chuc-nang/api-cong-khai/TrangKiemTraApi.jsx) dùng Alert tại từng probe, chỉ hiển thị HTTP/code/message an toàn. Network error không chặn page; danh sách rỗng là EmptyState thành công. Sai envelope/HTML 200 là cảnh báo contract tại UI, không sửa response gốc. Không có toast tự động. Khi browser offline và query paused, page giải thích trạng thái và cho hủy trước khi gửi transport.
