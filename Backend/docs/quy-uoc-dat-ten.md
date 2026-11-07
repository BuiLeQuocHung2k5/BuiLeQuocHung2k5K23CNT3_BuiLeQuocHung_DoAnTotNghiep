# Quy ước đặt tên Backend

Xác minh: 2026-11-07, TASK-017. Danh sách dưới ghi nhận tên trước/sau trên working tree, gồm phần dự báo chưa commit từ TASK-016. Không reset/stash hoặc làm mất thay đổi đó.

## Quy tắc

- File module dùng tiếng Việt không dấu, kebab-case, giữ hậu tố .model.js/.service.js/.controller.js/.routes.js/.test.js. Thư mục kiến trúc giữ routes/controllers/services/models/utils/config/test.
- Hàm và biến nội bộ dùng camelCase: taoMoHinhSach, layTheoMa, kiemTraPhieuMuon, thucHienGiaoDich, maSach, cacBanSao, ketNoi, duLieu, truyVan.
- Class PascalCase: LoiHttp. Hằng định nghĩa/giới hạn dùng UPPER_SNAKE_CASE: CAC_TRANG_THAI_PHIEU_MUON, SO_BAN_SAO_TOI_DA_MOI_PHIEU, PHIEN_BAN_MO_HINH_DU_BAO. Không viết hoa mọi biến chỉ vì khai báo const.
- Chú thích dùng tiếng Việt có dấu, giải thích lý do khóa/transaction/validation/giữ hợp đồng; không chú thích lại từng dòng hiển nhiên.

## Ánh xạ file đầy đủ (78 file)

Đường dẫn tương đối từ Backend/. Không giữ bản JS trùng tên cũ.

| Tên cũ | Tên mới |
| --- | --- |
| `docs/auth-api.md` | `docs/xac-thuc-api.md` |
| `docs/book-copies-api.md` | `docs/ban-sao-sach-api.md` |
| `docs/books-api.md` | `docs/sach-api.md` |
| `docs/borrows-api.md` | `docs/phieu-muon-api.md` |
| `docs/categories-api.md` | `docs/danh-muc-api.md` |
| `docs/fines-api.md` | `docs/tien-phat-api.md` |
| `docs/forecast-algorithm.md` | `docs/thuat-toan-du-bao.md` |
| `docs/forecast-data-design.md` | `docs/thiet-ke-du-lieu-du-bao.md` |
| `docs/forecasts-api.md` | `docs/du-bao-api.md` |
| `docs/integration-tests.md` | `docs/kiem-thu-tich-hop.md` |
| `docs/overdues-api.md` | `docs/qua-han-api.md` |
| `docs/statistics-api.md` | `docs/thong-ke-api.md` |
| `docs/usage-history-api.md` | `docs/lich-su-su-dung-api.md` |
| `integration/safety.mjs` | `integration/an-toan.mjs` |
| `integration/scenarios.mjs` | `integration/kich-ban.mjs` |
| `src/config/database.js` | `src/config/co-so-du-lieu.js` |
| `src/config/forecast-coverage.js` | `src/config/do-phu-du-bao.js` |
| `src/controllers/auth.controller.js` | `src/controllers/xac-thuc.controller.js` |
| `src/controllers/book-copy.controller.js` | `src/controllers/ban-sao-sach.controller.js` |
| `src/controllers/book.controller.js` | `src/controllers/sach.controller.js` |
| `src/controllers/borrow.controller.js` | `src/controllers/phieu-muon.controller.js` |
| `src/controllers/category.controller.js` | `src/controllers/danh-muc.controller.js` |
| `src/controllers/fine.controller.js` | `src/controllers/tien-phat.controller.js` |
| `src/controllers/forecast.controller.js` | `src/controllers/du-bao.controller.js` |
| `src/controllers/overdue.controller.js` | `src/controllers/qua-han.controller.js` |
| `src/controllers/statistics.controller.js` | `src/controllers/thong-ke.controller.js` |
| `src/controllers/usage-history.controller.js` | `src/controllers/lich-su-su-dung.controller.js` |
| `src/middlewares/auth.js` | `src/middlewares/xac-thuc.js` |
| `src/middlewares/error-handler.js` | `src/middlewares/xu-ly-loi.js` |
| `src/models/auth.model.js` | `src/models/xac-thuc.model.js` |
| `src/models/book-copy.model.js` | `src/models/ban-sao-sach.model.js` |
| `src/models/book.model.js` | `src/models/sach.model.js` |
| `src/models/borrow.model.js` | `src/models/phieu-muon.model.js` |
| `src/models/category.model.js` | `src/models/danh-muc.model.js` |
| `src/models/fine.model.js` | `src/models/tien-phat.model.js` |
| `src/models/forecast.model.js` | `src/models/du-bao.model.js` |
| `src/models/overdue.model.js` | `src/models/qua-han.model.js` |
| `src/models/statistics.model.js` | `src/models/thong-ke.model.js` |
| `src/models/usage-history.model.js` | `src/models/lich-su-su-dung.model.js` |
| `src/routes/auth.routes.js` | `src/routes/xac-thuc.routes.js` |
| `src/routes/book-copy.routes.js` | `src/routes/ban-sao-sach.routes.js` |
| `src/routes/book.routes.js` | `src/routes/sach.routes.js` |
| `src/routes/borrow.routes.js` | `src/routes/phieu-muon.routes.js` |
| `src/routes/category.routes.js` | `src/routes/danh-muc.routes.js` |
| `src/routes/fine.routes.js` | `src/routes/tien-phat.routes.js` |
| `src/routes/forecast.routes.js` | `src/routes/du-bao.routes.js` |
| `src/routes/overdue.routes.js` | `src/routes/qua-han.routes.js` |
| `src/routes/statistics.routes.js` | `src/routes/thong-ke.routes.js` |
| `src/routes/usage-history.routes.js` | `src/routes/lich-su-su-dung.routes.js` |
| `src/services/auth.service.js` | `src/services/xac-thuc.service.js` |
| `src/services/book-copy.service.js` | `src/services/ban-sao-sach.service.js` |
| `src/services/book.service.js` | `src/services/sach.service.js` |
| `src/services/borrow.service.js` | `src/services/phieu-muon.service.js` |
| `src/services/category.service.js` | `src/services/danh-muc.service.js` |
| `src/services/fine.service.js` | `src/services/tien-phat.service.js` |
| `src/services/forecast.service.js` | `src/services/du-bao.service.js` |
| `src/services/overdue.service.js` | `src/services/qua-han.service.js` |
| `src/services/statistics.service.js` | `src/services/thong-ke.service.js` |
| `src/services/usage-history.service.js` | `src/services/lich-su-su-dung.service.js` |
| `src/utils/analytics-validation.js` | `src/utils/kiem-tra-thong-ke.js` |
| `src/utils/auth-validation.js` | `src/utils/kiem-tra-xac-thuc.js` |
| `src/utils/book-validation.js` | `src/utils/kiem-tra-sach.js` |
| `src/utils/borrow-validation.js` | `src/utils/kiem-tra-phieu-muon.js` |
| `src/utils/catalog-db.js` | `src/utils/truy-van-danh-muc.js` |
| `src/utils/catalog-validation.js` | `src/utils/kiem-tra-danh-muc-ban-sao.js` |
| `src/utils/fine-policy.js` | `src/utils/quy-tac-tien-phat.js` |
| `src/utils/fine-validation.js` | `src/utils/kiem-tra-tien-phat.js` |
| `src/utils/forecast-algorithm.js` | `src/utils/thuat-toan-du-bao.js` |
| `src/utils/http-error.js` | `src/utils/loi-http.js` |
| `test/auth.test.js` | `test/xac-thuc.test.js` |
| `test/books.test.js` | `test/sach.test.js` |
| `test/borrows.test.js` | `test/phieu-muon.test.js` |
| `test/catalog.test.js` | `test/danh-muc-ban-sao-sach.test.js` |
| `test/category-permissions-sql.test.js` | `test/quyen-danh-muc-sql.test.js` |
| `test/fines-overdues.test.js` | `test/tien-phat-qua-han.test.js` |
| `test/forecasts.test.js` | `test/du-bao.test.js` |
| `test/integration-safety.test.js` | `test/an-toan-tich-hop.test.js` |
| `test/usage-statistics.test.js` | `test/lich-su-thong-ke.test.js` |

## Ví dụ hàm và biến

| Trước | Sau |
| --- | --- |
| createBookModel / createBookService | taoMoHinhSach / taoDichVuSach |
| createBookController / createBookRouter | taoBoDieuKhienSach / taoBoDinhTuyenSach |
| findById / create / replace / remove | layTheoMa / taoMoi / thayThe / xoa |
| validateBookBody / validateBookQuery | kiemTraNoiDungSach / kiemTraTruyVanSach |
| returnCopies / recordLogin | traCacBanSao / ghiNhanDangNhap |
| createAuthenticate / authorize | taoMiddlewareXacThuc / yeuCauQuyen |
| forecastDailyBorrows | duBaoLuotMuonTheoNgay |
| buildApp / createApp | dungUngDung / taoUngDung |
| book / copies / connection / result | sach / cacBanSao / ketNoi / ketQua |
| user_id trong biến destructure | maNguoiDung, vẫn giữ khóa user_id |

Ví dụ bảo toàn JSON: `const { user_id: maNguoiDung } = nguoiDung;` rồi `return { user_id: maNguoiDung };`. Không thay khóa dữ liệu sang maNguoiDung trong response. Các hàm controller dùng chung layTheoMa/taoMoi theo từng module; đường dẫn file xác định nghiệp vụ.

## Thành phần tiếng Anh giữ nguyên

- URL /api/books, /api/auth, /api/forecasts...; HTTP method/status, JSON keys (data, success, pagination, user_id...), mã lỗi, ENUM, tên bảng/cột SQL. Tất cả chuỗi SQL và chuỗi hợp đồng giữ nguyên.
- JWT claims sub/iat/exp/iss/aud, tên quyền book_create/forecast_view..., environment variables và giá trị model_version/target.
- API Node/Express/mysql2/bcrypt/jsonwebtoken và import từ thư viện: Router, req/res/next, query/execute/getConnection/beginTransaction/commit/rollback/release, jwt.sign/verify, Error, Buffer, process, rateLimit.handler và các khóa cấu hình của chúng. Không đổi phương thức String.replace cùng tên phương thức thayThe nội bộ.
- Khóa cấu hình factory/fixture và object truyền giữa lớp giữ giao diện cũ (database, bookModel, tokens, coverageProvider, getSecret...); biến nhận được alias tiếng Việt. Giữ thuộc tính status/code/details của LoiHttp để middleware/JSON tương thích.
- Tên testcase, fixture và chuỗi lỗi hiện hữu được giữ để so sánh trước/sau; chỉ chuỗi dispatch tên phương thức nội bộ trong test được đổi theo phương thức mới. Chỉ số toán học/vòng lặp ngắn có thể giữ i/a/b; tên nghiệp vụ dài đã được Việt hóa.
- app.js, app-factory.js là các điểm khởi tạo quen thuộc; server.js, scripts/check-db.js, integration/run.mjs và integration/setup.mjs giữ đường dẫn đang dùng trong npm scripts/CLI. utils/jwt.js giữ viết tắt tiêu chuẩn. package.json/package-lock.json/README.md giữ tên tiêu chuẩn. Các script SQL gốc/seed/migration không đổi tên hoặc nội dung.

Các export JavaScript nội bộ đã đổi theo tên mới, không giữ alias tiếng Anh thừa. Script riêng bên ngoài repo nếu import trực tiếp các tên cũ cần cập nhật theo bảng; HTTP/Postman không cần thay URL hoặc trường dữ liệu.

## Tìm trong VS Code

1. Ctrl+P, nhập sach.controller, ban-sao-sach.model hoặc phieu-muon.service để mở module.
2. Ctrl+Shift+F tìm taoMoi, layTheoMa, traCacBanSao hoặc kiemTraPhieuMuon; giới hạn thư mục src/models hay src/controllers khi tên dùng chung.
3. F12/Go to Definition trên import/hàm để đi giữa route → controller → service → model.
4. Tìm tên cũ trong bảng này khi đối chiếu hướng dẫn cũ. Khi sửa tiếp, dùng Rename Symbol thay thế định danh theo phạm vi; không thay chuỗi SQL/JSON bằng Replace All.

## Kiểm chứng và giới hạn

Trước refactor: npm.cmd test 172/172. Sau refactor: 172 testcase được giữ; kết quả cuối ghi trong docs/TASKS.md TASK-017. Kiểm tra AST 72 file bảo toàn cấu trúc xử lý/toán tử/số/chuỗi sau khi chuẩn hóa tên, shorthand và import path; không phải chứng minh hình thức mọi hành vi. Kiểm tra import/export, casing trên Linux và import vòng bằng phân tích tĩnh. Hash package/lockfile/SQL đối chiếu bản ghi trước refactor. Không chạy integration ghi khi chưa có MySQL test độc lập.
