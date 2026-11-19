# FE-01 — Hướng dẫn tích hợp React + Vite

Xác minh source và smoke SELECT ngày 2026-11-19. Đây là thiết kế tích hợp cho FE-02, chưa tạo app hoặc sửa env. API đầy đủ: [01](01_BACKEND_API_INVENTORY.md); các điểm chặn: [04](04_API_GAPS_AND_RISKS.md).

## URL, cấu hình và chạy local

Base mặc định `http://127.0.0.1:3000`, prefix `/api`. PORT là biến server có thể ghi đè cổng, không suy base URL đang chạy từ giá trị env chưa công bố. Khi làm FE-02, biến đề xuất phía Vite là `VITE_API_BASE_URL=http://127.0.0.1:3000` (không chứa `/api`, helper thêm `/api` đúng một lần). Đây là đề xuất frontend, chưa tạo file env.

Server đọc `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`, `JWT_SECRET`, `FORECAST_COVERAGE_FILE`. Không đưa DB/JWT_SECRET vào biến VITE vì biến frontend được gửi tới trình duyệt. Kết nối mysql2 được tạo từ [config](../../Backend/src/config/co-so-du-lieu.js#L5), không cần FE kết nối MySQL trực tiếp.

Entry thực tế là `src/server.js` theo [package scripts](../../Backend/package.json#L7), không phải package.main index.js. Lệnh sẵn có: `npm.cmd --prefix Backend start` hoặc `npm.cmd --prefix Backend run dev`; server chỉ listen sau SELECT 1 thành công. Không chạy các lệnh setup/integration/schema/seed để “khởi động frontend”. FE-01 không cài dependency và không chạy server lâu dài.

[CORS mặc định](../../Backend/src/app-factory.js#L49) là cors() wildcard, không credentials cookie, hỗ trợ preflight. Backend loopback và Vite local ở cổng khác có thể kết nối trực tiếp theo cấu hình; không cần proxy bắt buộc. Smoke FE-01 trả Access-Control-Allow-Origin: *. **Chưa xác minh trình duyệt/Vite/preflight thật**. Dùng URL backend từ browser; localhost từ máy khác không trỏ về máy chạy Backend.

## API client đề xuất (chưa triển khai)

```js
const base = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

async function api(path, { token, method = "GET", body, signal } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    signal,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    const error = new Error(payload?.error?.message ?? "Dịch vụ chưa sẵn sàng.");
    error.status = response.status;
    error.code = payload?.error?.code ?? "UNEXPECTED_RESPONSE";
    error.details = payload?.error?.details ?? [];
    throw error;
  }
  return payload; // giữ pagination/period/as_of, không chỉ trả data
}
```

Đây là ví dụ thiết kế tối thiểu; lỗi network/AbortError do fetch vẫn truyền ra caller và cần UI xử lý. Không log token/password hoặc cho vào URL. JSON parser Backend giới hạn 256kb; body JSON có Content-Type đúng, không form-data/upload. Không có upload middleware/route ở [factory](../../Backend/src/app-factory.js#L49).

## Phiên và quyền

1. POST `/auth/login` với email/password, lấy `payload.data.accessToken`, `expiresIn=900`.
2. GET `/auth/me` với Bearer lấy profile/roles/permissions; login không trả profile, register không trả token.
3. Đề xuất giữ token trong bộ nhớ ứng dụng; chưa có quyết định lưu bền localStorage. Route guard/nút dùng permissions từ me; server luôn kiểm lại DB.
4. 401 từ request cần phiên → xóa token/profile và yêu cầu login lại; không refresh tự động vì thiếu refresh route. 401 login sai thông tin chỉ báo form.
5. Logout gọi POST `/auth/logout` nếu còn token, luôn xóa phiên FE trong finally; logout không revoke JWT trên server.

Không đặt role/status trong request register; reader không tự tạo/trả phiếu. Scope own gửi đúng endpoint, không gửi query user_id ở các list bị giới hạn own. Tham chiếu [02](02_AUTHORIZATION_MATRIX.md) cho custom grant/multi-role và lỗi 403.

## Response, phân trang và lỗi

List thông thường trả `{success:true,data:[],pagination:{page,limit,total,totalPages}}`; history/statistics thêm period UTC; overdue list thêm as_of. Statistics/borrows trả array + period, không pagination. Detail trả data object; DELETE/logout trả data:null + message. Health không có data, health/db lỗi là `{success:false,database:"disconnected"}` thay error object.

Dùng URLSearchParams cho query; page 1, limit 10/default và max100; total=0 có totalPages=0, UI giữ trang hiển thị hợp lý, không request page=0. Không sort tùy ý, không gửi category_id để lọc sách. Query lạ ở list thường 400. Header/params/response đầy đủ tại [01](01_BACKEND_API_INVENTORY.md).

| Tình huống | Cách xử lý đề xuất |
|---|---|
| 400 validation | Hiển thị error.details theo field, giữ form; không ghi đè lỗi thành “mất kết nối” |
| 401 | Phân biệt login sai credentials và phiên hết hạn; không retry vô hạn |
| 403 | Báo thiếu quyền/tài khoản inactive; không tự đổi user_id/role để thử lại |
| 404 | Tài nguyên không có hoặc ngoài scope; không tiết lộ owner |
| 409 | Tải lại sách/copy/phiếu/fine; không lặp thao tác ghi trước khi đối chiếu |
| 413/415 | Kiểm tra kích thước body/Content-Type; không có upload API |
| 429 | Báo giới hạn, tuân thủ header thời gian nếu có; không gọi login vòng lặp |
| 503 | Phân biệt JWT/registration/DB/forecast gate qua code; báo chưa sẵn sàng, không tạo kết quả giả |
| Network/timeout/500 | Giữ thông tin form phù hợp; trạng thái ghi có thể chưa rõ, đọc lại trước gửi lại; không retry POST/PATCH mù |

Nguồn error/status: [middleware](../../Backend/src/middlewares/xu-ly-loi.js#L7). Hiển thị message bằng text React, không HTML. Chỉ server được quyết định amount, fine_type, paid_at, trạng thái lưu thông và ngày mượn.

## Kiểu dữ liệu, thời gian và form

- Giữ ID dạng string; amount và predicted_count là decimal string. Số đếm/pagination/year là number. Không dùng parseInt cho ID hoặc float để tính mức phạt.
- Catalog/User timestamp đi qua mysql2 Date → ISO JSON; timezone pool không đặt rõ, không cam kết legacy là UTC. Borrow/fine/history trả chuỗi SQL theo UTC cho dữ liệu mới: cần adapter theo contract, tránh `new Date(sqlString)` tự áp múi giờ máy. Forecast ngày YYYY-MM-DD là ngày nghiệp vụ, không đổi timezone.
- datetime-local phải đổi từ múi giờ nhập sang UTC có chủ đích, gửi due_date `YYYY-MM-DDTHH:mm:ssZ` không milliseconds. D hiển thị/lọc theo ngày UTC, max366 ngày, mặc định30 ngày.
- PUT sách/danh mục/copy là thay thế, gửi đủ trường bắt buộc; trường tùy chọn thiếu thành null. **Copy GET không trả note**: không triển khai edit đầy đủ làm mất note trước khi chốt giải pháp ở [04](04_API_GAPS_AND_RISKS.md).
- Overdue là kết quả tính đọc từ giờ DB; status=overdue trong list phiếu không tự cập nhật. Return không tự tạo fine. Payment chỉ ghi paid; không chứng minh giao dịch ngân hàng.
- Forecast insufficient_data là HTTP200 hợp lệ, predictions rỗng và mae null; không biến thành zero forecast. Generate hiện không có nhánh success.

Trước nghiệm thu luồng ghi FE cần môi trường dev/demo độc lập được duyệt, JWT/account/grants đúng, chính sách phạt và phạm vi các API thiếu. Không dùng DB chính để chạy test ghi. Các thử nghiệm FE/browser thật sẽ thuộc task tiếp theo sau nghiệm thu FE-01.
