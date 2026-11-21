# FE-06 — Test report

Xác minh **2026-11-21**. **Hoàn tất phần lập trình; chưa kiểm chứng đăng nhập Frontend end-to-end với Backend/MySQL thật.**

Baseline HEAD 8c224e8; working tree đã có thay đổi BE-AUTH-SETUP-01 chưa commit. Lưu SHA-256 243 file trước FE-06 để phân biệt phạm vi. Node 24.20.0/npm 11.19.0, không thêm dependency.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend baseline | 152/152 tại 10 file; lint/build đạt. |
| Frontend sau FE-06 | 182/182 tại 11 file, 0 fail/skip; lint/build đạt. |
| Targeted Auth | 30/30 tại [xac-thuc.test.jsx](../src/chuc-nang/xac-thuc/xac-thuc.test.jsx). |
| Syntax/import/export/casing/cycles | 61 JS/JSX, 154 cạnh import tương đối, 194 local bindings; không lỗi/vòng. |
| HTTP dev và production | 8 route SPA shell mỗi môi trường trả 200; 31 production assets trả 200. Đây không phải kiểm redirect React hoặc browser layout bằng HTTP. |
| Bảo toàn phạm vi | 108/108 file Backend và tổng 126 file được bảo vệ (Backend, docs auth cũ, package/lock, env/example) khớp SHA-256 baseline; HEAD/index giữ nguyên. |
| Database | Không truy cập hoặc thay đổi; không tạo account, seed, start Backend/MySQL hoặc tái chạy runner BE. |
| Diff/tài liệu cuối | Delta FE-06: 10 file hiện hữu sửa, 9 file mới, không xóa; đúng phạm vi. 34 local links tại 4 docs hợp lệ; UTF-8/whitespace và git diff --check đạt. |

Lệnh từ Frontend: npm.cmd run test:run; npm.cmd run lint; npm.cmd run build. Targeted: npx.cmd vitest run src/chuc-nang/xac-thuc/xac-thuc.test.jsx.

Các lượt targeted Auth + layout đạt 48/48 trước khi thêm 4 test vòng đời; targeted Auth cuối 30/30. Lượt lint đầu phát hiện preserve-caught-error: đã chuyển việc tạo chuỗi lỗi an toàn về form, giữ nguyên lỗi transport qua service, không lưu AxiosError chứa credential vào UI state. Không xóa test thất bại hoặc tắt lint rule.

## Phạm vi mock tests

Dùng React Context/router/QueryClient/Axios/interceptors thật trong jsdom; **chỉ transport là Axios adapter mock**, không gọi Backend thật. Dữ liệu/token mẫu chỉ ở file .test.jsx, không có mock fallback trong chức năng thực.

| Yêu cầu | Bằng chứng |
| --- | --- |
| Trang đăng nhập | Render /dang-nhap, trường email/password, autocomplete, title, không request khi mount. |
| Đăng nhập thành công | POST /auth/login chỉ email/password; chuẩn hóa email, giữ khoảng trắng password. Sau đó GET /auth/me có Bearer; chỉ vào /app khi có hồ sơ hợp lệ. |
| Sai thông tin/lỗi | 401 INVALID_CREDENTIALS, 403 ACCOUNT_INACTIVE, 429, 503; không retry hoặc render raw backend message. Me 401 và envelope HTML sai không tạo session. |
| Loading | Disable input/submit trong lúc chờ me; chưa coi là đăng nhập khi mới có token. |
| Thông tin người dùng | Tên, vai trò thật từ me; giữ user_id chuỗi lớn, không suy vai trò từ token/form. |
| Guard | /app, /app/, app path lạ và /app/api-check/unknown yêu cầu login; ba route kỹ thuật cụ thể vẫn public, không gọi API khi mount. |
| Logout | Gọi POST /auth/logout có Bearer, xóa token/profile/cache và chuyển về login ngay; vẫn xóa khi network error hoặc response logout chậm. |
| 401/expiry | Protected 401 của phiên hiện hành xóa session. Timer 900 giây và focus sau deadline đều hết phiên; không refresh. |
| Reload | Unmount/remount provider tại /app yêu cầu login lại; không đọc/ghi Storage. Đây là mô phỏng reload, chưa phải thao tác browser thật. |
| 403 | Protected 403 giữ nguyên session/cache. |
| Race/cache | 401 đến muộn từ phiên cũ không xóa phiên mới, kể cả mock token được lặp lại. Logout hủy login chưa xong; kết quả query đến muộn không khôi phục cache cũ. |
| Token scope | Không token trong URL/query keys/UI/Storage; không tự gắn Bearer cho URL ngoài API client. |

152 test cũ vẫn chạy. [Layout tests](../src/chuc-nang/khung-ung-dung/khung-ung-dung.test.jsx) nhận principal mock để kiểm shell sau khi /app có guard; cập nhật các assertion Header từ placeholder sang tên/nút logout. Preview đổi role không thay principal. Guard và anonymous demos được kiểm riêng bằng provider thật trong 30 test FE-06.

## HTTP smoke và cleanup

Dev 5173 dùng VITE_API_BASE_URL chỉ trong process, không ghi env. Production preview 4173 dùng build hiện hữu. Các route /, /dang-nhap, /app, /app/layouts, /app/workspace, /app/api-check, /design-system và /unknown đều phục vụ SPA shell 200. Router behavior được kiểm bằng jsdom, không suy từ status 200.

Cả dev/preview được tạo cho kiểm tra đã dừng; xác minh không còn listener 5173/4173. Build không có API origin vẫn render thông báo chưa cấu hình đúng thiết kế FE-02. Mock token marker không xuất hiện trong bundle production.

CIM Get-NetTCPConnection bị Access denied nên kết quả rỗng không được dùng làm bằng chứng. Đã đóng đúng hai exec session của server, kiểm lại bằng TCP probe trực tiếp: 3000/5173/4173 đều từ chối kết nối. Preview API tạm kiểm lại build cuối đạt 8 shell/31 assets rồi đóng HTTP server trong finally.

## Chưa kiểm chứng và giới hạn

- Browser host báo unavailable; native pipe cũng không khả dụng. Chưa quan sát UI/responsive thực ở 375/768/1280, zoom, focus/AT hoặc Network trình duyệt. CSS có breakpoint 767px và sử dụng tokens FE-03; không coi CSS/jsdom là chứng nhận trực quan.
- Backend dev cổng 3000 không hoạt động khi kiểm tra; chưa có target dev/JWT/account hoạt động được bàn giao. Không gọi login/register vào main để thử.
- Kết quả MySQL 10/10 của BE-AUTH-SETUP-01 là bằng chứng Backend riêng, **không phải FE-06 end-to-end**. Xem [handoff Backend](../../docs/backend-auth-setup/BE_AUTH_SETUP_01_HANDOFF.md).
- Không kiểm refresh/revocation vì Backend không có các chức năng này. Logout chỉ xóa phiên cục bộ; token phía server có thể hợp lệ tới exp.
- Phân quyền chi tiết thuộc FE-07. Ba ngoại lệ kỹ thuật public chỉ chứa demo/placeholder/public GET; cần xem lại cờ public nếu thay thành chức năng có dữ liệu riêng.

[Handoff](FE06_HANDOFF.md) liệt kê file, cách chạy và điều kiện FE-07.
