# FE-05 — API Integration Architecture

Xác minh 2026-11-20 từ source, tests và GET thật. Đã triển khai trong phạm vi FE-05, chờ nghiệm thu; không Authentication hoặc nghiệp vụ FE-06.

Luồng: `TrangKiemTraApi → public query hook → TanStack Query → service → ketNoiHttp → Express`. Chỉ thêm lớp có trách nhiệm cụ thể; không tạo repository/store hoặc service cho toàn bộ 40 endpoint.

| Lớp | Source và trách nhiệm |
| --- | --- |
| Environment | [moi-truong.js](../src/cau-hinh/moi-truong.js): đọc origin `VITE_API_BASE_URL`, thêm `/api` một lần; thiếu/sai vẫn render, chặn transport. Không chứa secret. |
| Transport | [ket-noi-http.js](../src/thu-vien/api/ket-noi-http.js) FE-02 giữ nguyên: Axios, timeout 10 giây, Accept JSON, withCredentials false. Giữ AxiosResponse gồm status/headers/data và AxiosError gốc. Không unwrap, auth, redirect hoặc retry. |
| Services | [dich-vu-cong-khai.js](../src/chuc-nang/api-cong-khai/dich-vu-cong-khai.js): GET books/categories, canonical page/limit/search và chuyển signal; [api-suc-khoe.js](../src/chuc-nang/nen-tang/api-suc-khoe.js) FE-02 được tái dùng. |
| Hooks/cache | [truy-van-cong-khai.js](../src/chuc-nang/api-cong-khai/truy-van-cong-khai.js): key factory, enabled mặc định false, lifecycle hữu hạn, queryFn nhận signal. [QueryClient](../src/thu-vien/trinh-truy-van.js) và [provider](../src/ung-dung/bo-cung-cap/BoCungCapUngDung.jsx) hiện hữu giữ nguyên. |
| UI error | [chuan-hoa-loi.js](../src/thu-vien/api/chuan-hoa-loi.js): thông tin an toàn cho component, cause gốc không enumerable. Không interceptor toast/global logout. |
| UI kỹ thuật | [TrangKiemTraApi.jsx](../src/chuc-nang/api-cong-khai/TrangKiemTraApi.jsx): explicit click, loading/paused/error/empty/success/cancel; chỉ hiển thị số lượng, không catalog. Lazy route qua [DinhTuyenKhung](../src/chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx), metadata/sidebar qua [route-config](../src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js). |

## Contract đã đối chiếu

Nguồn: [inventory QA-01](01_BACKEND_API_INVENTORY.md), [app-factory](../../Backend/src/app-factory.js), [sách router](../../Backend/src/routes/sach.routes.js), [danh mục router](../../Backend/src/routes/danh-muc.routes.js), controller/validator tương ứng. Không phát hiện sai khác ở ba GET được tích hợp; không tái audit đủ 40 endpoint trong FE-05.

| GET công khai | Response giữ nguyên |
| --- | --- |
| `/api/health` | `{success:true,message:string}`; không chứng minh DB hoặc JWT sẵn sàng. |
| `/api/books` | `{success:true,data:[],pagination:{page,limit,total,totalPages}}` |
| `/api/categories` | Cùng envelope phân trang; giữ nguyên mọi field/ID chuỗi trong data. |

Hai list chỉ dùng page/limit/search: mặc định 1/10/chuỗi rỗng, limit 1..100, page nguyên an toàn ≥1 và offset an toàn; search trim, Unicode hợp lệ, tối đa 255 code point. Service nhận page/limit dạng number, Axios serialize thành query string. Unknown params và giá trị không hợp lệ bị từ chối bằng TypeError trước request; không âm thầm bỏ filter lạ. Không đổi quy tắc Backend.

Trang chỉ kiểm tra cấu trúc envelope cơ bản, không thay thế validation schema toàn bộ bản ghi. HTTP 200 HTML từ sai origin/prefix không được trình bày là API thành công. Không mock fallback khi offline.

## Cancellation và lỗi

QueryFn đọc `signal` rồi chuyển tới Axios. Hủy bằng `cancelQueries({queryKey,exact:true})` hoặc tháo observer cuối sẽ abort transport; TanStack hoàn nguyên trạng thái, không biến cancel thành server error. Trang giữ nhãn hủy cục bộ; bấm lại mới gửi request. Các kết quả cache đã có vẫn theo lifecycle của QueryClient.

Chi tiết: [error handling](FE05_ERROR_HANDLING.md), [query conventions](FE05_QUERY_CONVENTIONS.md).

## Authentication boundary dành cho nhiệm vụ sau

Đối chiếu [auth router](../../Backend/src/routes/xac-thuc.routes.js), [controller](../../Backend/src/controllers/xac-thuc.controller.js), [service](../../Backend/src/services/xac-thuc.service.js), [middleware](../../Backend/src/middlewares/xac-thuc.js), [JWT](../../Backend/src/utils/jwt.js):

- POST `/api/auth/login` nhận JSON hợp lệ, trả `{success:true,data:{accessToken,tokenType:'Bearer',expiresIn:900}}`. Login ghi sự kiện; FE-05 không gọi.
- GET `/api/auth/me` cần Bearer, trả principal trong data. POST logout cần Bearer; client xóa token, Backend không thu hồi token hiện hành. Không có refresh endpoint/cookie session trong source này.
- Sau khi người dùng giao FE-06 và duyệt thiết kế session, lớp auth có thể cung cấp access token cho request interceptor của cùng ketNoiHttp. Token lấy từ session tại thời điểm request, không gắn giả hoặc lưu vào keys. Storage/persistence là quyết định chưa duyệt, chưa có implementation.
- Protected hooks sau này phải được enable theo session hợp lệ; xử lý 401/403 do feature/auth quyết định, không suy diễn logout từ mọi lỗi. Khi đổi session cần policy hủy/xóa cache được thiết kế và kiểm thử riêng.

Không có token storage/login/logout/refresh/guard/protected calls trong FE-05. `withCredentials:false` phù hợp contract Bearer hiện tại; không tự chuyển sang cookie. Blocker và điều kiện FE-06 ở [handoff](FE05_HANDOFF.md).

## Environment/CORS đã xác minh

- Backend source mount `/api`, server mặc định loopback cổng 3000; Vite dev loopback 5173, preview 4173 strictPort.
- `cors()` hiện trả `Access-Control-Allow-Origin:*`, không credentials; GET thật với Origin dev xác nhận header này. Không sửa Backend CORS. Header qua Node không thay chứng cứ trình duyệt.
- Cấu hình development đọc bằng `loadEnv` hiện thiếu origin hợp lệ. Dev kiểm thử truyền origin local vào process, không sửa `.env`. Build không truyền origin sẽ giữ cảnh báo cấu hình, đúng thiết kế FE-02.
- Lúc đầu 3000/5173 từ chối kết nối. Sau start đúng entrypoint, GET và service Axios thật đạt; xem [test report](FE05_TEST_REPORT.md). Browser host chưa khả dụng.
