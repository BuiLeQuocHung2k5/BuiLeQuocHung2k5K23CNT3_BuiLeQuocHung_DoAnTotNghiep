# FE-03 — Báo cáo kiểm tra

Ngày xác minh **2026-11-19**, Node24.20.0/npm11.19.0. Không gọi Backend/MySQL/JWT thật. Đã đọc README và 5 tài liệu FE-02 trước sửa, source/Git và tài liệu dự án bắt buộc; giữ working tree chưa commit của các task trước.

## Tự động

| Kiểm tra | Kết quả |
|---|---|
| Baseline FE-02 trước sửa | 22/22 test,3 file đạt |
| Cài5 dependency UI/font | npm install đạt, báo0 vulnerabilities, không force/legacy-peer-deps |
| npm ls --depth=0 | Dependency đúng version, không missing/invalid/extraneous |
| npm run lint | Đạt, không tắt rules hoặc sửa test cũ |
| npm run test:run | 78/78 test,6 file đạt ở lần chạy sạch; 22 cũ +56 mới |
| npm run build | Đạt; preview lazy chunk, CSS và font self-host được xuất |
| Dev HTTP | `/`, `/design-system`, module preview, index/tokens/components CSS đều200; không error overlay trong response |
| Font local | Be Vietnam Pro Vietnamese400 WOFF2 trả200/11532bytes |
| Bảo toàn / diff / link | Hash Backend/FE-01/FE-02 docs/tests cũ không đổi;43 link nội bộ hợp lệ; diff-check đạt, chỉ cảnh báo LF/CRLF sẵn có |

Phân nhóm test mới: **29 component**, **24 contrast**, **3 preview**. Component test phủ5 Button variants/native props/disabled/loading, field label/required/error/descriptions, native Select/Textarea, Checkbox label/Space,5 Badge tones,4 Alert tones, Card heading, EmptyState action, Spinner/Skeleton, Icon, Table row/empty/loading/region và Dialog keyboard/focus/close. Preview kiểm route/sections không gọi health, đổi state bảng/checkbox và Toast mở/đóng có tone. Test đọc token thực cho16 text pairs và8 boundary/focus pairs, ngưỡng so sánh không làm tròn.

Run cuối sau cập nhật CSS layer/font: lint exit0,78/78 test tại6file exit0/0fail/không unhandled errors; build exit0,2382 modules. MainJS381.34kB,preview lazy65.66kB,CSS31.44kB. Production preview route200 và27/27 assets200(gồm24font files), không cảnh báo bundle; preview4173 đã dừng, dev5173 giữ theo yêu cầu chạy thử trước đó.

Lần đầu thêm Sonner: assertion đều pass nhưng runner có **unhandled TypeError setPointerCapture thiếu trong jsdom**, run đó exit1 và **không được tính PASS**. Đã thêm mô phỏng set/release/hasPointerCapture trong **test preview mới**, restore descriptor sau file; không sửa setup hoặc test FE-02, không sửa production để nuốt lỗi. Lần chạy sạch78 test exit0, không unhandled error. Mô phỏng không chứng minh thao tác swipe thực.

## Browser và responsive — chưa xác minh trực quan

Công cụ inventory trả apps/browsers rỗng, lỗi native pipe unavailable và **“The browser access host is unavailable”**. Do đó chưa screenshot hoặc đo layout ở375/768/1280; chưa browser mouse/keyboard, computed style, font rendering, native select hay screen reader/zoom. Không dùng HTTP200/build/RTL để thay bằng chứng browser. Người dùng đã báo FE-02 hiển thị ở VSCode integrated browser; đó không phải quan sát FE-03 của agent.

CSS đã review theo3 mục tiêu: mobile1 cột/palette3, tablet2 cột/palette4, desktop shell1184/palette7; Dialog viewport−32px/max-height100dvh−32px, action wrap, table overflow riêng. Xem [guidelines](FE03_UI_GUIDELINES.md). Trạng thái kiểm layout thực vẫn **Chưa xác minh**.

## Checklist nghiệm thu thủ công

1. Mở `http://127.0.0.1:5173/design-system`; thử375,768,1280px. Không overflow trang/cắt nhãn; bảng cuộn riêng; kiểm200%zoom và ký tự tiếng Việt.
2. Tab từ đầu để thấy skip link/focus; thử Button hover/focus/disabled/loading, label/error, native Select, Checkbox click/Space.
3. Mở Dialog bằng Enter; Tab/Shift+Tab không ra ngoài; Escape/close/footer đóng; focus về trigger. Thử viewport mobile ngắn và backdrop.
4. Bấm Thử Toast, đọc thông điệp, đóng bằng keyboard; kiểm vị trí mobile, focus/hover pause và swipe nếu cần. Toast chỉ ví dụ UI.
5. Chọn Trống/Đang tải/Có dữ liệu ở bảng; kiểm EmptyState, Spinner và Skeleton. Bật reduced motion ở OS/browser, bảo đảm thông tin vẫn hiểu được và chuyển động giảm.
6. Mở lại `/` để kiểm trang FE-02/health còn dùng được. Không sửa Backend nếu health fail; không cần health thành công cho Design System.

Các giới hạn browser nêu trên cần nghiệm thu thủ công; không đánh dấu toàn bộ responsive/accessibility đã kiểm chứng hoặc tuyên bố đạt WCAG toàn phần.
