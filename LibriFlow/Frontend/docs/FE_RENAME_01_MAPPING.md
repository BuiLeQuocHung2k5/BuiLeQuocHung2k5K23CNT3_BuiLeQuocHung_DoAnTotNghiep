# FE-RENAME-01 — Bảng ánh xạ

Ngày lập bảng trước khi đổi tên: **2026-11-20**. Phạm vi: Frontend và các tham chiếu tài liệu/công cụ liên quan; không Backend hoặc thay đổi hành vi. Baseline mới: 152/152 tests, lint/build exit0. FE04/FE05 chưa commit được giữ trong working tree; không đổi Git index.

Kế hoạch đã dry-run và parse lại toàn bộ source: **59 file đổi đường dẫn**, trong đó **57 file đổi basename** và 2 file App giữ basename nhưng đổi thư mục; **18 đường dẫn thư mục** thay đổi (17 tên thư mục Việt hóa, thư mục api chỉ đổi đường dẫn do thư mục cha). main.jsx giữ nguyên đường dẫn. Có 203 tên định danh được áp dụng tại 516 lexical bindings; cùng tên ở nhiều scope được kiểm riêng.

## Thư mục

| Tên cũ | Tên mới | Lý do | Mức độ ảnh hưởng |
| --- | --- | --- | --- |
| `Frontend/src/app` | `Frontend/src/ung-dung` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/app/navigation` | `Frontend/src/ung-dung/dieu-huong` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/app/providers` | `Frontend/src/ung-dung/bo-cung-cap` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/app/router` | `Frontend/src/ung-dung/dinh-tuyen` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/components` | `Frontend/src/thanh-phan` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/components/ui` | `Frontend/src/thanh-phan/giao-dien` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/config` | `Frontend/src/cau-hinh` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/features` | `Frontend/src/chuc-nang` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/features/application` | `Frontend/src/chuc-nang/khung-ung-dung` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/features/design-system` | `Frontend/src/chuc-nang/he-thong-giao-dien` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/features/foundation` | `Frontend/src/chuc-nang/nen-tang` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/features/public-api` | `Frontend/src/chuc-nang/api-cong-khai` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/layouts` | `Frontend/src/bo-cuc` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/lib` | `Frontend/src/thu-vien` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/lib/api` | `Frontend/src/thu-vien/api` | Giữ api; thư mục cha đổi tên | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/pages` | `Frontend/src/trang` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/styles` | `Frontend/src/kieu-dang` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |
| `Frontend/src/test` | `Frontend/src/kiem-thu` | Việt hóa trách nhiệm thư mục | Cập nhật đường dẫn import/tài liệu |

## Toàn bộ file đổi đường dẫn

| Tên cũ | Tên mới | Lý do | Mức độ ảnh hưởng |
| --- | --- | --- | --- |
| `Frontend/src/app/App.jsx` | `Frontend/src/ung-dung/App.jsx` | Giữ root App theo quy ước | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/app/App.test.jsx` | `Frontend/src/ung-dung/App.test.jsx` | Giữ root App theo quy ước | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/app/navigation/role-layout-config.js` | `Frontend/src/ung-dung/dieu-huong/cau-hinh-bo-cuc-vai-tro.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/app/providers/AppProviders.jsx` | `Frontend/src/ung-dung/bo-cung-cap/BoCungCapUngDung.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/app/router/AppRoutes.jsx` | `Frontend/src/ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/app/router/route-config.js` | `Frontend/src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Alert.jsx` | `Frontend/src/thanh-phan/giao-dien/ThongBao.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Badge.jsx` | `Frontend/src/thanh-phan/giao-dien/NhanTrangThai.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Button.jsx` | `Frontend/src/thanh-phan/giao-dien/NutBam.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Card.jsx` | `Frontend/src/thanh-phan/giao-dien/The.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Checkbox.jsx` | `Frontend/src/thanh-phan/giao-dien/OChon.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Dialog.jsx` | `Frontend/src/thanh-phan/giao-dien/HopThoai.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/EmptyState.jsx` | `Frontend/src/thanh-phan/giao-dien/TrangThaiTrong.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Field.jsx` | `Frontend/src/thanh-phan/giao-dien/TruongNhap.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Icon.jsx` | `Frontend/src/thanh-phan/giao-dien/BieuTuong.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Input.jsx` | `Frontend/src/thanh-phan/giao-dien/ONhap.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Select.jsx` | `Frontend/src/thanh-phan/giao-dien/DanhSachChon.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Skeleton.jsx` | `Frontend/src/thanh-phan/giao-dien/KhungCho.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Spinner.jsx` | `Frontend/src/thanh-phan/giao-dien/VongTai.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Table.jsx` | `Frontend/src/thanh-phan/giao-dien/Bang.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Textarea.jsx` | `Frontend/src/thanh-phan/giao-dien/VungNhap.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/Toaster.jsx` | `Frontend/src/thanh-phan/giao-dien/VungThongBao.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/components/ui/ui-components.test.jsx` | `Frontend/src/thanh-phan/giao-dien/thanh-phan-giao-dien.test.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/config/environment.js` | `Frontend/src/cau-hinh/moi-truong.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/config/environment.test.js` | `Frontend/src/cau-hinh/moi-truong.test.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/application/AppOverviewPage.jsx` | `Frontend/src/chuc-nang/khung-ung-dung/TrangTongQuanUngDung.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/application/ApplicationRoutes.jsx` | `Frontend/src/chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/application/ApplicationShell.test.jsx` | `Frontend/src/chuc-nang/khung-ung-dung/khung-ung-dung.test.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/application/LayoutPreviewPage.jsx` | `Frontend/src/chuc-nang/khung-ung-dung/TrangXemThuBoCuc.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/application/ShellNotFoundPage.jsx` | `Frontend/src/chuc-nang/khung-ung-dung/TrangKhongTimThayTrongKhung.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/application/WorkspacePlaceholderPage.jsx` | `Frontend/src/chuc-nang/khung-ung-dung/TrangNoiDungMau.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/design-system/DesignSystemPage.jsx` | `Frontend/src/chuc-nang/he-thong-giao-dien/TrangHeThongGiaoDien.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/design-system/DesignSystemPage.test.jsx` | `Frontend/src/chuc-nang/he-thong-giao-dien/TrangHeThongGiaoDien.test.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/foundation/FoundationPage.jsx` | `Frontend/src/chuc-nang/nen-tang/TrangNenTang.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/foundation/health-api.js` | `Frontend/src/chuc-nang/nen-tang/api-suc-khoe.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/public-api/ApiCheckPage.jsx` | `Frontend/src/chuc-nang/api-cong-khai/TrangKiemTraApi.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/public-api/ApiCheckPage.test.jsx` | `Frontend/src/chuc-nang/api-cong-khai/TrangKiemTraApi.test.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/public-api/public-api.js` | `Frontend/src/chuc-nang/api-cong-khai/dich-vu-cong-khai.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/public-api/public-api.test.js` | `Frontend/src/chuc-nang/api-cong-khai/dich-vu-cong-khai.test.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/public-api/public-queries.js` | `Frontend/src/chuc-nang/api-cong-khai/truy-van-cong-khai.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/features/public-api/public-queries.test.jsx` | `Frontend/src/chuc-nang/api-cong-khai/truy-van-cong-khai.test.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/layouts/AppHeader.jsx` | `Frontend/src/bo-cuc/DauTrang.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/layouts/AppNavigation.jsx` | `Frontend/src/bo-cuc/DieuHuongUngDung.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/layouts/AppShell.jsx` | `Frontend/src/bo-cuc/KhungUngDung.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/layouts/MobileNavigation.jsx` | `Frontend/src/bo-cuc/DieuHuongDiDong.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/layouts/Sidebar.jsx` | `Frontend/src/bo-cuc/ThanhBen.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/layouts/useDesktopNavigation.js` | `Frontend/src/bo-cuc/useDieuHuongDesktop.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/lib/api/http-client.js` | `Frontend/src/thu-vien/api/ket-noi-http.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/lib/api/http-client.test.js` | `Frontend/src/thu-vien/api/ket-noi-http.test.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/lib/api/normalize-error.js` | `Frontend/src/thu-vien/api/chuan-hoa-loi.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/lib/query-client.js` | `Frontend/src/thu-vien/trinh-truy-van.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/pages/NotFoundPage.jsx` | `Frontend/src/trang/TrangKhongTimThay.jsx` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/styles/app-shell.css` | `Frontend/src/kieu-dang/khung-ung-dung.css` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/styles/components.css` | `Frontend/src/kieu-dang/thanh-phan.css` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/styles/contrast.test.js` | `Frontend/src/kieu-dang/tuong-phan.test.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/styles/design-system.css` | `Frontend/src/kieu-dang/he-thong-giao-dien.css` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/styles/index.css` | `Frontend/src/kieu-dang/toan-cuc.css` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/styles/tokens.css` | `Frontend/src/kieu-dang/bien-thiet-ke.css` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |
| `Frontend/src/test/setup.js` | `Frontend/src/kiem-thu/thiet-lap.js` | Tên Việt không dấu phản ánh vai trò | Import, dynamic import, mock/test hoặc CSS/reference tương ứng |

## Toàn bộ định danh được đổi

Bảng này áp dụng cho lexical bindings nội bộ đã kiểm scope, kể cả import từ module nội bộ và các nơi tham chiếu. API import của package bên ngoài giữ nguyên. 516 bindings bao gồm cả các import nội bộ; không đồng nghĩa có 516 định danh khác nhau.

| Tên cũ | Tên mới | Lý do | Mức độ ảnh hưởng |
| --- | --- | --- | --- |
| `APP_PATH` | `DUONG_DAN_UNG_DUNG` | Tên component/hằng nội bộ | 4 bindings; cập nhật refs theo scope |
| `Alert` | `ThongBao` | Tên component/hằng nội bộ | 5 bindings; cập nhật refs theo scope |
| `ApiCheckPage` | `TrangKiemTraApi` | Tên component/hằng nội bộ | 3 bindings; cập nhật refs theo scope |
| `AppHeader` | `DauTrang` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `AppNavigation` | `DieuHuongUngDung` | Tên component/hằng nội bộ | 3 bindings; cập nhật refs theo scope |
| `AppOverviewPage` | `TrangTongQuanUngDung` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `AppProviders` | `BoCungCapUngDung` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `AppRoutes` | `DinhTuyenUngDung` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `AppShell` | `KhungUngDung` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `ApplicationRoutes` | `DinhTuyenKhung` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `Badge` | `NhanTrangThai` | Tên component/hằng nội bộ | 9 bindings; cập nhật refs theo scope |
| `Button` | `NutBam` | Tên component/hằng nội bộ | 5 bindings; cập nhật refs theo scope |
| `Card` | `The` | Tên component/hằng nội bộ | 8 bindings; cập nhật refs theo scope |
| `CardContent` | `NoiDungThe` | Tên component/hằng nội bộ | 6 bindings; cập nhật refs theo scope |
| `CardDescription` | `MoTaThe` | Tên component/hằng nội bộ | 6 bindings; cập nhật refs theo scope |
| `CardFooter` | `ChanThe` | Tên component/hằng nội bộ | 3 bindings; cập nhật refs theo scope |
| `CardHeader` | `DauThe` | Tên component/hằng nội bộ | 6 bindings; cập nhật refs theo scope |
| `CardTitle` | `TieuDeThe` | Tên component/hằng nội bộ | 6 bindings; cập nhật refs theo scope |
| `Checkbox` | `OChon` | Tên component/hằng nội bộ | 3 bindings; cập nhật refs theo scope |
| `DesignSystemPage` | `TrangHeThongGiaoDien` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `Dialog` | `HopThoai` | Tên component/hằng nội bộ | 4 bindings; cập nhật refs theo scope |
| `DialogClose` | `DongHopThoai` | Tên component/hằng nội bộ | 3 bindings; cập nhật refs theo scope |
| `EmptyState` | `TrangThaiTrong` | Tên component/hằng nội bộ | 8 bindings; cập nhật refs theo scope |
| `Example` | `ViDu` | Tên component/hằng nội bộ | 1 bindings; cập nhật refs theo scope |
| `Field` | `TruongNhap` | Tên component/hằng nội bộ | 4 bindings; cập nhật refs theo scope |
| `FoundationPage` | `TrangNenTang` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `Glyph` | `HinhBieuTuong` | Tên component/hằng nội bộ | 1 bindings; cập nhật refs theo scope |
| `Icon` | `BieuTuong` | Tên component/hằng nội bộ | 13 bindings; cập nhật refs theo scope |
| `Input` | `ONhap` | Tên component/hằng nội bộ | 3 bindings; cập nhật refs theo scope |
| `LayoutPreviewPage` | `TrangXemThuBoCuc` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `MobileNavigation` | `DieuHuongDiDong` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `NotFoundPage` | `TrangKhongTimThay` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `Page` | `Trang` | Tên component/hằng nội bộ | 1 bindings; cập nhật refs theo scope |
| `Probe` | `KiemTraDichVu` | Tên component/hằng nội bộ | 1 bindings; cập nhật refs theo scope |
| `Section` | `MucGiaoDien` | Tên component/hằng nội bộ | 1 bindings; cập nhật refs theo scope |
| `Select` | `DanhSachChon` | Tên component/hằng nội bộ | 4 bindings; cập nhật refs theo scope |
| `ShellNotFoundPage` | `TrangKhongTimThayTrongKhung` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `Sidebar` | `ThanhBen` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `SidebarContent` | `NoiDungThanhBen` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `Skeleton` | `KhungCho` | Tên component/hằng nội bộ | 4 bindings; cập nhật refs theo scope |
| `Spinner` | `VongTai` | Tên component/hằng nội bộ | 6 bindings; cập nhật refs theo scope |
| `Table` | `Bang` | Tên component/hằng nội bộ | 3 bindings; cập nhật refs theo scope |
| `Tag` | `TheHtml` | Tên component/hằng nội bộ | 1 bindings; cập nhật refs theo scope |
| `Textarea` | `VungNhap` | Tên component/hằng nội bộ | 3 bindings; cập nhật refs theo scope |
| `Toaster` | `VungThongBao` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `WorkspacePlaceholderPage` | `TrangNoiDungMau` | Tên component/hằng nội bộ | 2 bindings; cập nhật refs theo scope |
| `active` | `dangChon` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `adapter` | `boVanChuyen` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 8 bindings; cập nhật refs theo scope |
| `appBrand` | `thuongHieuUngDung` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `areas` | `cacKhuVuc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `backendCode` | `maLoiBackend` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `background` | `mauNen` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `books` | `sach` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `box` | `oChon` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `button` | `nut` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `callback` | `hamGoiLai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `cancelled` | `daHuy` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `canonical` | `thamSoChuan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `captured` | `daGhiNhan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `categories` | `danhMuc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `caught` | `loiNhanDuoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `channel` | `kenhMau` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `checkHealth` | `kiemTraSucKhoe` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 7 bindings; cập nhật refs theo scope |
| `click` | `bam` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `client` | `trinhKetNoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 8 bindings; cập nhật refs theo scope |
| `clients` | `cacTrinhKetNoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `closeReason` | `lyDoDong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `code` | `ma` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `color` | `mau` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `column` | `cot` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `config` | `cauHinh` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 12 bindings; cập nhật refs theo scope |
| `contrast` | `doTuongPhan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `controller` | `boDieuKhien` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `createQueryClient` | `taoTrinhTruyVan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `details` | `chiTiet` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `dialog` | `hopThoai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `endpoint` | `diemCuoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `envelope` | `goiPhanHoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `environment` | `moiTruong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 7 bindings; cập nhật refs theo scope |
| `error` | `loi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 11 bindings; cập nhật refs theo scope |
| `event` | `suKien` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `fieldId` | `maTruong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `first` | `mauThuNhat` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `flag` | `coPhanLoai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `foreground` | `mauChu` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `foundationNavigation` | `dieuHuongNenTang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `generatedId` | `maTuSinh` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `getPublicBooks` | `laySachCongKhai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `getPublicCategories` | `layDanhMucCongKhai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `getRolePreviewNavigation` | `layDieuHuongVaiTroXemThu` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `getSnapshot` | `layTrangThaiHienTai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `group` | `nhom` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `groups` | `cacNhom` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 5 bindings; cập nhật refs theo scope |
| `health` | `sucKhoe` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `hints` | `hienGoiY` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `hook` | `hamHook` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `httpClient` | `ketNoiHttp` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 7 bindings; cập nhật refs theo scope |
| `icons` | `cacBieuTuong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `input` | `dauVao` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `isCancelled` | `daBiHuy` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `isDesktop` | `laDesktop` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `isNetworkError` | `loiMang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `isTimeout` | `quaThoiGianCho` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `item` | `muc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 5 bindings; cập nhật refs theo scope |
| `key` | `khoa` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `lifecycle` | `vongDoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `limit` | `gioiHan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `link` | `lienKet` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `location` | `viTri` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `luminance` | `doChoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `mainRef` | `thamChieuNoiDung` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `match` | `ketQuaKhop` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `media` | `dieuKienHienThi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `mediaListeners` | `cacHamTheoDoiManHinh` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `message` | `thongBao` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `messages` | `cacThongBao` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `method` | `phuongThuc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `methods` | `cacPhuongThuc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `mode` | `cheDo` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `nav` | `vungDieuHuong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `navigation` | `dieuHuong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `navigationGroups` | `cacNhomDieuHuong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `nextMain` | `noiDungTiepTheo` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `nextOpen` | `trangThaiMoMoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `normalizeApiError` | `chuanHoaLoiApi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `onNavigate` | `xuLyChuyenTrang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `onOpenChange` | `xuLyDoiTrangThaiMo` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `open` | `dangMo` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `option` | `tuyChon` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `original` | `banGoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 5 bindings; cập nhật refs theo scope |
| `originalAdapter` | `boVanChuyenGoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `originalDescriptors` | `moTaThuocTinhGoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `page` | `trang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 6 bindings; cập nhật refs theo scope |
| `pageTitle` | `tieuDeTrang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `pages` | `cacTrang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `palette` | `bangMau` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `params` | `thamSo` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 7 bindings; cập nhật refs theo scope |
| `part` | `thanhPhan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `path` | `duongDanTep` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `pathname` | `duongDan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `payload` | `noiDungPhanHoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `pending` | `dangCho` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `pointerMethods` | `cacHamConTro` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `preview` | `banXemThu` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `previewName` | `tenBanXemThu` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `previousPath` | `duongDanTruoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `previousTitle` | `tieuDeTruoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `publicKeys` | `khoaTruyVanCongKhai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `publicListParams` | `chuanHoaThamSoDanhSach` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |
| `query` | `truyVan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `queryClient` | `trinhTruyVan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `radius` | `banKinh` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `raw` | `chuoiGoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `rawDetails` | `chiTietGoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `readEnvironment` | `docMoiTruong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `ready` | `sanSang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `renderPage` | `hienThiTrang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `renderShell` | `hienThiKhung` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `request` | `yeuCau` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `resizeTo` | `doiKichThuoc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `respond` | `traPhanHoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `response` | `phanHoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `result` | `ketQua` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 8 bindings; cập nhật refs theo scope |
| `roleLayoutPreviews` | `boCucVaiTroXemThu` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `roleName` | `tenVaiTro` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `routeKey` | `khoaTuyen` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `row` | `hang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `search` | `tuKhoa` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `second` | `mauThuHai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `sections` | `cacMuc` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `select` | `oLuaChon` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `selection` | `luaChon` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `service` | `dichVu` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `setCancelled` | `datDaHuy` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `setHints` | `datHienGoiY` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `setOpen` | `datTrangThaiMo` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `setPreviewName` | `datTenBanXemThu` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `setTableState` | `datTrangThaiBang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `setup` | `thietLapTruyVan` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `shellPages` | `cacTrangTrongKhung` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `signal` | `tinHieu` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 8 bindings; cập nhật refs theo scope |
| `skip` | `lienKetBoQua` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `space` | `khoangCach` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `spy` | `hamTheoDoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `started` | `daBatDau` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `state` | `trangThai` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `status` | `trangThaiHttp` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 5 bindings; cập nhật refs theo scope |
| `storage` | `boLuuTru` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `subscribe` | `dangKyTheoDoi` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `tableState` | `trangThaiBang` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `tone` | `sacDo` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `triggerRef` | `thamChieuNutMo` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `useDesktopNavigation` | `useDieuHuongDesktop` | Giữ tiền tố use của custom hook | 2 bindings; cập nhật refs theo scope |
| `useHealth` | `useSucKhoe` | Giữ tiền tố use của custom hook | 3 bindings; cập nhật refs theo scope |
| `usePublicBooks` | `useSachCongKhai` | Giữ tiền tố use của custom hook | 3 bindings; cập nhật refs theo scope |
| `usePublicCategories` | `useDanhMucCongKhai` | Giữ tiền tố use của custom hook | 3 bindings; cập nhật refs theo scope |
| `user` | `nguoiThaoTac` | Giữ tiền tố use của custom hook | 14 bindings; cập nhật refs theo scope |
| `valid` | `hopLe` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `validHealth` | `sucKhoeHopLe` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `value` | `giaTri` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 4 bindings; cập nhật refs theo scope |
| `values` | `cacGiaTri` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 2 bindings; cập nhật refs theo scope |
| `viewportWidth` | `chieuRongKhung` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 1 bindings; cập nhật refs theo scope |
| `width` | `chieuRong` | Hàm/biến cục bộ dễ đọc bằng tiếng Việt không dấu | 3 bindings; cập nhật refs theo scope |

## Tên và giao diện được giữ nguyên

- Các thư mục/file hệ sinh thái: src, node_modules, public, dist, docs; package.json/package-lock.json, vite.config.js/eslint.config.js, index.html, main.jsx, .env.example/.gitignore/README.md; suffix .test.js/.test.jsx. App.jsx/App.test.jsx giữ basename, chuyển vào ung-dung. api, HTTP, JSX, Desktop và các viết tắt kỹ thuật được giữ khi rõ nghĩa.
- Tên package và import/API từ React, Router, Axios, TanStack, Radix, Sonner, Lucide, RTL/Vitest/Node giữ nguyên; không dịch API thư viện. Các tên biến kỹ thuật chưa cần dịch như url, css, hex, r/g/b, i/a/b, resolve/reject, rerender/unmount/wrapper giữ nguyên để rõ thuật ngữ hoặc giao diện test.
- Giữ **mọi key object/JSON, props JSX/DOM/React, member API**, kể cả props tùy chỉnh của UI/navigation. Khi biến cục bộ đổi tên, destructuring/object shorthand được mở rộng thành alias, ví dụ `{signal: tinHieu}`; signal truyền Axios vẫn giữ key signal. Ngoại lệ duy nhất: named export và key mock tương ứng thuộc module Frontend được đổi đồng bộ theo bảng.
- Giữ nguyên route /, /design-system, /app, /app/layouts, /app/workspace, /app/api-check và wildcard/trailing slash; HTTP URL/method, query params/envelope/ID, env names, role IDs, query key values, CSS classes/tokens/selectors, nội dung UI và mô tả/assertion test.
- Tài liệu FE01..FE05 giữ tên file/nội dung lịch sử; chỉ cập nhật đường dẫn và tên source khi đó là tham chiếu kỹ thuật hiện hành. Evidence QA01 JSON giữ snapshot cũ, không sửa lịch sử đo. Hai script QA01 có đường dẫn Frontend hardcode sẽ được cập nhật tham chiếu; không chạy lại để ghi đè evidence cũ.

## Cách áp dụng và đối chiếu

Đổi tên dựa trên bảng file cụ thể và AST/scope của parser có sẵn trong node_modules; không replace chuỗi toàn repo. Sửa đúng span binding/reference, import/export, dynamic import, mock export và relative path đã resolve. Kiểm AST sau khi chuẩn hóa alias và đảo ánh xạ để so với baseline; literal/JSX text/property/operator phải giữ nguyên, trừ đường dẫn và mock export nội bộ có ánh xạ. Kiểm casing từng segment, dependency graph và cycles trước/sau, CSS/asset hashes và Git index.

Kết quả cuối: [Test report](FE_RENAME_01_TEST_REPORT.md), [Handoff](FE_RENAME_01_HANDOFF.md).
