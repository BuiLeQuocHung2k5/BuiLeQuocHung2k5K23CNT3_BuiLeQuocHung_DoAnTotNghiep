# FE-07 — Test report

Xác minh **2026-11-21**. Hoàn tất cơ chế phân quyền trong phạm vi trang hiện hữu; **chưa kiểm chứng phân quyền Frontend end-to-end với Backend thật**.

Baseline HEAD 8c224e8; index đã chứa thay đổi BE-AUTH-SETUP-01/FE-06 do người dùng stage trước task. Lưu SHA-256 252 file và hash index để giữ nguyên trạng thái đó; không stage/unstage/reset/commit/push.

## Đối chiếu source và phạm vi áp dụng

Nguồn: [Authorization Matrix](02_AUTHORIZATION_MATRIX.md), [FE06 handoff](FE06_HANDOFF.md), [integration guide](05_FRONTEND_INTEGRATION_GUIDE.md), tài liệu [BE-AUTH-PREP](../../docs/backend-auth-prep/BE_AUTH_PREP_01_API_CONTRACT.md)/[BE-AUTH-SETUP](../../docs/backend-auth-setup/BE_AUTH_SETUP_01_HANDOFF.md), [middleware](../../Backend/src/middlewares/xac-thuc.js), [principal model](../../Backend/src/models/xac-thuc.model.js), [seed](../../Backend/sql/seeds/initial-permissions.sql).

- Ba role: admin, librarian, reader. User từ me có roles/permissions là mảng chuỗi; grant thật lấy từ principal, không suy ra từ tên role hoặc token.
- Seed có 12 tên permission; catalog ở helper chỉ xác nhận tên hỗ trợ, không gán grant. category_manage có trong seed không có nghĩa mọi database/account đã được cấp quyền.
- Frontend hiện chỉ có /app dùng chung và công cụ/demo. **Không có trang nghiệp vụ hoặc nút gọi API cần permission riêng để gán policy mới trong runtime.** Không gán report_view cho demo hoặc tạo menu CRUD giả.
- Backend có API sách/danh mục/bản sao/mượn/trả/phạt/thống kê/dự báo; Frontend chưa có các màn hình đó. user_manage có trong seed nhưng không có API user CRUD hiện hữu. Không tạo chức năng mới để kiểm thử FE-07.
- Route/menu có metadata yeuCauTruyCap sẽ dùng cùng helper. Kiểm thử ràng buộc quyền dùng route/menu fixture chỉ trong tests, không thêm route nghiệp vụ vào ứng dụng.

## Kết quả

| Kiểm tra | Kết quả |
| --- | --- |
| Baseline Frontend | 182/182 tại 11 file; lint/build đạt. |
| Sau FE-07 | **232/232 tại 13 file**, 0 fail/skip; ESLint và production build đạt. |
| Tests mới FE-07 | **50/50 trong full suite**: 33 helper/menu tests và 17 guard/UI/API-mock tests; targeted trước case cuối 49/49. |
| FE-06 regression | Giữ nguyên 182 test cũ, gồm 30 Auth tests: login/me, memory/reload, expiry/401, 403, race/cache/logout. |
| Syntax/import/export/casing/cycles | 65 JS/JSX, 172 cạnh import tương đối, 214 local bindings; không lỗi/vòng. |
| Production HTTP smoke | 9 SPA shells và 31 assets trả 200; preview loopback cổng OS cấp đã đóng trong finally. Không coi HTTP 200 là React guard hoặc browser UI pass. |
| Bảo toàn | 108/108 file Backend và 164 file được bảo vệ khớp SHA-256 baseline; HEAD/index giữ nguyên. Bao gồm docs auth/FE cũ, session/provider/login/service/hook/Auth tests/Header/client, package/lock và env/example. |
| Database | Không truy cập, tạo account, seed, thay schema hoặc chạy runner Backend/MySQL. |
| Diff/tài liệu cuối | 6 file hiện hữu sửa và 6 file mới đúng phạm vi, không xóa. 41 local links tại 4 docs, UTF-8/whitespace/diff-check đạt; không có marker route/token mock FE07 trong bundle production. |

Lệnh từ Frontend:

~~~powershell
npx.cmd vitest run src/chuc-nang/xac-thuc/kiem-tra-quyen.test.js src/chuc-nang/xac-thuc/phan-quyen.test.jsx
npm.cmd run test:run
npm.cmd run lint
npm.cmd run build
~~~

Lượt đầu targeted 47/49 và regression 229/231: hai lỗi trong test harness (menu fixture thiếu icon và chưa chờ lazy page sau navigation). Đã bổ sung icon và chờ heading trang đích, giữ nguyên assertions bảo mật; sau sửa targeted 49/49 và regression 231/231. Rà soát cuối bổ sung case mảng permission thưa để ngăn every bỏ qua phần tử trống; regression cuối 232/232. Không sửa runtime để ép các test này đạt hoặc tắt lint rule.

## Các tình huống đã kiểm bằng mock

| Tình huống | Kết quả |
| --- | --- |
| Admin/librarian/reader có grant rõ ràng | Được vào test route tương ứng book_delete/report_view/book_view. |
| Admin thiếu grant | Bị từ chối, kể cả book_delete/category_manage; không admin bypass. |
| Custom grant và multi-role | Reader có report_view rõ ràng được phép; role allowlist dùng OR, permissions dùng ALL, cả hai điều kiện kết hợp AND. |
| Principal/metadata thiếu hoặc sai | Default deny với quyền được yêu cầu; role lạ, arrays thiếu/sai, inactive/locked, quyền lạ, config trống/sai đều bị chặn. |
| Trang dùng chung | User đăng nhập không có assignment vẫn vào được trang không yêu cầu permission. |
| Direct URL và query role=admin | Không vượt guard. Khi thiếu quyền, nội dung bảo vệ không mount; không chạy effect/load của nội dung đó. |
| 403 và đường về | Đúng nội dung tiếng Việt, title 403, nút về /app; không vòng lặp. /403 yêu cầu login khi vô danh. |
| Ngoại lệ demo | Yêu cầu quyền explicit ưu tiên hơn flag demo; anonymous vẫn về login khi route fixture có yêu cầu. |
| Sidebar/drawer | Cùng helper lọc permission-bound fixture, bỏ nhóm rỗng; các menu thật dùng chung đúng cho ba role. |
| Backend HTTP 403 | Adapter mock trả 403 cho public probe hiện hữu: UI báo lỗi an toàn, giữ tên/phiên; logout sau đó vẫn gọi API và xóa phiên. |
| FE-06 | Bộ 30 Auth tests không sửa và vẫn đạt; không thay session policy hoặc xử lý 401/403. |

Mock user/token chỉ trong tests. Test route /chi-trong-test và menu “Báo cáo kiểm thử” không có trong runtime. Không có server thật, grant DB hoặc thao tác ghi trong các test này.

## Browser/E2E và giới hạn

Browser inventory tiếp tục báo browser access host/native pipe unavailable. Chưa kiểm trực quan trang 403, responsive 375/768/1280, zoom, bàn phím/AT hoặc Network browser thật. Trang 403 dùng Card/Button/Icon FE-03 và bố cục responsive hiện có; không coi jsdom là bằng chứng trực quan.

TCP probe cổng Backend mặc định 3000 không mở; chưa có Backend dev/JWT/account hợp lệ được bàn giao. Không dùng kết quả MySQL Backend trước đây thay cho FE-07 E2E và không tạo user ở main để thử.

UI dùng snapshot me của phiên FE-06, không tự refresh/poll quyền. Backend tiếp tục đọc quyền ở mỗi request; grant đổi sau login có thể chỉ được UI nhận ở lần tải principal tiếp theo. Resource ownership/scope own vẫn do Backend quyết định.

Chưa có protected business page/action để kiểm grant thật trong runtime. Frontend guard/menu hỗ trợ điều kiện khi được khai báo, không thay kiểm tra Backend. [Handoff](FE07_HANDOFF.md) ghi route/menu hiện hữu và điều kiện FE-08.
