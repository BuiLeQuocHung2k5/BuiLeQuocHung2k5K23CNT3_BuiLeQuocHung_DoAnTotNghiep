# QA-01 — Dependency review

Xác minh 2026-11-19 từ hai package.json/lockfile v3, package cài sẵn và `npm.cmd ls --depth=0` (cả hai exit0). **33 dependency trực tiếp: Backend7 production+1dev, Frontend10 production+15dev**. Installed versions trùng lock, root lock dependencies/devDependencies trùng manifest. Không npm install/ci/upgrade/dedupe/uninstall hoặc sửa manifest/lock. [Chi tiết máy kiểm](evidence/static-after.json).

A=đang dùng runtime/tool/test; B=giữ cho task tương lai; C=ứng viên bỏ; D=trùng chức năng. Không phát hiện dependency trực tiếp loạiC/D đủ căn cứ để bỏ; tất cả33 hiện có vai tròA. Không kết luận từ việc thiếu import trong entrypoint.

| Backend package | Locked / installed | Loại, caller / vai trò |
|---|---|---|
| bcryptjs | 3.0.3 | A, services/xac-thuc.service.js; hash/compare async |
| cors | 2.8.6 | A, app-factory.js |
| dotenv | 18.0.9 | A, config/co-so-du-lieu.js và integration/an-toan.mjs |
| express | 5.3.0 | A, factory và tất cả routes |
| express-rate-limit | 8.7.3 | A, routes/xac-thuc.routes.js |
| jsonwebtoken | 9.0.3 | A, utils/jwt.js |
| mysql2 | 3.24.6 | A, pool và harness MySQL |
| nodemon (dev) | 3.1.14 | A, npm run dev; không phải unused vì không import trong src |

Backend manifest dùng caret, lock pin phiên bản hiện tại; không coi caret là lỗi hoặc tự đổi chính sách pin. main=index.js lỗi metadata mứcP3, npm scripts dùng server.js đúng.

| Frontend package | Locked / installed | Loại, caller / vai trò |
|---|---|---|
| @fontsource/be-vietnam-pro | 5.3.0 | A, styles/index.css; Latin/Vietnamese400/500/600 |
| @fontsource/lora | 5.3.0 | A, styles/index.css; Latin/Vietnamese400/500/italic400 |
| @radix-ui/react-dialog | 1.3.1 | A, Dialog.jsx; focus/modal/portal |
| @tanstack/react-query | 5.108.0 | A, query-client/provider/health mutation |
| axios | 1.21.1 | A, lib/api/http-client.js |
| lucide-react | 1.75.0 | A, named imports Alert/Dialog/preview/tests |
| react | 19.3.1 | A, components/hooks/JSX runtime |
| react-dom | 19.3.1 | A, main.jsx createRoot |
| react-router | 8.5.2 | A, App/router/Link; không thêm react-router-dom trùng API |
| sonner | 2.0.8 | A, Toaster/provider và preview |
| @eslint/js (dev) | 10.0.1 | A, eslint.config.js |
| @tailwindcss/vite (dev) | 4.3.5 | A, vite.config.js |
| @testing-library/dom (dev) | 10.4.2 | A, DOM testing layer/peer cho RTL/user-event, không coi unused vì không import trực tiếp |
| @testing-library/jest-dom (dev) | 7.0.1 | A, src/test/setup.js matchers |
| @testing-library/react (dev) | 16.3.3 | A, App/UI/preview tests |
| @testing-library/user-event (dev) | 14.6.13 | A, keyboard/click/type tests |
| @vitejs/plugin-react (dev) | 6.3.0 | A, vite.config.js |
| eslint (dev) | 10.15.0 | A, npm run lint |
| eslint-plugin-react-hooks (dev) | 7.1.1 | A, eslint.config.js |
| eslint-plugin-react-refresh (dev) | 0.5.8 | A, eslint.config.js |
| globals (dev) | 17.14.0 | A, eslint.config.js |
| jsdom (dev) | 31.0.1 | A, Vitest environment |
| tailwindcss (dev) | 4.3.5 | A, CSS import+Vite plugin |
| vite (dev) | 8.3.6 | A, dev/build/preview |
| vitest (dev) | 5.1.1 | A, test/test:run/config |

Frontend pin exact; engines Node>=24.15<25/npm>=11<12, chạy Node24.20.0/npm11.19.0 phù hợp. Không đổi stack hoặc thêm thư viện audit.

Lock Backend không có tên package nhiều version. Lock Frontend có10 tên nhiều version: @emnapi/core, @emnapi/runtime, @emnapi/wasi-threads, eslint-visitor-keys, @napi-rs/wasm-runtime, @tybys/wasm-util, tslib, dom-accessibility-api, hookified, lru-cache. Đây là transitive/build/test/runtime nhánh khác nhau, không chứng minh bundle duplicate hoặc có thể dedupe an toàn. Version chi tiết trong evidence, không tự sửa lock.

`npm audit --json --package-lock-only --ignore-scripts` exit1 ở cả hai project, chỉ có message/error không metadata/vulnerabilities; thử registry public tường minh cũng không nhận report hợp lệ. **Chưa xác minh advisory security hiện tại**, không ghi0 vulnerabilities hoặc coi exit1 là đã tìm thấy lỗ hổng. [Audit attempt](evidence/dependency-audit.json). Chạy lại khi registry khả dụng, ưu tiên advisory chính thức và đánh giá đường chạy ảnh hưởng trước proposal cập nhật; không có proposal major được phê duyệt.

Build output có24 font assets tổng357076byte (woff/woff2 fallback); đó là dung lượng output, không phải mọi font được tải đồng thời. Import weights/subsets có caller. Không chứng minh dependency/font nào thừa để gỡ.
