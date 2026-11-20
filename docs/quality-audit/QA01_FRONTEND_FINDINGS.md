# QA-01 — Frontend findings

Xác minh 2026-11-19, giai đoạn A trước sửa source. Nguồn: 38 file src (34 JS/JSX gồm6 test và setup, 4 CSS), Vite/ESLint/manifest/lockfile, README và tài liệu FE-01..03. Phạm vi parser/baseline: [static](evidence/static-before.json), [hash ban đầu](evidence/baseline.json).

| ID / mức | Vị trí | Vấn đề / bằng chứng | Xử lý |
|---|---|---|---|
| F01 P1 | [inventory01](../../Frontend/docs/01_BACKEND_API_INVENTORY.md), mục contract | Bytes đã chứa dấu `?` thay chữ, không phải chỉ console decode sai; mục request/response chỉ còn tiêu đề/thiếu bảng. Method/path vẫn có40 dòng, các phần validation/DTO còn một phần. | Viết lại UTF-8 theo source, bảng40 endpoint + alias query/body/DTO/error/date và nguồn module. Không đổi API. |
| F02 P1 | [Vite](../../Frontend/vite.config.js), [env](../../Frontend/src/cau-hinh/moi-truong.js), [health](../../Frontend/src/chuc-nang/nen-tang/api-suc-khoe.js) | Không dịch vụ trả lời3000/5173 khi audit. Process hiện tại thiếu VITE_API_BASE_URL, client chặn đúng; FE-02-RUN từng đặt biến chỉ trong process, không phải cấu hình bền. | Chạy Backend/Vite với origin rõ ràng theo setup guide. [Probe](evidence/health-client.json): server.js3000/DB200; health-api/Axios thật200 trong cấu hình process test. Không sửa env/client/CORS, không fake response. |
| F03 P1 (gate) | [components CSS](../../Frontend/src/kieu-dang/thanh-phan.css), [preview CSS](../../Frontend/src/kieu-dang/he-thong-giao-dien.css) | Chưa có bằng chứng layout browser375/768/1280, mobile dialog/table swipe, focus thật, zoom200%, reduced-motion thực hay AT. Native pipe/browser host đều unavailable tại QA-01. | Checklist trong verification report; chặn nghiệm thu trực quan FE-03 trước FE-04, không coi RTL/HTTP là visual pass. |
| F04 P2 | [package/lock](../../Frontend/package.json) | Audit advisory registry không trả metadata/vulnerabilities (exit1, JSON message/error); cả registry mặc định và public kiểm tra đều không có báo cáo hợp lệ. `npm ls` sạch không phải security audit. | Không tuyên bố0 vulnerabilities. Chạy lại npm audit khi registry hỗ trợ, đánh giá advisory theo reachability; không nâng major/gỡ package tự động. |
| F05 P2 | [http client](../../Frontend/src/thu-vien/api/ket-noi-http.js), [query client](../../Frontend/src/thu-vien/trinh-truy-van.js) | Axios giữ response/error, timeout10s, không credentials; không token/refresh/retry/redirect. Đây là nền tảng FE-02, chưa có session/guards nghiệp vụ. | Giữ đúng scope; FE-04 cần quyết định session, UX401/403 riêng. Không dùng scaffold hiện tại như auth hoàn chỉnh. |
| F06 P3 | [preview](../../Frontend/src/chuc-nang/he-thong-giao-dien/TrangHeThongGiaoDien.jsx), `palette`; [tokens](../../Frontend/src/kieu-dang/bien-thiet-ke.css) | Hex label palette lặp token; swatch thực dùng var(token). Đổi token sau này có thể làm label sai; hiện7 màu khớp. --text-lead/--space-20 chưa có caller trực tiếp, @theme và Sonner vars dùng gián tiếp. | Không xóa tokens public/future hoặc chuyển đọc computed style chỉ để giảm vài literal; đồng bộ khi palette đổi. |
| F07 P3 | [thanh-phan](../../Frontend/src/thanh-phan/giao-dien), [HopThoai](../../Frontend/src/thanh-phan/giao-dien/HopThoai.jsx) | 15 nhóm có props/default/className nhất quán; Input/Textarea/Select lặp mô tả helper/error và useId nhưng Field đã dùng chung. Alert chọn role bởi caller, title bắt buộc theo catalog; icon-only Button cần aria-label do caller. | Không thêm abstraction/memoization hoặc đổi public props. Trách nhiệm caller cần giữ trong guidelines, chưa phát hiện lỗi functional để sửa tự động. |
| F08 P3 | [kieu-dang](../../Frontend/src/kieu-dang/toan-cuc.css), [providers](../../Frontend/src/ung-dung/bo-cung-cap/BoCungCapUngDung.jsx) | Base JS381.34kB/gzip121.75, preview lazy65.66/gzip21.71, CSS31.44/gzip7.07; 24 font assets357076byte gồmwoff/woff2 fallback. Đây là output size, không là bytes thực mọi browser tải hay performance regression. | Không bỏ fallback/subset/weights chưa có benchmark; Lora400/500/italic400, Be Vietnam400/500/600 đều có caller; font-display swap/local. |

## Rà soát từng nhóm UI

| Nhóm / source trong src/components/ui | Kết luận kiểm source + test hiện tại |
|---|---|
| Button.jsx | 5 variants/3sizes; type=button; loading disabled+busy, giữ label; click disabled/loading bị chặn. |
| Input.jsx | useId/label/required/native props; external/helper/error aria-describedby, error aria-invalid. |
| Textarea.jsx | Cùng quy ước Field, rows4/resize; typing và disabled dùng native semantics. |
| Select.jsx | Native options; placeholder disabled/value rỗng; controlled và defaultValue passthrough; native label/error. |
| Checkbox.jsx | Native checkbox trong label/useId; controlled/disabled; label click và Space được test. |
| Badge.jsx | 5 semantic tone, label text ngoài màu; trước dấu trang trí không thay nội dung. |
| Card.jsx | 6 phần composition, heading as; không state/API; không trùng Dialog responsibility. |
| Alert.jsx | info/success/warning/error mapping danger; role note mặc định, caller chọn live role; icon trang trí. |
| Dialog.jsx | Radix portal/title/description/close44px; test Tab/ShiftTab trap, Escape, restore focus; no-description bỏ aria-describedby. Browser mobile còn mở. |
| Table.jsx | caption, scope=col, region tabIndex0+overflow-x; loading không giữ stale rows, empty colSpan. Không có sorting/pagination giả. |
| Skeleton.jsx | Decorative aria-hidden, các variants CSS; caller cung cấp status. |
| EmptyState.jsx | Text/description/action và icon decorative, không fetch. |
| Spinner.jsx | Named role=status, visual ring aria-hidden; reduced motion CSS dùng chung. |
| Toaster.jsx | Singleton provider; Sonner light/classes semantic/close label; toast click+dismiss được test. Swipe browser chưa kiểm. |
| Icon.jsx | Named import Lucide; hidden mặc định, label→role img; không toàn bộ icon object lookup. |

Field.jsx là helper thứ16, không nhóm UI mới. UI không import API/auth/store. 6 section preview chỉ state UI cục bộ và neutral fixtures; không dữ liệu nghiệp vụ giả. Cấu trúc app/providers/router/features/lib/config/styles hợp lý cho giai đoạn này; không tồn tại hooks/layouts/stores/utils scaffold rỗng cần dọn. QueryClient tạo ổn định qua useState initializer; không useEffect gọi health khi mount, không memo/useCallback dư. /design-system lazy+Suspense, / và wildcard có test. Chưa có số đo browser render/Web Vitals.

Palette/semantic tokens/light/Warm Wooden Library giữ nguyên; spacing4px, radius/shadow/focus3px, reduced-motion global; responsive có breakpoints479/639/900 phục vụ các thành phần khác nhau, không có bằng chứng cần ép cùng một breakpoint. 24 assertions contrast là16 cặp text và8 boundary/focus, chưa chứng minh mọi state/rendered composition đạt WCAG.
