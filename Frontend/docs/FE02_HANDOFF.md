# Bàn giao FE-02

Ngày xác minh: **2026-11-19**. Nền tảng React + Vite JavaScript/JSX đã triển khai; chờ nghiệm thu, không tự làm FE-03.

## Phạm vi file

- Source: [main](../src/main.jsx), [App](../src/app/App.jsx), [providers](../src/app/providers/AppProviders.jsx), [router](../src/app/router/AppRoutes.jsx), [trang kỹ thuật](../src/features/foundation/FoundationPage.jsx), [health API](../src/features/foundation/health-api.js), [fallback](../src/pages/NotFoundPage.jsx), [env](../src/config/environment.js), [Axios](../src/lib/api/http-client.js), [QueryClient](../src/lib/query-client.js), [CSS](../src/styles/index.css).
- Config/build: package.json/package-lock.json, .env.example/.gitignore, index.html, vite.config.js, eslint.config.js. Template create-vite9.3.4 React được tạo riêng, không ghi đè Frontend/docs; scaffold tạm đã dọn đúng đường dẫn.
- Test: src/app/App.test.jsx, src/config/environment.test.js, src/lib/api/http-client.test.js, src/test/setup.js.
- Docs: [README](../README.md), [setup](FE02_SETUP_GUIDE.md), [architecture](FE02_ARCHITECTURE.md), [dependencies](FE02_DEPENDENCIES.md), [Backend dependencies](FE02_BACKEND_DEPENDENCIES.md), FE02_HANDOFF.md. Cập nhật docs/PROJECT_CONTEXT, DECISIONS, TASKS, HANDOFF cho FE-02.

## Quyết định triển khai

React19.3.1/Vite8.3.6, Router8.5.2 declarative với `/` và `*`. QueryClientProvider được tạo ổn định theo app mount, retry=false; chưa áp cache theo nghiệp vụ. Client state cục bộ, chưa cần Zustand/auth provider/store. Axios giữ response/error, timeout10s; env là origin, thêm /api một lần; thiếu config vẫn render nhưng chặn request. Chỉ GET health sau click, không startup request/polling/token/cookie/refresh/retry ghi. Tailwind4.3.5 qua Vite plugin, CSS trung tính; chưa có Design System. Chi tiết và căn cứ: [architecture](FE02_ARCHITECTURE.md).

## Kiểm tra và giới hạn

- Node **24.20.0**, npm **11.19.0**; runtime/dev install thành công, npm báo 0 vulnerabilities tại lần cài.
- Lint đạt, production build đạt, **22/22 test tại 3 file đạt**: render không Backend, routing fallback/Link, click health/offline/config, env validation, giữ HTTP status/header/envelope/error và không retry ghi. Test dùng adapter/mock kỹ thuật, không MySQL/token thật.
- Dev server Vite sẵn sàng tại loopback5173; GET `/`, `/not-found-check`, `/src/main.jsx`, `/src/styles/index.css`, `/@vite/client` đều200. Entry/module đúng và Tailwind utility được xử lý ở dev + production CSS. HTTP200/RTL không được tính là browser check.
- **Browser UI chưa xác minh**: công cụ browser trả “The browser access host is unavailable”. Không tải Playwright hoặc browser binaries để thay thế. Kiểm tra browser thủ công còn mở khi nghiệm thu.
- Không kiểm Backend/auth/DB thật trong FE-02; các hạn chế FE-01 là snapshot lịch sử. Inventory FE-01 có lỗi mã hóa và contract trống, giữ nguyên; chỉ dùng 05 guide + health source đủ cho nền tảng, chưa xây service nghiệp vụ phụ thuộc phần bị thiếu.

Kiểm tra cuối sau cài sạch:

- `npm ci` đạt (245 packages cài, 252 audited, 0 vulnerabilities tại thời điểm chạy); `npm ls --depth=0` có đủ **5 runtime + 15 dev dependency**, không missing/invalid/extraneous. Lần npm install đầu có package optional dư; cài sạch đã xử lý, không dùng force/legacy-peer-deps.
- Lint/test/build sau `ci` tiếp tục đạt: **22 test, 3 file**, Vite transform204 modules, bundle JS344.94kB (gzip111.47kB), CSS8.13kB. Build không cảnh báo cấu hình/bundle.
- `preview` loopback4173: root, JS/CSS assets và deep-link fallback đều200; server dev/preview thử nghiệm đã dừng. Đây là kiểm tra HTTP, không phải browser UI.
- SHA-256 **107 file** Backend và 6 tài liệu FE-01 trùng baseline trước FE-02; không thêm/xóa file Backend. Không sửa `.env` Backend hoặc truy vấn DB. Các thay đổi FE-01 có sẵn trước task được giữ, gồm docs/DATABASE.md.
- **51 liên kết nội bộ** của README và 5 tài liệu FE-02 hợp lệ; source line anchor không trống/ngoài file. Package/lock version khớp20 dependency trực tiếp. Git ignore env.local/dist/node_modules hoạt động; scaffold tạm không còn. `git diff --check` và diff Backend đạt; Git chỉ cảnh báo chuyển LF/CRLF theo cấu hình hiện có.
- Tra npm registry lần đầu trong sandbox gặp EACCES; đã chạy lại npm qua quyền mạng được duyệt và các lệnh cài/kiểm tra thành công. Không còn bước cài đặt bị chặn. Browser host vẫn không khả dụng như đã ghi trên.

Danh sách dependency/version tại [dependencies](FE02_DEPENDENCIES.md). Rà mẫu token/private key/URL credential ở file mới không phát hiện secret thật; fixture URL trong unit test là dữ liệu kỹ thuật giả, không phải credential thật. Không gọi đó là pentest/audit toàn diện.

## Bàn giao

**Hoàn tất phạm vi nền tảng FE-02 và đạt các kiểm tra tự động, chờ người dùng nghiệm thu; browser UI thực chưa xác minh.** Chưa có business page/sidebar/header/login/dashboard/catalog, protected route, mock auth/data, theme/tokens hoặc component library. Không sửa Backend/database/SQL/env/test/package Backend hoặc 6 tài liệu FE-01; đã kiểm chứng hash bảo toàn.

Điều kiện FE-03: người dùng nghiệm thu FE-02 và giao task thiết kế riêng; có thể làm Design System độc lập với Backend. Browser check vẫn cần ghi nhận khi môi trường khả dụng. Các task phụ thuộc API nghiệp vụ phải xử lý tài liệu contract và điều kiện liên quan trong [Backend dependencies](FE02_BACKEND_DEPENDENCIES.md). Dừng sau FE-02, không tự triển khai FE-03.
