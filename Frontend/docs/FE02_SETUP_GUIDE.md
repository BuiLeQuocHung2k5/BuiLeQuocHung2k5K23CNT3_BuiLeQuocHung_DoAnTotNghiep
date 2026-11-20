# FE-02 — Cài đặt và vận hành local

Xác minh 2026-11-19. Dự án dùng JS/JSX, không TypeScript. Engine trong [package.json](../package.json) chọn Node `>=24.15.0 <25`, npm `>=11 <12`; môi trường thực tế Node **24.20.0**, npm **11.19.0**. Giới hạn Node 24.15 do jsdom 31; chọn nhánh LTS 24 thống nhất. Không nâng Node toàn hệ thống.

## Cài và chạy

Từ gốc LibriFlow:

```powershell
node --version
npm.cmd --version
npm.cmd --prefix Frontend ci
```

Nếu chưa có cấu hình riêng, copy `Frontend/.env.example` sang `Frontend/.env.local`. Không ghi đè `.env.local` đang có. Giá trị local trong example lấy từ [FE-01 guide](05_FRONTEND_INTEGRATION_GUIDE.md) và default/bind tại [Backend server](../../Backend/src/server.js#L4), không xác nhận cổng riêng đang chạy. Nếu operator đổi PORT, cập nhật origin tương ứng ở FE.

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:3000
```

Không kèm `/api`, đường dẫn, query, fragment hoặc credentials; [moi-truong.js](../src/cau-hinh/moi-truong.js) kiểm tra và thêm `/api` đúng một lần. Chỉ có một biến env thực sự dùng. `.env.local`, các `.env.*` khác bị ignore; `.env.example` được giữ lại. `VITE_` được bundle tới browser, tuyệt đối không dùng cho DB password/JWT secret/private key.

```powershell
npm.cmd --prefix Frontend run dev
```

Mở `http://127.0.0.1:5173`. Thiếu/sai env: trang vẫn render hướng dẫn, client chặn network thay vì gửi nhầm sang origin Vite. Khởi động lại Vite sau sửa env. Không tạo `.env` Backend trong task này.

## Chạy cùng Backend

Khi môi trường Backend đã được operator chuẩn bị, mở terminal riêng và chạy lệnh hiện hữu `npm.cmd --prefix Backend run dev`. Server kiểm tra DB trước listen, nên cần kết nối DB hợp lệ. FE không cần Backend để startup/build/test. Không chạy migration/seed/integration setup hoặc tạo tài khoản để làm FE render.

CORS hiện tại là `cors()` wildcard tại [factory](../../Backend/src/app-factory.js#L49); client không bật credentials, không tự thêm Authorization. Nút health chỉ gửi GET `/api/health` công khai sau click; timeout 10 giây là quyết định UX FE-02, không phải timeout contract Backend. Không polling hoặc retry ngầm. Nút báo lỗi khi offline/CORS/timeout; không đánh đồng health process với DB/auth đã sẵn sàng.

## Các lệnh kiểm tra

| Lệnh trong Frontend | Ý nghĩa |
|---|---|
| npm.cmd ci | Cài đúng lockfile, dùng cho máy mới/CI |
| npm.cmd run lint | ESLint JS/JSX và React hooks/refresh |
| npm.cmd run test | Vitest watch |
| npm.cmd run test:run | Vitest một lần, jsdom/RTL, không gọi Backend/MySQL |
| npm.cmd run build | Production artifact dist/ |
| npm.cmd run preview | Phục vụ dist local tại 127.0.0.1:4173 |

Vite + plugin React và Tailwind Vite plugin dùng chung cấu hình Vitest ở [vite.config.js](../vite.config.js). Không cần PostCSS/Tailwind config kiểu v3 hoặc lệnh `tailwindcss init`. Browser deployment cần rewrite route SPA về index.html; preview chỉ để kiểm tra local, chưa phải deployment server.

## Lỗi thường gặp

- `EBADENGINE`: dùng Node/npm theo engines, không ép bỏ qua để cài bộ không tương thích.
- VITE_API_BASE_URL có `/api`: sửa thành origin; frontend tự nối prefix. Không dùng URL có user/password.
- Đổi env chưa hiệu lực: restart dev server; production cần build lại vì env được thay ở build time.
- Health lỗi nhưng app render: kiểm tra URL/cổng, Backend có chạy và CORS; không cần sửa JWT cho health public.
- 5173/4173 bận: strictPort sẽ dừng, chọn cổng khác bằng `npm.cmd run dev -- --port 5174` hoặc dừng đúng instance của mình; không kill process không xác minh.
- Deep link 404 trên host tương lai: cấu hình SPA fallback ở host; chưa có hosting trong FE-02.
- Không thấy styles: kiểm tra import `src/kieu-dang/toan-cuc.css`, plugin `@tailwindcss/vite`, và `@import "tailwindcss"`; không trộn CSS demo template.

Tài liệu chính thức đã đối chiếu: [Vite](https://vite.dev/guide/), [Tailwind với Vite](https://tailwindcss.com/docs/installation/using-vite), [Vitest](https://vitest.dev/guide/). Phiên bản cài chính xác và quyết định tương thích ở [dependencies](FE02_DEPENDENCIES.md).
