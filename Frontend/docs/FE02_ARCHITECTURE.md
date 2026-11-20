# FE-02 — Kiến trúc nền tảng

Xác minh 2026-11-19 từ các file liên kết dưới đây. Template khởi đầu tạo bằng create-vite **9.3.4** `--template react` trong thư mục tạm riêng, sau đó thiết lập nền tảng theo FE-02; template mới dùng oxlint, đã chọn ESLint theo yêu cầu. Không ghi đè docs/source cũ, thư mục scaffold do task tạo đã được dọn sau kiểm tra đường dẫn.

```text
Frontend/
  docs/                         FE-01 giữ nguyên; 5 tài liệu FE-02
  src/
    ung-dung/
      App.jsx                   root và BrowserRouter
      App.test.jsx              render/routing/health UI
      bo-cung-cap/BoCungCapUngDung.jsx
      dinh-tuyen/DinhTuyenUngDung.jsx
    cau-hinh/
      moi-truong.js
      moi-truong.test.js
    chuc-nang/nen-tang/
      TrangNenTang.jsx         trang kỹ thuật, không nghiệp vụ
      api-suc-khoe.js             duy nhất GET /health
    thu-vien/
      trinh-truy-van.js
      api/ket-noi-http.js
      api/ket-noi-http.test.js
    trang/TrangKhongTimThay.jsx
    kieu-dang/toan-cuc.css
    kiem-thu/thiet-lap.js
    main.jsx
  .env.example / .gitignore
  eslint.config.js / vite.config.js / index.html
  package.json / package-lock.json / README.md
```

Chỉ tạo thư mục đang có file hữu ích; chưa tạo skeleton auth/books/... hoặc stores/hooks/layouts/public/assets rỗng. Không có mock nghiệp vụ, auth provider, store giả, alias hoặc lớp repository không cần thiết.

## Luồng khởi động

[main.jsx](../src/main.jsx) import CSS và render StrictMode → [App](../src/ung-dung/App.jsx) → [BoCungCapUngDung](../src/ung-dung/bo-cung-cap/BoCungCapUngDung.jsx) tạo một QueryClient ổn định cho mỗi app mount → BrowserRouter → [DinhTuyenUngDung](../src/ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx). `/` là trang kỹ thuật, `*` là NotFound với Link về `/`. Không sidebar/header/dashboard/login/protected routes/role navigation. Không API nào chạy khi mount.

## HTTP và environment

[docMoiTruong](../src/cau-hinh/moi-truong.js) nhận biến VITE_API_BASE_URL công khai, trả origin + `/api` hoặc lỗi cấu hình thân thiện, không phản chiếu giá trị URL có credentials vào message. Không fallback URL production/local ngầm. [Axios instance](../src/thu-vien/api/ket-noi-http.js) timeout10s, credentials false, Accept JSON. Request interceptor chỉ chặn thiếu/sai config; response và AxiosError giữ nguyên, kể cả status/headers/envelope/pagination/error.details. Caller tự phân biệt HTTP, network, timeout, cancellation; không biến network error thành status giả.

Không interceptor token/refresh/retry/redirect. Không tự unwrap data làm mất metadata. [health-api](../src/chuc-nang/nen-tang/api-suc-khoe.js) trả AxiosResponse và nhận AbortSignal nếu caller cần. Chỉ có endpoint health đã được xác minh từ [FE-01 guide](05_FRONTEND_INTEGRATION_GUIDE.md) và [Backend source](../../Backend/src/app-factory.js#L51).

## Server state và client state

[QueryClient](../src/thu-vien/trinh-truy-van.js) đặt queries staleTime=0 (dữ liệu không mặc định được xem là mới trong một khoảng thời gian nghiệp vụ), retry=false và refetchOnWindowFocus=false để tránh request lặp khi lỗi/chuyển cửa sổ. Mutations retry=false. Chưa có query nghiệp vụ; các feature tương lai phải chốt cache/invalidation theo contract riêng, không kế thừa ngầm chính sách cho mượn/trả/phạt/thống kê.

Health dùng useMutation để theo dõi thao tác kỹ thuật **chỉ chạy sau click**, dù HTTP method vẫn GET; không lưu health như dữ liệu nghiệp vụ hay polling. Có pending/disable, success kiểm envelope, và error không làm app sập.

Client state hiện chỉ dùng state cục bộ/provider; QueryClient dùng useState lazy để không tạo lại mỗi render. Không có nhu cầu Zustand/context dùng chung ở FE-02. Khi có yêu cầu state chia sẻ thật mới thêm store, không đưa server DTO vào store để tạo hai nguồn sự thật. Chưa chọn persistence hoặc kiến trúc auth.

## Feature và quy tắc mở rộng

Feature tự giữ page/component/API/hook/test liên quan; app chỉ ghép provider/router. Thành phần dùng chung chỉ đưa ra components khi có reuse thực, không gom tất cả vào utils. Dùng PascalCase cho React component/file JSX, camelCase hàm JS, kebab-case file utility, tên khóa API giữ nguyên. Quy ước [Backend](../../Backend/docs/quy-uoc-dat-ten.md) là phạm vi Backend, không đổi URL/JSON sang tên hàm UI.

Import tương đối, không alias trong FE-02; Vite/Vitest cùng config nên không cần hai mapping. Feature dùng lib/api, không import source Backend và không gọi trực tiếp MySQL. Không tạo service cho endpoint thiếu hoặc chưa có contract đọc được. Unit test ở cạnh phần kiểm tra; setup matcher/cleanup ở src/kiem-thu.

## CSS và chất lượng

Tailwind **4.3.5** qua @tailwindcss/vite và `@import "tailwindcss"`; chỉ utility tối thiểu + CSS base trung tính. Không design token, màu Warm Wooden Library, component variants, dark mode hoặc UI library. FE-03 phụ trách thiết kế.

ESLint flat config: JS recommended + React hooks recommended + React refresh; JS/JSX, không tắt toàn bộ rule. Vitest **5.1.1**, jsdom **31.0.1**, RTL: render/routing/click/offline/config, HTTP response/error; adapter/mock chỉ dữ liệu kỹ thuật trong test, không đưa mock vào app. Tests không phụ thuộc Backend/MySQL/token thật.

Nguồn đối chiếu: [React Router declarative](https://reactrouter.com/start/declarative/installation), [TanStack defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [Axios instance](https://axios-http.com/docs/instance).
