# FE-05 — Handoff

Xác minh **2026-11-20**. Code/tests/docs hoàn tất trong phạm vi được giao, chờ người dùng nghiệm thu. Browser UI/Network thực **Chưa xác minh** vì host không khả dụng; không đánh dấu mọi tiêu chí trực quan đã đạt. Không triển khai FE-06.

## Kết quả

Trang kỹ thuật **`/app/api-check`** trong KhungUngDung/sidebar/breadcrumb FE04, lazy load, tái dùng Button/Card/Alert/Spinner/EmptyState/Badge FE03. Ba GET công khai đã xác minh từ source và runtime: Health, Books, Categories. Chỉ click mới kiểm tra; không polling hoặc protected/write request. Books/Categories giữ envelope phân trang và chỉ hiện số lượng; danh sách thực hiện đang rỗng.

Axios FE02 giữ nguyên cấu hình/hành vi: status/headers/data/AxiosError gốc,10giây,không credentials/auth/refresh/redirect/retry. Tạo error utility UI an toàn độc lập; hooks có stable canonical keys, enabledfalse,retryfalse,stale30giây,gc5phút và AbortSignal xuyên suốt. Không thêm dependency hoặc store.

## File tạo và sửa trong FE-05

Tạo7 source/test files:

- `src/thu-vien/api/chuan-hoa-loi.js`
- `src/chuc-nang/api-cong-khai/dich-vu-cong-khai.js`, `truy-van-cong-khai.js`, `TrangKiemTraApi.jsx`
- `src/chuc-nang/api-cong-khai/dich-vu-cong-khai.test.js`, `truy-van-cong-khai.test.jsx`, `TrangKiemTraApi.test.jsx`

Tạo5docs: [architecture](FE05_API_ARCHITECTURE.md), [errors](FE05_ERROR_HANDLING.md), [queries](FE05_QUERY_CONVENTIONS.md), [test report](FE05_TEST_REPORT.md), handoff này.

Sửa2 source FE04: `src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js` thêm metadata/nav route; `src/chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx` ánh xạ lazy page. Sửa `Frontend/README.md` và `docs/{PROJECT_CONTEXT,DECISIONS,TASKS,HANDOFF}.md`. Working tree có FE04 chưa commit từ trước; không nhận toàn bộ git diff là thay đổi FE05. Snapshot204file trước FE05 được đối chiếu SHA256, giữ mọi file khác và test cũ.

## Verification

Baseline100/100; cuối **152/152 tại10file**,52mới. Lint/build exit0;9dev+9production route shells và31production assets đạt. GET Backend thật và service Axios thật qua Node/Vite SSR đều200. JWT kiểm cấu hình booleanfalse. Chi tiết các lượt lỗi/sửa/giới hạn ở [test report](FE05_TEST_REPORT.md).

Backend server và preview production dùng kiểm tra tạm được dừng sau smoke; dev5173 giữ để người dùng xem frontend theo yêu cầu chạy thử trước đó, origin chỉ đặt trong process. Khi Backend dừng, bấm probe sẽ báo network error đúng thiết kế. Muốn kiểm API thật chạy `npm.cmd --prefix Backend start` từ gốc repo. Không tự ghi `.env`; khi restart dev cần cấu hình origin theo README. Build không có origin vẫn render cảnh báo, không fallback domain.

## Backend dependencies và FE-06

| Mục | Trạng thái và điều kiện |
| --- | --- |
| JWT |2026-11-20 utility server xác nhận chưa cấu hình hợp lệ; operator phải cấp cấu hình hợp lệ bằng task riêng, không đặt secret vào VITE_. |
| Dev users | QA01 ngày2026-11-19 ghi users0; **chưa truy vấn lại ở FE05**, chưa có tài khoản thử nghiệm hợp lệ được bàn giao. Cần người dùng cấp account/ủy quyền task riêng, không tự register/seed. |
| Auth contract | Login Bearer900giây,me principal,logout không revoke,không refresh/cookie session; source đã đối chiếu. Cần chốt session persistence/cache isolation và kiểm thử luồng thật trước nghiệm thu auth. |
| API gaps/RBAC | QA01 còn category_manage/fine rules/copy note/borrower lookup/profile/upload/forecast/coverage và advisory. Không phải tất cả chặn login; phải giải quyết theo feature/task riêng. Không re-audit DB/grants hoặc sửa API trong FE05. |
| CORS/env/browser | Public GET/CORS header và Axios SSR đạt; dev envfile hiện thiếu origin, process kiểm thử có origin. Cần config môi trường được vận hành và browser Network/UI thật. |

FE-06 có thể được người dùng giao để triển khai frontend auth theo contract, nhưng **chưa đủ điều kiện nghiệm thu end-to-end** khi JWT/account chưa sẵn sàng; persistence chưa được duyệt. Chỉ bắt đầu khi người dùng giao nhiệm vụ riêng sau nghiệm thu FE05. Không ngầm chấp thuận sửa JWT/DB/grants hoặc tạo user.

Chưa tích hợp: health/db, chi tiết catalog, auth, protected endpoints và toàn bộ CRUD/borrow/returns/fines/statistics/forecast. Không tạo service/hook giả cho các phần này.

## Điểm dừng

Không sửa Backend/database/schema/seed/migration, contract FE01, envfile, package/lock, UI tokens/components hoặc test cũ; không login/logout/token storage/refresh/guard/protected calls. Không commit/push. Chờ nghiệm thu FE05 và checklist browser; không tự thực hiện FE06.
