# FE-02 — Dependency

Xác minh 2026-11-19 bằng npm registry metadata, package.json/lockfile và npm ls. Direct dependencies pin exact để lockfile tái lập. Toolchain thực tế Node24.20.0/npm11.19.0; engines của dự án chọn Node24.15+ nhánh24/npm11.x vì jsdom31 cần Node24.15+; React Router8 cần Node22.22+, Vitest5 hỗ trợ Node24. Không nâng Node hệ thống.

## Runtime trực tiếp

| Package | Phiên bản | Mục đích / lý do |
|---|---|---|
| react | 19.3.1 | React JavaScript template, UI |
| react-dom | 19.3.1 | createRoot, cùng version React |
| react-router | 8.5.2 | Declarative BrowserRouter/Routes/Link, không cần thêm react-router-dom |
| axios | 1.21.1 | Shared HTTP instance, giữ AxiosResponse/AxiosError |
| @tanstack/react-query | 5.108.0 | QueryClientProvider và trạng thái health thủ công |

## Development trực tiếp

| Package | Phiên bản | Mục đích |
|---|---|---|
| vite | 8.3.6 | Dev/build/preview; cùng major template React đã chọn |
| @vitejs/plugin-react | 6.3.0 | JSX/React refresh, peer Vite8 |
| tailwindcss | 4.3.5 | Build CSS utility, chưa có theme FE-03 |
| @tailwindcss/vite | 4.3.5 | Plugin Vite v4, không cấu hình PostCSS/v3 |
| eslint | 10.15.0 | Lint JS/JSX |
| @eslint/js | 10.0.1 | Recommended rules tương thích ESLint10 |
| globals | 17.14.0 | Browser/Node globals theo phạm vi file |
| eslint-plugin-react-hooks | 7.1.1 | Hooks rules; peer hỗ trợ ESLint10 |
| eslint-plugin-react-refresh | 0.5.8 | React refresh export rules; peer ESLint9/10 |
| vitest | 5.1.1 | Runner, mock, assert; Vite config dùng chung |
| jsdom | 31.0.1 | DOM test environment |
| @testing-library/react | 16.3.3 | Render và query UI, peer React19 |
| @testing-library/dom | 10.4.2 | Peer DOM utilities của RTL |
| @testing-library/jest-dom | 7.0.1 | DOM matchers cho Vitest |
| @testing-library/user-event | 14.6.13 | Tương tác click/link trong test |

create-vite **9.3.4** chỉ dùng qua npm exec để scaffold template React JavaScript, không là dependency runtime/dev lưu trong dự án. Template React mới có oxlint; FE-02 chọn ESLint như yêu cầu, không cài thêm hai linter. Các @types nếu npm tự cài peer là phụ thuộc gián tiếp hỗ trợ thư viện, không chuyển app sang TypeScript.

## Chưa cài

Zustand (chưa có state chung), shadcn/ui (component/theme thuộc FE-03), React Hook Form/Zod (chưa có form nghiệp vụ), Recharts (chưa chart), Sonner/Lucide (chưa UI chung), Playwright/browser binaries (E2E hoãn). Không Prettier hoặc framework khác. Không tạo store/provider để biện minh cho dependency chưa dùng.

Các phiên bản/engines/peers được tra qua npm view trước cài; npm install runtime/dev thành công, báo 0 vulnerabilities tại lần cài, không tương đương pentest. Kết quả npm ci/npm ls và các cảnh báo cuối cùng ở [handoff](FE02_HANDOFF.md). Không dùng --force/--legacy-peer-deps để bỏ xung đột.

Tài liệu chính thức: [Vite](https://vite.dev/guide/), [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite), [React Router](https://reactrouter.com/start/declarative/installation), [Vitest](https://vitest.dev/guide/), [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/), [TanStack](https://tanstack.com/query/latest/docs/framework/react/installation).
