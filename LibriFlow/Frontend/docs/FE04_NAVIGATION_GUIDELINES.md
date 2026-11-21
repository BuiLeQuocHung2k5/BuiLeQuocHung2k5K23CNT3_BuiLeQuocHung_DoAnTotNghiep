# FE-04 — Navigation Guidelines

Cập nhật **2026-11-21 · FE-DESKTOP-01**: phần mô tả FE-04 bên dưới là snapshot lịch sử. Shell hiện luôn dùng Sidebar desktop, đã bỏ drawer/hamburger và hook matchMedia. Xem [bàn giao desktop](FE_DESKTOP_01_HANDOFF.md) cho trạng thái hiện tại; Auth/Authorization và trang sách đã được bổ sung ở FE-06/07/08.

Xác minh **2026-11-20**. Source [DieuHuongUngDung](../src/bo-cuc/DieuHuongUngDung.jsx), [ThanhBen](../src/bo-cuc/ThanhBen.jsx), DieuHuongDiDong (đã loại bỏ ở FE-DESKTOP-01), [route config](../src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js).

## Cấu hình

Group có id,label,items; item có id,label,icon,to,end. Icon là Lucide component import theo tên, không registry hoặc asset ngoài. `to` chỉ được thêm khi route thật tồn tại; planned item không có to, có nhãn Chưa triển khai và không vào Tab order. Không fake href `#`, không nút vô hiệu hóa giả làm tính năng có sẵn.

Thêm route Shell tại `cacTrangTrongKhung` rồi map id→component trong DinhTuyenKhung; nav label/header path lấy từ cùng config. Tools group là các route kỹ thuật đã có. `role-layout-config` chỉ chuẩn bị nhóm planned để demo riêng, không cấp quyền hoặc đọc principal.

## Active, hover, focus

- Link + Router matchPath(end=true mặc định) dùng cùng khái niệm matching của header; `/app` không active trên `/app/workspace`, trailing slash vẫn active đúng. Unknown child không chọn nhầm ancestor.
- Active có aria-current=page, màu secondary/primary, font-weight và vạch nhỏ; không chỉ màu. Hover nền background, focus outline FE-03 rõ. Không thay token để đạt style riêng.
- Breadcrumb có nav label khác menu chính. Slot tài khoản chỉ ghi **Tài khoản chưa tích hợp**, không avatar, role badge, notification counter hoặc logout giả.
- Menu state là React state cục bộ. Không localStorage, query role, global store, JWT hoặc permission filtering trong FE-04.

## Mobile/tablet drawer

<1024px dùng Dialog FE-03/Radix modal, ≥1024px dùng aside desktop; một nguồn NoiDungThanhBen/DieuHuongUngDung cho cả hai. Không tự viết focus trap hoặc nhân bản bộ Button/Dialog.

Nút Menu có aria-label/aria-expanded; Dialog có title/description và close button dùng API hiện hữu. Escape/close/backdrop theo Radix trả focus về trigger; click route đóng menu và focus main. Chuyển route từ browser history remount mobile component theo pathname để không giữ drawer cũ. Resize lên desktop unmount drawer/lock, focus main thay vì node ẩn; quay xuống mobile bắt đầu đóng.

Click Ctrl/Meta/Shift/Alt không được xử lý như chọn route hiện tại để đóng drawer; giữ hành vi link native. Không đưa focus vào link planned. Body có một main landmark, skip link đến main có tabIndex−1; page con không tạo main lồng nhau.

## Tái sử dụng và mở rộng

KhungUngDung nhận navigationGroups; cấu hình hiển thị tương lai có thể thay mà không tạo3 shell. Sau auth task riêng, menu có thể dựa trên quyền thật nhưng **ẩn menu không là authorization**. Không dùng role-name bypass hoặc URL role để mở quyền; detail/data scope vẫn phải được bảo vệ ở Backend.

Không thêm sidebar collapse/persistence chỉ vì có thể. Tablet dùng cùng drawer vì nội dung và labels rõ hơn một cột icon nhỏ không có ngữ cảnh. Nếu đổi breakpoint, cập nhật cả `useDieuHuongDesktop` và CSS1024px, kèm resize tests.

Chỉ thêm UI patterns khi có nhu cầu thực. Với table hoặc nội dung rộng, main/body min-width0 và wrapper component chịu overflow; không giấu tràn bằng overflow:hidden toàn trang. Global prefers-reduced-motion, light theme và font FE-03 giữ nguyên.

## Checklist review một mục mới

1. Route/path/id đã khai báo một nơi, không dẫn đến trang chưa được giao làm.
2. Label/icon và status trung thực; planned có nhãn rõ, không to hoặc fake data.
3. Direct URL, active/aria-current, unknown path và Back/Forward hoạt động.
4. Menu375/768 mở/đóng/Escape/route-selection và resize1024 không giữ lock/focus cũ.
5. Keyboard, skip/focus, nội dung không bị header/sidebar che; xem checklist browser FE-03+FE-04 trong [test report](FE04_TEST_REPORT.md).
