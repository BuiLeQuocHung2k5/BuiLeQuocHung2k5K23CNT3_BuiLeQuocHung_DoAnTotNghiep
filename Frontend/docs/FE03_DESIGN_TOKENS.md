# FE-03 — Warm Wooden Library design tokens

Xác minh **2026-11-19**. Nguồn chính: [bien-thiet-ke.css](../src/kieu-dang/bien-thiet-ke.css), [CSS base](../src/kieu-dang/toan-cuc.css), [component styles](../src/kieu-dang/thanh-phan.css). Chỉ light mode. Giá trị màu chỉ khai báo tại tokens; mã HEX ở preview là nhãn minh họa, không phải màu style lặp trong component.

## Palette thương hiệu

| Token | HEX | Vai trò |
|---|---|---|
| --brand-walnut | #5D4037 | Primary và điểm tựa thị giác |
| --brand-coffee | #795548 | Focus ring |
| --brand-caramel | #B8895A | Accent trang trí, đi cùng chữ espresso |
| --brand-cream | #F7F1E8 | Background |
| --brand-ivory | #FFFDF8 | Surface, primary foreground |
| --brand-espresso | #34251F | Foreground |
| --brand-sage | #71806A | Success border, sắc xanh trầm bổ trợ |

Không dùng caramel/sage làm chữ nhỏ trên nền sáng chỉ vì đó là màu thương hiệu. Accent có foreground riêng; trạng thái có text/icon tương ứng.

## Semantic tokens

| Nhóm | Token / giá trị |
|---|---|
| Nền và chữ | background=cream; surface=ivory; surface-muted=#EEE5D8; foreground=espresso; foreground-muted=#716158 |
| Primary | primary=walnut; primary-hover=#493027; primary-foreground=ivory |
| Secondary | secondary=#EDE1D2; secondary-hover=#E2D2BF; chữ primary |
| Accent | accent=caramel; accent-foreground=espresso |
| Đường nét | border=#DED1C2 (phân nhóm/trang trí); border-strong=#9B8472 (control); focus-ring=coffee |
| Neutral | chữ #5F5148; nền #F0E9DF; border #927B68 |
| Success | chữ #3F5D39; nền #EDF3E8; border #71806A |
| Warning | chữ #79511F; nền #FCF1DB; border #AB844B |
| Danger | chữ/nút #963E33; hover #7C3028; nền #FBEEE9; border #B7675A |
| Info | chữ #365C71; nền #ECF2F6; border #698695 |

Mỗi tone có `--tone`, `--tone-background`, `--tone-border` qua lớp `ui-tone--*`. Badge, Alert và Toast dùng cùng bộ tone. Tailwind4 `@theme inline` ánh xạ các semantic color/font để dùng `bg-surface`, `text-primary`, `font-serif`... Không thêm tailwind.config.js kiểu v3.

## Typography

| Vai trò | Family / kích thước / weight / line-height |
|---|---|
| Body | Be Vietnam Pro, Inter, system-ui, sans-serif; 16px;400;1.65 |
| Label/control | Be Vietnam Pro;14px;400/500; control mobile ≤479px dùng16px |
| Caption/helper/error | 12px;400/500;1.6; có tương phản đầy đủ |
| Card title | 20px;500;1.4; mặc định h3, có thể đổi cấp heading |
| MucGiaoDien h2 | Lora/Georgia/serif; clamp24–32px;400; khoảng1.15–1.3 |
| Preview h1 | Lora; clamp40–72px;400;1.15; emphasis italic400 |
| Mã/định lượng | ui-monospace/SFMono-Regular/Consolas; không dùng cho đoạn nội dung dài |

Font được **self-host qua npm**, không gọi Google Fonts/CDN lúc chạy: @fontsource/be-vietnam-pro5.3.0 (normal400/500/600), @fontsource/lora5.3.0 (normal400/500, italic400), chỉ subset Latin/Vietnamese; CSS package dùng font-display:swap. Inter chỉ là fallback nếu máy có sẵn, không tải thêm. Nguồn/license: [Be Vietnam Pro](https://fontsource.org/fonts/be-vietnam-pro), [Lora](https://fontsource.org/fonts/lora), OFL-1.1 giữ trong package. Font lỗi vẫn có system/Georgia fallback.

## Spacing, shape, shadow và motion

- Thang4px: space1/2/3/4/5/6/8/10/12/16/20 =4/8/12/16/20/24/32/40/48/64/80px. Padding control12×16; panel/card24; mobile panel20; section48/40.
- Radius sm6px, md10px, lg16px, full999px. Control/Button md; Card/Dialog lg; Badge pill.
- Border1px; shadow-sm `0 2px 4px` espresso4%; shadow-card `0 6px 24px` espresso5%; dialog `0 24px 80px` espresso20%; overlay espresso46%.
- Focus outline3px + offset3px, không bỏ outline để trang trí. Button sm36px/md44px/lg48px; control≥44px; checkbox có vùng label≥44px; Toast close24px.
- Transition160ms cho màu/border; spinner750ms, skeleton1800ms. `prefers-reduced-motion:reduce` giảm animation/transition về0.01ms/1 iteration và không smooth scroll; Sonner cũng có reduced-motion của primitive. Không dark mode hoặc motion trang trí khác.

## Kiểm tra tương phản

[tuong-phan.test.js](../src/kieu-dang/tuong-phan.test.js) đọc token thực, resolve var rồi tính relative luminance sRGB; **16 cặp text≥4.5:1, 8 cặp boundary/focus≥3:1**, không dùng số đã làm tròn để quyết định pass. Ví dụ: foreground/background13.07; primary foreground/primary9.17; muted/surface5.81; muted/surface-muted4.74; accent foreground/accent4.73; border-strong/surface3.48; focus/background5.83. Số hiển thị làm tròn2 chữ số chỉ để đọc.

Tone text/background lần lượt neutral6.32, success6.55, warning6.23, danger6.10, info6.36. Borderneutral/info đã được làm đậm sau kiểm tra ban đầu, các cặp quan trọng đều đạt test3:1. Border chia nhóm trang trí không phải control boundary. Disabled dùng opacity và thuộc ngoại lệ inactive; không dùng kiểu disabled làm nội dung đọc thông thường.

Căn cứ: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Test token không thay thế kiểm computed style, browser rendering hoặc audit WCAG toàn ứng dụng. Browser/zoom/screen reader chưa được xác minh trong FE-03; xem [test report](FE03_TEST_REPORT.md).
