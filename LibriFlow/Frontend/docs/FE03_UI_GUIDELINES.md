# FE-03 — UI guidelines

Xác minh source 2026-11-19. [Preview](http://127.0.0.1:5173/design-system) là công cụ kỹ thuật, không phải Dashboard hoặc màn hình nghiệp vụ. Đường `/` giữ trang FE-02/health và có Link sang preview. [Tokens](FE03_DESIGN_TOKENS.md) là nguồn màu/typography; [catalog](FE03_COMPONENT_CATALOG.md) là API sử dụng.

## Ngôn ngữ hình ảnh

- Nền cream, surface ivory, chữ espresso; primary walnut dùng cho action quan trọng. Caramel làm nhịp trang trí, sage hỗ trợ success; không làm mọi vùng thành nâu đậm.
- Lora cho tiêu đề thương hiệu/section; Be Vietnam Pro cho nội dung và control. Hạn chế uppercase có dấu ở đoạn dài, giữ dòng body thoáng. Không đưa nhiều font family mới vào từng feature.
- Thang4px và bo góc6/10/16px; border mảnh, shadow nhẹ. Mỗi nhóm chỉ một primary action nổi bật. Không glassmorphism, gradient rực rỡ hoặc hoạt cảnh nền.
- Ghost/outline cho action phụ; destructive chỉ cho thao tác có ngữ nghĩa phá hủy thật khi feature tồn tại. Preview destructive chỉ phát toast trung tính, không xóa dữ liệu.

## Component và trạng thái

Control luôn có label. Helper giải thích trước, error nói rõ điều cần sửa; không chỉ tô đỏ. Disabled giữ ngữ cảnh; loading giữ nhãn/vị trí và chặn click lặp. Badge dùng nhãn có nghĩa và tone đi kèm, không dùng chấm màu đơn độc. Alert mới quan trọng mới dùng live role; trạng thái tĩnh không spam screen reader. Toast bổ sung phản hồi, không phải nơi duy nhất thông báo lỗi cần sửa lâu dài.

Table có caption, scope header, row key ổn định, loading/empty rõ ràng. Không tự suy dữ liệu rỗng thành lỗi API hoặc số0 nghiệp vụ. EmptyState chỉ dẫn bước tiếp theo có thể làm thật; preview chỉ action kỹ thuật. Skeleton trang trí trong status wrapper, không vô tình đọc nhiều nhãn “đang tải”.

## Responsive

Nguồn: [he-thong-giao-dien.css](../src/kieu-dang/he-thong-giao-dien.css), [thanh-phan.css](../src/kieu-dang/thanh-phan.css). Layout không sidebar; shell max1184px, grid minmax(0,1fr), action wrap, content có min-width0.

| Target | Bố cục thiết kế từ CSS | Trạng thái kiểm chứng |
|---|---|---|
| 375px mobile | Padding20px, hero/2-column grid về1 cột, palette3 cột; control16px; Dialog rộng viewport−32px, footer stack khi≤479px; table cuộn vùng riêng | Đã review source, chưa đo/quan sát browser |
| 768px tablet | Grid2 cột, palette4 cột ở≤900px, nav/action wrap; section note phụ ẩn | Đã review source, chưa đo/quan sát browser |
| 1280px desktop | Shell max1184px gồm padding32, palette7 cột, hero2 phần và panels2 cột | Đã review source, chưa đo/quan sát browser |

Không gọi source review là responsive test thực. Khi có browser: kiểm mỗi width không page overflow/cắt chữ; dialog mở trong viewport ngắn; table có thể keyboard-scroll mà trang không kéo ngang; focus/Toast không bị cắt. Thử zoom200% và text spacing trước dùng trong UI nghiệp vụ.

## Accessibility cơ bản

- Semantic main/nav/section, h1 duy nhất và h2 theo section; TieuDeThe cho phép đổi heading. Preview có skip link, section anchors và table caption.
- :focus-visible outline3px offset3px; không xóa mà không thay thế. Button md44px, small36px; nội dung vẫn đọc được khi dùng keyboard. Kiểm token text4.5:1, boundary/focus3:1; decorative border và inactive state có phạm vi riêng.
- Input/Textarea/Select nối label, required, helper/error qua aria-describedby; error có aria-invalid. Checkbox native hỗ trợ Space. Không giả lập native control bằng div.
- Dialog dùng Radix modal: Escape, trap focus, close control có name và restore trigger; title bắt buộc, description nếu có tự liên kết. Trigger phải nhận ref. Chỉ ngăn Escape trong trường hợp feature có lý do rõ, không biến Dialog thành vùng không thoát được.
- Icon trang trí aria-hidden; icon chứa thông tin cần label. Spinner/status có thông điệp text, không phụ thuộc animation. Toast có vùng thông báo và nút đóng tiếng Việt.
- Font self-host + swap/fallback; không cần mạng ngoài khi app đã được phục vụ. Reduced motion trong CSS và Sonner. Không cài E2E/screen reader tooling chỉ để tuyên bố đạt chuẩn.

Đây là nền tảng hướng WCAG2.2 AA, **chưa chứng nhận toàn bộ tiêu chí**. Browser/AT thực, swipe Toast, native select/checkbox khác OS, zoom và responsive visual cần kiểm thủ công theo [test report](FE03_TEST_REPORT.md).

## Mở rộng ở task sau

Import component riêng theo file, không import cả icon library. Thêm variant vào token/component và test tương ứng; không dùng HEX mới trực tiếp ở feature. Giữ UI thuần; API/hook/grants/cache thuộc feature và phải có contract đã xác minh. Không tự gắn tone với ENUM Backend hoặc đoán mapping nghiệp vụ. FE-04/layout và mọi màn hình nghiệp vụ cần nhiệm vụ riêng sau nghiệm thu FE-03.
