# LibriFlow Frontend

Frontend **FE-03**, xác minh 2026-11-19. React + Vite, JavaScript/JSX. Warm Wooden Library Design System tại **[/design-system](http://127.0.0.1:5173/design-system)**; `/` giữ trang kỹ thuật/health FE-02 và fallback vẫn hoạt động. Chưa có màn hình nghiệp vụ/FE-04.

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

FE-01 được giữ nguyên. Inventory cũ có lỗi mã hóa và thiếu nội dung phần contract; FE-02 chỉ dựa [guide đọc được](docs/05_FRONTEND_INTEGRATION_GUIDE.md) và [health source](../Backend/src/app-factory.js#L51), không suy contract cho các service nghiệp vụ.
