# FE-05 — Test report

Xác minh **2026-11-20** trên Node24.20.0/npm11.19.0; Vitest5.1.1/jsdom31.0.1. Không cài dependency mới, không cần MySQL/JWT cho unit tests.

## Kết quả tự động

Chạy tại `Frontend`:

| Kiểm tra | Kết quả |
| --- | --- |
| Baseline trước FE-05: `npm.cmd run test:run` | 100/100, 7 file, exit0 |
| Regression cuối: `npm.cmd run test:run` | **152/152, 10 file, exit0**; giữ nguyên 100 test cũ |
| `npm.cmd run lint` | exit0 |
| `npm.cmd run build` | exit0; Vite8.3.6, 2399 modules, 6 JS chunks; TrangKiemTraApi lazy riêng |
| `git diff --check` | đạt; Git báo chuyển LF/CRLF theo cấu hình sẵn có |

52 tests mới, mock tại HTTP adapter Axios, không thay Backend bằng fixture trong app:

- [dich-vu-cong-khai.test.js](../src/chuc-nang/api-cong-khai/dich-vu-cong-khai.test.js),31: URL/method/query Unicode/trim/defaults/range/unknown fields, ID lớn dạng chuỗi, status/headers/envelope nguyên vẹn, timeout/Accept/credentials/no auth config, HTTP401/403/429/503 không retry, cancellation adapter; normalization400/401/403/404/409/429/500/503, network/timeout/cancel, fallback ngoài contract và ẩn nội dung nội bộ.
- [truy-van-cong-khai.test.jsx](../src/chuc-nang/api-cong-khai/truy-van-cong-khai.test.jsx),9: key canonical/tách resource và page, enabled của3hooks, success và response gốc,401/403/503 error gốc/retryfalse, cache policy hữu hạn, cancel tường minh/unmount abort signal thật.
- [TrangKiemTraApi.test.jsx](../src/chuc-nang/api-cong-khai/TrangKiemTraApi.test.jsx),12: route qua KhungUngDung/navigation mobile thật trong jsdom, không auto request, thiếu config, health, empty/nonempty counts, HTML200 sai envelope, network/timeout/401/403 không redirect/retry, loading/cancel/thử lại và offline-paused/hủy trước transport.

Lượt targeted đầu49/51: hai test mới giả định sidebar desktop trong viewport compact và accessible name của Spinner; sửa test để mở drawer và kiểm nội dung live status, không sửa UI/test cũ. Lượt full đầu150/151: FE04 chờ banner bị timeout khi import eager trang API mới. Chuyển TrangKiemTraApi sang lazy ở DinhTuyenKhung; full151/151 đạt, rồi thêm test paused thành **152/152**. Không xóa/nới assertion hoặc sửa test cũ để che regression.

## HTTP dev và production

Đầu task: `fetch` đến5173 và3000 trả `ECONNREFUSED`. `loadEnv('development',...)` + moiTruong reader cho boolean origin hợp lệ=false; không in giá trị cấu hình. Sau khởi động đúng tiến trình kiểm thử:

- Dev `npm.cmd run dev`, truyền `VITE_API_BASE_URL` origin local vào **process**, không ghi file env;5173 phục vụ9/9 route shell HTML có root: `/`, `/design-system`, `/app`, `/app/`, `/app/layouts`, `/app/workspace`, `/app/api-check`, `/app/missing`, `/missing`.
- API page/query/service/error modules và CSS dev đều200. Đây là kiểm tra phục vụ SPA; scoped/global404 render được chứng minh bằng RTL cũ, HTTP200 của fallback không chứng minh browser routing.
- `npm.cmd run preview`,4173: cùng9/9 route shell200; **31/31 assets**200, byte>0 và không trả HTML:6JS,1CSS,12woff+12woff2. Build không truyền origin nên có cảnh báo cấu hình đúng FE02; không coi production asset200 là kết nối Backend thành công.

## Backend thật — chỉ đọc

`npm.cmd start` dùng `Backend/src/server.js`, bind loopback3000, startup SELECT1 thành công. Không sửa Backend hoặc tạo dữ liệu. GET thực có header Origin dev:

| Endpoint | Kết quả |
| --- | --- |
| `/api/health` |200,success true,message string |
| `/api/books?page=1&limit=10` |200,data0,pagination1/10/0/0 |
| `/api/categories?page=1&limit=10` |200,data0,pagination1/10/0/0 |

Cả3 trả CORS origin `*`, không Access-Control-Allow-Credentials. Kiểm thêm **service Frontend thật** qua Vite `ssrLoadModule` với origin tạm trong process: kiemTraSucKhoe/laySachCongKhai/layDanhMucCongKhai đều Axios200, envelope đúng và list rỗng thật. Không log nội dung bản ghi. Node/Vite SSR không phải browser test.

Gọi trực tiếp `taoDichVuJwt().kiemTraDaCauHinh()` sau nạp cấu hình server: jwtConfigured=false, chỉ in boolean; không tạo/gửi token hoặc gọi protected endpoint. Users/grants/fine rules không truy vấn lại; số liệu QA01 là lịch sử, không xác nhận hiện trạng mới.

## Bảo toàn và giới hạn

Hash SHA256 theo204file baseline working tree trước FE05, kể cả FE04 chưa commit; chỉ hai source FE04 được mở rộng là route-config và DinhTuyenKhung, cộng README/4docsroot khi bàn giao. Backend/SQL/package/lock/env/config/HTTP/provider/components/styles/contract/docs cũ/tests cũ giữ nguyên. Danh sách deliverable ở [handoff](FE05_HANDOFF.md). Không stage/commit/push, schema/seed/migration/ghi DB hoặc dependency audit mới.

Kiểm cuối: 7 file có trước được sửa, 12 file mới, không xóa file; Backend và tests cũ giữ hash. UTF-8 và **66 link nội bộ** trong README/5 docs FE05 hợp lệ. `git diff --check` theo cấu hình repo đạt exit0. Backend/preview4173 đã dừng, dev5173 `/app/api-check` vẫn200.

`cua.getState()` trả apps/browsers rỗng, lỗi native pipe và browser access host unavailable. **Chưa xác minh** UI/render/responsive thực, Console/Network tab, request cancellation trong browser, CORS enforcement hoặc offline DevTools. Không chứng nhận các phần này từ jsdom/HTTP/SSR.

Checklist nghiệm thu khi Chrome/Edge sẵn sàng:

1. Mở `/app/api-check` ở375/768/1280px, drawer/active nav/focus/zoom theo checklist FE04; trang không tự phát request.
2. Bấm từng probe; Network chỉ có GET public đúng `/api`, không Authorization/cookie/polling/retry. Health200, hai list rỗng hiển thị EmptyState; không có dữ liệu thay thế.
3. Slow network rồi Hủy: request bị abort, không Alert server lỗi; thử lại được. Chuyển route khi đang tải cũng hủy observer cuối.
4. Stop Backend sau kiểm thử: page vẫn render, nút hiện lỗi mạng an toàn. Offline trước click cho trạng thái chờ mạng/hủy. Sai origin/prefix không biến HTML200 thành API success.
5. Production build cấu hình origin phù hợp trước khi kiểm API thật; asset/route HTTP hiện đã kiểm riêng.

Trạng thái tiến trình và bước tiếp theo cập nhật ở [FE05_HANDOFF](FE05_HANDOFF.md) và [bàn giao dự án](../../docs/HANDOFF.md).
