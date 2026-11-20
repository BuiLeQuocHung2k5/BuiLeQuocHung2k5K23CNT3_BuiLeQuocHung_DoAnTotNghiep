# FE-04 — Application Layout Architecture

Xác minh **2026-11-20**, baseline Git `e5562a3`, working tree ban đầu sạch. Đã đọc README, bàn giao FE-02/FE-03, mapping/quyền FE-01 và QA-01; baseline Frontend **78/78 test** đạt. React19.3.1/Vite8.3.6/Router8.5.2/Tailwind4.3.5 giữ nguyên. Không thêm package hoặc thay Design System.

## Một Shell dùng chung

```text
App (providers + BrowserRouter hiện hữu)
└─ DinhTuyenUngDung
   ├─ /                       TrangNenTang / health FE-02
   ├─ /design-system          TrangHeThongGiaoDien FE-03 (lazy)
   ├─ /app/*                  DinhTuyenKhung (lazy)
   │  └─ KhungUngDung (layout route)
   │     ├─ ThanhBen hoặc DieuHuongDiDong
   │     ├─ DauTrang
   │     ├─ main#app-main-content → Outlet
   │     └─ footer
   └─ *                       TrangKhongTimThay hiện hữu
```

Shell không phụ thuộc API hoặc tài khoản. `/app` là trang giới thiệu cấu trúc, không Dashboard. Chỉ một route placeholder `/app/workspace`; không tạo hàng loạt màn nghiệp vụ rỗng. `/app/layouts` xem cấu hình hiển thị dự kiến ba vai trò, không xác thực hoặc cấp quyền.

## Trách nhiệm file

| File | Trách nhiệm |
|---|---|
| [DinhTuyenUngDung](../src/ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx) | Giữ root/Design System/global fallback, thêm lazy nhánh `/app/*` |
| [route-config](../src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js) | DUONG_DAN_UNG_DUNG, metadata3 shell pages,2 nhóm navigation chung, branding; một nguồn label/path/icon |
| [DinhTuyenKhung](../src/chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx) | Map id→page, index/child route và fallback bên trong layout |
| [KhungUngDung](../src/bo-cuc/KhungUngDung.jsx) | Layout chung, nhận navigationGroups, responsive mode, main ref/Outlet/skip, document title và focus khi route đổi |
| [ThanhBen](../src/bo-cuc/ThanhBen.jsx) | aside desktop, branding/footer; NoiDungThanhBen tái dùng trong drawer |
| [DieuHuongUngDung](../src/bo-cuc/DieuHuongUngDung.jsx) | Render config bằng Router Link + matchPath; aria-current/class active; planned item không có to là nhãn không thể bấm |
| [DauTrang](../src/bo-cuc/DauTrang.jsx) | Breadcrumb, mobile trigger và slot tài khoản trung tính; không notification/user/logout giả |
| [DieuHuongDiDong](../src/bo-cuc/DieuHuongDiDong.jsx) | State open cục bộ và close reason, tái dùng Dialog FE-03, focus restore khi dismiss hoặc focus main khi chọn route |
| [useDieuHuongDesktop](../src/bo-cuc/useDieuHuongDesktop.js) | useSyncExternalStore subscribe matchMedia1024px, cleanup listener; không global UI store |
| [role-layout-config](../src/ung-dung/dieu-huong/cau-hinh-bo-cuc-vai-tro.js) | Tên3 role + nhóm nhãn nghiệp vụ dự kiến, không URL/permission/token |
| [application pages](../src/chuc-nang/khung-ung-dung) | Overview cấu trúc, role preview, placeholder và shell NotFound; không data/API nghiệp vụ |
| [khung-ung-dung.css](../src/kieu-dang/khung-ung-dung.css) | Layout/navigation responsive trong layer components, dùng tokens FE-03 |

Giữ App/providers, HTTP client, QueryClient, env, component API FE-03 và tất cả test cũ. TrangNenTang chỉ thêm Link vào `/app`. CSS mới được import sau style FE-03, không sửa token/components/preview CSS hiện hữu.

## Responsive và state

- **≥1024px**: aside248px sticky/100dvh và vùng nội dung minmax(0,1fr); header sticky trong vùng nội dung, main max1120px. 1280px thuộc mode này.
- **<1024px**: chỉ mount DieuHuongDiDong; 375px và768px dùng drawer modal. Không giữ sidebar bị ẩn trong DOM song song với drawer. Header dùng2 hàng gọn cho breadcrumb/slot tài khoản, menu target44px.
- Drawer dùng Dialog FE-03/Radix; rộng min340px/viewport−32px, cao100dvh, nội dung cuộn. Override className phạm vi drawer, không tạo Dialog/Button thứ hai.
- Grid dùng minmax(0,1fr), body/main min-width0; padding mobile20px. Table FE-03 tiếp tục overflow vùng riêng, không đặt overflow:hidden lên main để che lỗi layout hoặc cắt focus.
- Chỉ state open và lựa chọn preview cục bộ; không Zustand/context auth/localStorage. MatchMedia là trạng thái browser, không phải store nghiệp vụ. CSS/JS cùng breakpoint1024px, phải cập nhật đồng bộ khi đổi.

Khi đổi pathname, DieuHuongDiDong có key mới nên đóng cả khi Back/Forward; không để boolean cũ mở lại trên route mới. Khi sang desktop, component drawer được tháo khỏi DOM, Radix giải phóng modal/pointer lock. Quay lại mobile bắt đầu đóng. Mode switch được test bằng MediaQueryList giả lập, chưa phải layout measurement trong browser.

## Accessibility và focus

Shell có aside/nav/header/main/footer semantic; mỗi route con chỉ chứa content, không lồng main. Skip link trỏ main có tabIndex−1. Header dùng breadcrumb nav riêng; Link nội bộ từ Router, không window.location navigation.

Link active dùng matchPath end=true để tránh index active trên mọi child và xử lý cả trailing slash `/app/`; aria-current=page và class is-active. Navigation không lấy `role` từ URL. Khi route không có, header là NotFound và không làm sáng menu không khớp.

Drawer có title/description từ Dialog, trigger aria-expanded, close button có name. Escape/close trả focus về trigger; chọn route hoặc trigger bị tháo khi resize/remount thì chặn auto-focus về node cũ và focus main. KhungUngDung cũng focus main khi pathname đổi, cập nhật document title và khôi phục title trước đó khi rời Shell. Global focus/reduced-motion FE-03 giữ nguyên.

Khi chọn công cụ rời hẳn Shell, main ref cũ không còn; close handler lấy main mới trong document, thêm tabIndex−1 nếu thiếu rồi focus. Chỉ áp cho luồng đóng do navigation/remount, không đổi focus policy của Dialog FE-03 hoặc biến main thành Tab stop thông thường.

Đây là chuẩn bị cho auth tương lai, không protected route/useAuth hoặc session giả. Menu không thay authorization. QA-01 gates JWT/dev user chỉ áp khi tích hợp auth thật; yêu cầu FE-04 hiện tại xác định scope khung độc lập nên không tự cấu hình Backend. Browser responsive/AT/zoom chưa được chứng nhận; xem [test report](FE04_TEST_REPORT.md).

Căn cứ kỹ thuật: [React Router nested routes/Outlet](https://reactrouter.com/start/declarative/routing), [React browser subscription](https://react.dev/reference/react/useSyncExternalStore), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog).
