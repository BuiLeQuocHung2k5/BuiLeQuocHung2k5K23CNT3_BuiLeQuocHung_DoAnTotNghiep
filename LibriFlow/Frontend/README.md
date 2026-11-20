# LibriFlow Frontend

Source đã Việt hóa theo **FE-RENAME-01**, xác minh 2026-11-20: 59 file đổi đường dẫn, 17 tên thư mục và 203 tên định danh nội bộ. Chức năng vẫn ở FE-05; URL, API, UI, props, CSS và query keys giữ nguyên. Baseline/sau đổi tên đều152/152 tests, lint/build đạt; có ghi nhận timeout lazy shell ở một lượt chạy đồng thời trong test report.

- [Bảng ánh xạ đầy đủ](docs/FE_RENAME_01_MAPPING.md) · [Kiểm tra trước/sau](docs/FE_RENAME_01_TEST_REPORT.md) · [Bàn giao đổi tên](docs/FE_RENAME_01_HANDOFF.md)

Code hiện nằm trong `src/ung-dung`, `src/chuc-nang`, `src/bo-cuc`, `src/thanh-phan`, `src/thu-vien`, `src/cau-hinh`, `src/kieu-dang`, `src/trang`, `src/kiem-thu`. `main.jsx` và `App.jsx` giữ tên theo quy ước. Các đường dẫn source trong tài liệu trước đã được cập nhật; số đo lịch sử vẫn thuộc ngày xác minh ghi trong từng task.

Frontend **FE-05**, xác minh 2026-11-20. React + Vite, JavaScript/JSX. Trang kỹ thuật **[/app/api-check](http://127.0.0.1:5173/app/api-check)** kiểm tra GET Health/Books/Categories khi bấm, có loading/error/empty/cancel và không cần JWT. Giữ App Shell `/app`, role preview `/app/layouts`, placeholder `/app/workspace`, health FE-02 tại `/` và **[/design-system](http://127.0.0.1:5173/design-system)** FE-03. Chưa Authentication/nghiệp vụ/FE-06. [QA-01 và giới hạn lịch sử](../docs/quality-audit/QA01_HANDOFF.md).

- [API architecture](docs/FE05_API_ARCHITECTURE.md) · [Error handling](docs/FE05_ERROR_HANDLING.md) · [Query conventions](docs/FE05_QUERY_CONVENTIONS.md)
- [Test report FE-05](docs/FE05_TEST_REPORT.md) · [Bàn giao FE-05 và blocker FE-06](docs/FE05_HANDOFF.md)

FE-05 tái dùng Axios/QueryClient FE-02; response/error gốc giữ nguyên, query public enabledfalse/retryfalse/stale30giây/gc5phút và AbortSignal. Lint/build và **152/152 tests** đạt; GET và service Axios thật200, list thực rỗng. Browser host unavailable nên UI/Network thực chưa xác minh. Không thêm dependency/sửa Backend/database. Dev5173 kiểm thử truyền origin qua process; file env development hiện thiếu origin hợp lệ. Theo hướng dẫn bên dưới để cấu hình khi khởi động lại; không dùng VITE_ cho secret.

- [Layout architecture](docs/FE04_LAYOUT_ARCHITECTURE.md) · [Routing map](docs/FE04_ROUTING_MAP.md)
- [Navigation guidelines](docs/FE04_NAVIGATION_GUIDELINES.md) · [Test report](docs/FE04_TEST_REPORT.md) · [Bàn giao FE-04](docs/FE04_HANDOFF.md)

Desktop dùng sidebar; mobile/tablet dùng drawer từ Dialog FE-03. Role preview chỉ là cấu hình hiển thị, không session/quyền. FE-04 có100test ở thời điểm bàn giao; browser UI375/768/1280 còn cần nghiệm thu thủ công theo checklist FE-04 vì browser host không khả dụng.

- [Design tokens](docs/FE03_DESIGN_TOKENS.md) · [Component catalog](docs/FE03_COMPONENT_CATALOG.md)
- [UI guidelines](docs/FE03_UI_GUIDELINES.md) · [Test report](docs/FE03_TEST_REPORT.md) · [Bàn giao FE-03](docs/FE03_HANDOFF.md)

Preview độc lập Backend, có Button/form/Badge/Alert/Card/Dialog/Table/empty/loading/Toast/icon. Font self-host, không cần CDN. Lint/build và78 test đã có; browser/responsive thực chưa xác minh do công cụ browser không khả dụng, xem checklist trong test report.

Yêu cầu: Node **24.15+ thuộc nhánh 24**, npm **11.x**; đã chạy với Node 24.20.0/npm 11.19.0. Không cần Backend/MySQL để render, test hoặc build.

Tại thư mục `Frontend`:

```powershell
npm.cmd ci
if (!(Test-Path -LiteralPath .env.local)) {
  Copy-Item -LiteralPath .env.example -Destination .env.local
}
npm.cmd run dev
```

Chỉ copy khi `.env.local` chưa tồn tại; giữ cấu hình riêng đang có. Mở `http://127.0.0.1:5173`. `VITE_API_BASE_URL` là **origin**, ví dụ giá trị local đã đối chiếu `http://127.0.0.1:3000`; client thêm `/api`. Biến `VITE_` là công khai trong browser, không chứa secret. Thiếu/sai biến vẫn render hướng dẫn, chặn request. Khởi động lại Vite sau thay đổi env.

```powershell
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
npm.cmd run preview
```

`test` bật watch; `preview` phục vụ build tại `http://127.0.0.1:4173`. `dist/` là artifact build, không commit. Dev và preview dùng strictPort; nếu cổng bận hãy dừng đúng tiến trình cũ hoặc truyền `-- --port 5174`, không tự dừng process khác.

Nút **Kiểm tra health** chỉ gọi GET `/api/health` sau khi bấm, không cần JWT, không polling/retry; Backend offline không chặn app. Không tự thêm auth/header/cookie hoặc gọi endpoint ghi.

- [Cài đặt và xử lý lỗi](docs/FE02_SETUP_GUIDE.md)
- [Kiến trúc và mở rộng feature](docs/FE02_ARCHITECTURE.md)
- [Dependency và phiên bản](docs/FE02_DEPENDENCIES.md)
- [Phụ thuộc Backend theo phương án C](docs/FE02_BACKEND_DEPENDENCIES.md)
- [Bàn giao và kiểm tra](docs/FE02_HANDOFF.md)

QA-01 đã sửa [inventory FE-01](docs/01_BACKEND_API_INVENTORY.md) sang UTF-8 và bổ sung contract40 endpoint từ source; các handoff FE-01/02/03 giữ nguyên như lịch sử. API/JWT/grants/rule phạt/copy note và các API thiếu vẫn cần task riêng trước feature tương ứng. QA-01 xác nhận cổng3000/5173 không phản hồi ở đầu lần kiểm tra; process Frontend thiếu origin thì client chặn đúng. Khởi động Backend/Vite và cấu hình origin theo hướng dẫn trước khi kiểm tra health; test SSR/Axios200 không thay nghiệm thu browser.
