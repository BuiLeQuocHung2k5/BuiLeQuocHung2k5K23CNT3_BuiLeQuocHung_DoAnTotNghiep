# QA-01 — Verification report

Ngày xác minh2026-11-19, Node24.20.0/npm11.19.0, Windows/PowerShell; không thay env file, DB, package hoặc Git index. Commands từ root trừ khi ghi prefix. Kết quả mới, không dùng số pass FE-03/TASK-018 làm lần chạy QA.

| Hạng mục | Trước tối ưu | Sau tối ưu | Kết quả / giới hạn |
|---|---|---|---|
| Backend `npm.cmd --prefix Backend test` | 172pass/0fail/0skip | 172pass/0fail/0skip | Node unit/safety, router/controller/service thật với model/connection mock; không ghi MySQL thật |
| Backend targeted `node --test test/sach.test.js test/an-toan-tich-hop.test.js` tại Backend | Các case nằm trong baseline172 | 34pass/0fail/0skip | POST/PUT/415/validation/lifecycle/error + safety guard |
| Backend MySQL integration | Không chạy | Không chạy | Chưa xác minh instance/data/cleanup độc lập được phép; không setup/seed, không chạy runner ghi hoặc instance-isolee |
| Backend lint/build scripts | Không có | Không có | Không thêm package/script chỉ cho audit; subset ESLint riêng59src: no-undef/no-unreachable/no-constant-condition/no-unused-vars đạt, bỏ qua args/catch/rest siblings như script |
| Frontend `npm.cmd --prefix Frontend run test:run` | 78pass/6file | 78pass/6file | 0fail, không xóa/sửa tests FE02/03; jsdom không browser layout |
| Frontend `npm.cmd --prefix Frontend run lint` | exit0 | exit0 | ESLint JS/hooks/refresh |
| Frontend `npm.cmd --prefix Frontend run build` | exit0 | exit0 | Vite production, không cảnh báo chunk lớn; xem kích thước dưới |
| Parser/import/casing/cycles | 107files/251edges/0errors | 107files/251edges/0errors | Backend73 node --check; JSX qua Espree;4CSS review riêng |
| Runtime endpoints | 40unique/29JWT/11public | 40unique/29JWT/11public | Route enumeration, không phải40success HTTP |
| SQL metadata/HTTP read smoke | Đạt | Đạt | SELECT-only wrapper, getConnection bị cấm;17HTTP checks/12SELECT |
| Real server/health-api/Axios | Đạt probe trước sửa | Đạt probe cuối | Vite SSR dùng source thật/cấu hình process test, **không browser** |
| Browser responsive/accessibility | Chưa xác minh | Chưa xác minh | Native pipe os error2; browser access host unavailable/inventory rỗng |
| npm advisory audit | Không report hợp lệ | Không có cập nhật package | exit1/JSON message,error, không metadata/vulnerabilities; không báo0 vulnerabilities |

## Bằng chứng có thể chạy lại

- `node docs/quality-audit/verify-smoke.mjs`: SELECT metadata/aggregate/grants và factory app với wrapper chỉ SELECT/cấm transaction; health/db/catalog200, protected thiếuJWT401, invalid list/id400, unknown404, CORS* và OPTIONS204. JWT probe ba đoạn sai trả503 JWT_NOT_CONFIGURED. [smoke.json](evidence/smoke.json).
- `node docs/quality-audit/verify-static.mjs after`: parser/import/case/cycle, Backend syntax/subset linter,33direct manifests/locks/installed,96 cột DDL so metadata tên/kiểu/NULL, hash baseline/index. [before](evidence/static-before.json), [after](evidence/static-after.json). Đây là parser DDL phục vụ96 cột hiện tại, không thay MySQL parser hay chứng nhận toàn schema.
- `node docs/quality-audit/verify-health-client.mjs`: process hiện tại không có origin hợp lệ, actual interceptor chặn; start server.js thật3000, health-db200; đặt origin trong process kiểm thử, nạp health-api/Axios bằng Vite SSR, trả200/envelope đúng. Đóng Vite và child Backend, phục hồi biến process sau kiểm. [health-client.json](evidence/health-client.json).
- [baseline.json](evidence/baseline.json): HEAD/status/hash trước QA, không bao gồm nội dung hoặc hash env files. Index so sánh với baseline giữ nguyên; package/SQL và Frontend runtime byte hash không đổi. Bộ báo cáo/scripting không có credentials hoặc PII.

HTTP smoke trả payload catalog nhưng không in/lưu dữ liệu hàng; chỉ status/envelope. Metadata chứa tên bảng/cột/index và tên role/quyền thiết kế, không hồ sơ. Health và SELECT main không chứng minh khả năng login/ghi; không POST login thành công vì login ghi usage event. Không thay auth để bypass blockers.

## Build và đo lường

Baseline build:2382modules transformed, baseJS381.34kB/gzip121.75, previewJS65.66/gzip21.71, CSS31.44/gzip7.07,24font assets tổng357076byte. Lượt build sau sửa inventory:baseJS381.34/gzip121.75, preview65.66/gzip21.71, CSS31.46/gzip7.08; Frontend source/styles/package hash giữ nguyên. CSS output có thay đổi nhỏ dù runtime source không đổi; không tuyên bố binary identical hoặc performance gain. Artifact cuối ghi ở evidence tài liệu kiểm tra. Chưa đo request waterfall/CPU/render/Web Vitals hoặc benchmark DB; không gọi kích thước output là dung lượng tải thực.

24 contrast assertions đọc token thật:16text≥4.5:1 và8boundary/focus≥3:1. Không chứng nhận mọi disabled/hover/overlap/composition hay AT đạt. Test Dialog có shim PointerCapture trong FE03 test; swipe thật vẫn chưa kiểm.

## Checklist Chrome/Edge cần nghiệm thu thủ công

Khởi động Backend và Vite đúng setup/origin; không dùng DB chính cho thao tác ghi. Checklist này chưa được tick bởi QA-01.

| Kiểm tra | 375px | 768px | 1280px |
|---|---|---|---|
| / và /design-system: chữ tiếng Việt/font, wrap, heading/spacing, không overflow toàn trang | Chưa kiểm | Chưa kiểm | Chưa kiểm |
| Button/Input/Select/Checkbox: focus rõ, kích thước thao tác, loading/disabled/error | Chưa kiểm | Chưa kiểm | Chưa kiểm |
| Dialog: nằm trong viewport, cuộn phần nội dung, Close/footer bấm được | Chưa kiểm | Chưa kiểm | Chưa kiểm |
| Table: vùng cuộn ngang riêng khi cần, không làm tràn page | Chưa kiểm | Chưa kiểm | Chưa kiểm |
| Toast: vị trí/không che action, close/swipe | Chưa kiểm | Chưa kiểm | Chưa kiểm |

- Keyboard: skip link, Tab/ShiftTab theo thứ tự, label associations, Select/Checkbox native; mở Dialog bằng Enter, trap focus, Escape, focus về trigger.
- Zoom200%: text reflow, Dialog/table/action không mất nội dung; cả trang foundation và preview.
- Reduced motion: bật mô phỏng prefers-reduced-motion, kiểm spinner/skeleton/toast thực và không mất feedback.
- Screen reader: landmarks/headings, tên/description/error controls, live status/loading/toast; màu không là tín hiệu duy nhất.
- Health: bấm duy nhất gửi đúng /api/health, success thật; thử Backend tắt → network error, thiếu origin → setup message; DevTools kiểm CORS/mixed content/console/network, không ghi secret/token vào biên bản.

## Chưa thực hiện

Integration ghi MySQL mới, fine create/duplicate/pay thật, forecast ready/coverage/MAE thật, tải/concurrency nhiều connection, production deployment/Linux, browser/AT/zoom/reduced motion thật, security advisory report hợp lệ và coverage% instrumentation. Không request permission lại chỉ để kết thúc audit; các bước này được bàn giao task riêng, không giả pass.

## Kiểm tra bàn giao cuối

[deliverables.json](evidence/deliverables.json) ghi danh sách **10 file có trước sửa +18 file mới** (8 report,3 script,7 evidence), kết quả tests và kích thước assets cuối. 178 liên kết nội bộ trong các Markdown thay đổi/mới hợp lệ;40method/path trong inventory khớp runtime40/40, không thiếu/thừa/trùng. UTF-8 strict decode không lỗi/replacement character; bỏ BOM ở inventory/root handoff để cùng UTF-8 không BOM. Rà mẫu secret độ tin cậy cao không thấy match trong file QA (không phải quét secret toàn bộ hệ thống/lịch sử).

50 file được bảo vệ bằng hash gồm SQL/package/lock/Frontend src/config kiểm tra không đổi; index nguyên baseline67 staged, branch main, không thấy .git lồng ngoài node_modules/dist. Các file có trước thay đổi được liệt kê riêng, không nhầm toàn bộ staged FE thành QA diff. `git diff --check` exit0; Git có cảnh báo LF→CRLF do core.autocrlf=true, không lỗi whitespace. Build cuối CSS31.46kB/gzip7.08, base/lazy JS giữ các số đo nêu trên. Không giữ Backend/Vite process từ probe.
