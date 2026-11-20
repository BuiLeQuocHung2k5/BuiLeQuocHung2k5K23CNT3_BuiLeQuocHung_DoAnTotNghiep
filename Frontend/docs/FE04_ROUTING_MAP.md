# FE-04 — Routing Map

Xác minh **2026-11-20**. Source: [root router](../src/ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx), [config](../src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js), [nested routes](../src/chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx). BrowserRouter hiện hữu giữ nguyên, không redirect mặc định hoặc route guard.

| Route | Component | Layout | Trạng thái | Vai trò dự kiến / auth tương lai |
|---|---|---|---|---|
| `/` | TrangNenTang | Trang kỹ thuật FE-02 độc lập | Implemented, health thủ công | Public kỹ thuật; không JWT; giữ route/test cũ |
| `/design-system` | TrangHeThongGiaoDien (lazy) | Preview FE-03 độc lập | Implemented UI playground | Public kỹ thuật, không session/role |
| `/app` hoặc `/app/` | TrangTongQuanUngDung | KhungUngDung + Outlet | Implemented trang giới thiệu bố cục | Chung, không dashboard/auth; index không redirect |
| `/app/layouts` | TrangXemThuBoCuc | KhungUngDung + Outlet | Implemented công cụ preview config | Admin/librarian/reader chỉ để xem bố cục; không grant |
| `/app/workspace` | TrangNoiDungMau | KhungUngDung + Outlet | Placeholder kỹ thuật duy nhất | Chưa gán nghiệp vụ/role/quyền, không data hoặc form |
| `/app/*` không khớp3 page trên | TrangKhongTimThayTrongKhung | KhungUngDung + Outlet | Implemented fallback nội bộ | Không đổi trạng thái truy cập; Link về `/app` |
| Các path khác | TrangKhongTimThay hiện hữu | Fallback độc lập | Implemented, giữ regression | Link về `/`; không auth redirect |

Root `/app/*` chỉ là điểm mount lazy branch; child route không tạo API. HTTP dev/preview có SPA fallback nên unknown path có thể trả HTTP200/index.html, React mới render NotFound; không tuyên bố đó là server404.

## Metadata và cấu hình điều hướng

`cacTrangTrongKhung` giữ id,path tương đối,to,title,icon,status. DinhTuyenKhung chỉ map id sang component. Header và menu dùng cùng metadata, không sao chép labels/paths ở nhiều ThanhBen. KhungUngDung nhận navigationGroups để tái dùng về sau; hiện dùng dieuHuongNenTang chung.

Menu thật chỉ có3 route Shell và2 công cụ `/`, `/design-system`. Mọi mục đều đến UI đã có hoặc placeholder có nhãn rõ. Trang preview role dùng cấu hình planned **không có to**, không tạo `/admin`, `/librarian`, `/reader`, `/books`, `/borrows`, `/users` hoặc login giả.

## Chuẩn bị theo vai trò, chưa authorization

Tên role đối chiếu [FE-01 matrix](02_AUTHORIZATION_MATRIX.md): **admin, librarian, reader**. Ý tưởng hiển thị tại [role-layout-config](../src/ung-dung/dieu-huong/cau-hinh-bo-cuc-vai-tro.js):

| Bản xem trước | Nhóm nhãn dự kiến | Trạng thái |
|---|---|---|
| Admin | Sách,danh mục,bản sao,phiếu,phạt,người dùng,thống kê | Planned labels, không clickable |
| Librarian | Sách,bản sao,phiếu,phạt,thống kê | Planned labels, không clickable |
| Reader | Tra cứu,phiếu cá nhân,lịch sử cá nhân,hồ sơ | Planned labels, không clickable |

Không chọn role mặc định, không tạo tài khoản mặc định. Select ở `/app/layouts` chỉ state cục bộ; rời page thì reset. Query `?role=admin` bị bỏ qua về mặt preview/quyền; URL không tạo session, không persist lựa chọn. Một nhãn planned không chứng minh đã có API/chức năng hoặc user đang có grant, ví dụ user CRUD/profile vẫn thiếu theo QA-01.

Khi triển khai auth/authorization ở nhiệm vụ riêng FE-06/FE-07: phải có principal/quyền thật từ Backend, guard và scope tài nguyên riêng; thay menu theo policy không thay kiểm quyền server. FE-04 không có logic chờ token, redirect login, đọc storage hoặc refresh. [QA-01 risk register](../../docs/quality-audit/QA01_RISK_REGISTER.md) vẫn áp cho feature tương ứng.

## Deep links và tích hợp sau này

Giữ route công cụ hiện tại trong phát triển. Hosting SPA về sau cần rewrite index.html cho deep links; dev/preview local không phải cấu hình production. Thêm route mới phải có metadata, page có nội dung thực hoặc placeholder được giao cụ thể, test direct-path/active/fallback/keyboard; không scaffold toàn bộ kế hoạch qua các trang trống.
