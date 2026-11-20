# FE-03 — Component catalog

Xác minh 2026-11-19. Source tại [thanh-phan/giao-dien](../src/thanh-phan/giao-dien); CSS tại [thanh-phan.css](../src/kieu-dang/thanh-phan.css). **15 nhóm public**, TruongNhap là wrapper nội bộ dùng lại cho form. JS/JSX, native attributes và ref của React19 được truyền xuống phần tử khi phù hợp. Không component nào đọc JWT/store, import Axios, tự fetch hoặc chứa dữ liệu nghiệp vụ.

## API

| Component/file | Props, variants và states |
|---|---|
| [NutBam](../src/thanh-phan/giao-dien/NutBam.jsx) | variant primary(default)/secondary/outline/ghost/destructive; size sm/md(default)/lg; loading, disabled, icon ReactNode, children, className, type(default button), HTML button attributes/ref. Loading khóa click + aria-busy + VongTai nhưng giữ label |
| [ONhap](../src/thanh-phan/giao-dien/ONhap.jsx) | label,id(useId nếu thiếu),helperText,error:string,required,disabled,placeholder,value/defaultValue,onChange,type,className, native input attrs/ref. Class trên control. Error nối aria-describedby và aria-invalid, không thay thông điệp bằng màu |
| [VungNhap](../src/thanh-phan/giao-dien/VungNhap.jsx) | Như ONhap; rows(default4), resize dọc; không có backend submit |
| [DanhSachChon](../src/thanh-phan/giao-dien/DanhSachChon.jsx) | Như TruongNhap; options:[{value,label,disabled?}], placeholder, controlled value/onChange hoặc defaultValue; native select. Placeholder value rỗng disabled; default chưa chọn. Không trộn value và defaultValue |
| [OChon](../src/thanh-phan/giao-dien/OChon.jsx) | label,id,checked/defaultChecked,onChange,disabled,required,name,ref,className(wrapper); native checkbox + label, click/Space. Chưa hỗ trợ indeterminate |
| [NhanTrangThai](../src/thanh-phan/giao-dien/NhanTrangThai.jsx) | variant neutral(default)/success/warning/danger/info; children văn bản, className, span attrs. Không ánh xạ trạng thái sách/phiếu; không interactive |
| [The](../src/thanh-phan/giao-dien/The.jsx) | The,DauThe,TieuDeThe,MoTaThe,NoiDungThe,ChanThe; children,className,native attrs. TieuDeThe as mặc định h3, caller chọn heading theo ngữ cảnh |
| [ThongBao](../src/thanh-phan/giao-dien/ThongBao.jsx) | variant info(default)/success/warning/error; title,children,className,role(default note). Dùng role=status cho update nhẹ, alert cho lỗi mới quan trọng; không tự live-announce toàn preview. BieuTuong phân biệt tone |
| [HopThoai](../src/thanh-phan/giao-dien/HopThoai.jsx) | trigger (một element nhận ref),title bắt buộc,description,children,footer; open/onOpenChange hoặc defaultOpen; className và Radix content props (onEscapeKeyDown,onOpenAutoFocus...). DongHopThoai bọc một action. Primitive modal mặc định có focus trap, Escape, portal/overlay, restore trigger; không đặt modal=false |
| [Bang](../src/thanh-phan/giao-dien/Bang.jsx) | columns:[{key,header,render?(value,row)}],rows(default[]),rowKey(default'id', phải unique),caption,loading,emptyTitle,emptyDescription,className(wrapper), table attrs. Header/caption semantic, region cuộn ngang có tabIndex0; loading thay rows bằng KhungCho + status ngoài aria-busy table. Không sort/page/API |
| [KhungCho](../src/thanh-phan/giao-dien/KhungCho.jsx) | variant text(default)/card/table; className,div attrs; aria-hidden. Container/caller phải cung cấp status nếu biểu thị tải, không dùng nhiều live region cho từng khối |
| [TrangThaiTrong](../src/thanh-phan/giao-dien/TrangThaiTrong.jsx) | title,description,icon ReactNode(optional/decorative),action ReactNode(optional),className,div attrs; copy trung tính, caller xử lý action |
| [VongTai](../src/thanh-phan/giao-dien/VongTai.jsx) | label(default'Đang tải'),className,span attrs; role=status + text sr-only. Không dùng aria-label trống cho spinner độc lập |
| [VungThongBao](../src/thanh-phan/giao-dien/VungThongBao.jsx) / toast | Một VungThongBao tại BoCungCapUngDung; dùng toast()/toast.success/info/warning/error từ sonner; duration mặc định5s, closeButton, tối đa3, góc dưới phải, theme light. Aria tiếng Việt, token tone. Toast không tự gọi API |
| [BieuTuong](../src/thanh-phan/giao-dien/BieuTuong.jsx) | icon component Lucide import theo tên, size(default18),label(optional),className,SVG attrs. Mặc định decorative aria-hidden; label tạo role=img/name. Nút chỉ icon cần aria-label trên NutBam |

Giữ props đơn giản; không thêm abstraction cho action/phân quyền chưa tồn tại. Label prop có thể bỏ nếu đã cung cấp accessible name bằng aria-label/aria-labelledby trong trường hợp có lý do, không để control vô danh. Không dùng `error=true` thay cho thông điệp cụ thể.

Styles component/preview nằm trong `@layer components` để Tailwind utilities qua className có thể override spacing/width khi cần (ví dụ KhungCho `w-2/3`). Toast overrides giữ ngoài layer để không bị CSS unlayered của Sonner ghi đè token. Global focus/reduced-motion vẫn giữ rõ ràng.

## Ví dụ

```jsx
import NutBam from '../thanh-phan/giao-dien/NutBam.jsx'
import ONhap from '../thanh-phan/giao-dien/ONhap.jsx'

<NutBam variant="outline" size="md" loading={pending} onClick={onTry}>
  Kiểm tra ví dụ
</NutBam>
<ONhap label="Nội dung mẫu" required helperText="Không gửi dữ liệu."
  error={message} value={value} onChange={onChange} />
```

```jsx
import HopThoai, { DongHopThoai } from '../thanh-phan/giao-dien/HopThoai.jsx'

<HopThoai trigger={<NutBam>Mở ví dụ</NutBam>} title="Hộp thoại mẫu"
  description="Một ví dụ UI độc lập."
  footer={<DongHopThoai><NutBam variant="outline">Đóng</NutBam></DongHopThoai>}>
  <ONhap label="Ghi chú mẫu" />
</HopThoai>
```

```jsx
<Bang caption="Các mục minh họa" columns={[
  { key: 'label', header: 'Nhãn' },
]} rows={[{ id: 'sample-a', label: 'Mẫu A' }]} />
```

Ví dụ runnable đầy đủ và dữ liệu trung tính tại [TrangHeThongGiaoDien](../src/chuc-nang/he-thong-giao-dien/TrangHeThongGiaoDien.jsx), route `/design-system`. BieuTuong minh họa chỉ import các tên dùng thực. [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) quản lý hành vi focus; [Sonner](https://sonner.emilkowal.ski/styling) cung cấp Toast. Không dùng shadcn generator hoặc package trùng chức năng.

## Giới hạn

Chưa component async-select/combobox, DatePicker, paginated table, tooltip, Form/RHF/Zod, route guard hay business-specific badge. Không toast error tự động từ HTTP interceptor. Không tự gửi nội dung form/HopThoai. Component có thể dùng ở feature tương lai nhưng logic và policy phải nằm ở feature, không đưa vào UI primitive.
