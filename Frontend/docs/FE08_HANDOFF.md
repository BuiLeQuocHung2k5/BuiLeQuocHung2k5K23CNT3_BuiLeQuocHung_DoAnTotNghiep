# FE-08 — Handoff

Xác minh **2026-11-21**. **Hoàn tất phần lập trình quản lý sách trong phạm vi API hiện có; dừng chờ nghiệm thu.** Frontend 280/280 tests, lint/build đạt. Chưa chứng nhận Frontend CRUD end-to-end với Backend/MySQL thật. [Test report](FE08_TEST_REPORT.md).

## Trang và chức năng

Route **/app/sach**, lazy trong App Shell, có mục “Quản lý sách” ở menu dùng chung. Giữ các tuyến demo/kiểm thử cũ.

- Danh sách có title/author, publisher/year, book_id và thể loại qua lookup hoặc mã tham chiếu thật.
- Search title/author/publisher bằng search; page/limit theo Backend. Có xóa từ khóa, page size 10/20/50, pagination, loading/empty/error/retry.
- Detail Dialog gọi GET riêng, không lấy dòng list làm dữ liệu sửa đầy đủ.
- Form thêm/sửa đủ 7 trường; validation, loading, lỗi field an toàn, Toast; thành công invalidate/refetch list/detail và public-books cache FE-05.
- DELETE có Dialog ghi rõ xóa vĩnh viễn, chỉ gửi khi bấm Xác nhận xóa; 409 sách có bản sao/liên quan được giữ và báo lỗi.
- Dùng lại FE-03 Button/Input/Select/Card/Dialog/Table/Badge/Skeleton/Toast, biểu tượng BookOpen và tokens Warm Wooden Library. Không thêm UI library/ảnh giả.

## API và quyền

| Thao tác | API | Policy |
| --- | --- | --- |
| Danh sách | GET /api/books?page&limit&search | Backend public; frontend /app yêu cầu login, không tự thêm gate book_view. |
| Chi tiết | GET /api/books/:id | Cùng policy đọc; ID giữ string. |
| Thêm | POST /api/books | book_create từ me. |
| Sửa | PUT /api/books/:id | book_update từ me, full replacement. |
| Xóa | DELETE /api/books/:id | book_delete từ me và xác nhận UI. |
| Chọn thể loại | GET /api/categories | Public lookup, không là sách filter. |

Button chỉ hiện khi coQuyenTruyCap đạt; trước gửi kiểm lại trong handler/service. Không Admin bypass. JWT được ghim vào Authorization của thao tác, không đưa token vào query key/body/URL/log. Provider FE-06 tiếp tục xử lý 401 và giữ phiên khi 403.

## Dữ liệu form và vòng đời

Chỉ gửi title, author, publisher, category_id, series_id, description, publication_year. Không book_id/timestamps/ISBN/read-only fields.

Title/author bắt buộc và trim theo validator; publisher nullable, description giữ nguyên whitespace/empty/null, ID giữ decimal string, year 0..65535/null. PUT giữ null/năm 0/ID ngoài safe integer khi không đổi; không tự xóa trường optional.

Lookup thể loại có tìm tên, tối đa 100 kết quả; option category_id đang gán luôn được giữ khi không nằm trong kết quả. Không có BoSach lookup API, nên series_id là trường mã tùy chọn đã biết, không tạo bộ sách hoặc fake options.

Reads dùng QueryClient hiện hữu, retry=false, AbortSignal; sách có namespace riêng ['sach',...], không token trong key. Ghi dùng một request có pending/ref guard, không hàng đợi offline hoặc automatic retry. Khi thành công invalidate/refetch, không optimistic delete/update. Đang gửi thì khóa form/đóng modal để tránh lặp.

Khi mất mạng, timeout, HTTP 5xx hoặc response ghi không đúng contract, kết quả có thể chưa rõ: khóa submit lại, yêu cầu đóng và tải lại danh sách để kiểm tra. Unmount/token đổi abort chờ; điều này không rollback thao tác server đã xử lý. API chưa có idempotency hoặc version/ETag, không tự replay hoặc khẳng định không có concurrent overwrite.

## File tạo

- src/chuc-nang/sach/TrangQuanLySach.jsx
- src/chuc-nang/sach/BieuMauSach.jsx
- src/chuc-nang/sach/dich-vu-sach.js
- src/chuc-nang/sach/TrangQuanLySach.test.jsx
- src/chuc-nang/sach/dich-vu-sach.test.js
- src/kieu-dang/sach.css
- docs/FE08_TEST_REPORT.md, docs/FE08_HANDOFF.md (trong Frontend).

## File sửa

- src/ung-dung/dinh-tuyen/cau-hinh-tuyen.js: thêm /app/sach và menu đúng trang đã triển khai.
- src/chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx: lazy book page.
- src/chuc-nang/xac-thuc/{kiem-tra-quyen.test.js,phan-quyen.test.jsx}: cập nhật assertion menu vì nay có trang sách thật; giữ kiểm quyền.
- docs/TASKS.md, docs/HANDOFF.md ở gốc repo theo AGENTS.

Không sửa Backend/database/schema/API contract, provider/login/logout/TTL/401/403/helper/guard FE-06/07, API Layer FE-05, env/package/lock hoặc đổi tên hàng loạt. Không thêm dependency. Baseline có staged/unstaged/untracked trước task, giữ nguyên index/HEAD và thay đổi đó; không reset/unstage/stage/commit/push.

## Verification và điều kiện FE-09

Baseline 232/232; cuối 280/280 tại 15 file, 48 test mới, lint/build đạt. Static 70 file/210 cạnh import/261 bindings, không lỗi/casing/cycle. 10 production SPA shells/35 assets HTTP 200, preview đã đóng. Chi tiết phạm vi mock và bảo toàn hash ở test report.

Chưa có browser host hoặc Backend dev/account hoạt động; chưa kiểm responsive/AT và CRUD thật. Không dùng DB main hoặc tạo account từ FE-08. VITE_API_BASE_URL cần origin Backend dev đã được vận hành riêng, không kèm /api; không đưa DB/JWT secret vào VITE_.

FE-09 chỉ theo task mới sau nghiệm thu. Trước nghiệm thu E2E cần Backend dev/MySQL cô lập, account/grants hợp lệ và browser để kiểm list/search/detail/create/update/delete-confirm/409/401/403. Việc chuẩn bị môi trường/fixture là phạm vi riêng cần xác minh, không tự chạy SQL/seed. Các API thiếu (ISBN/copies/cover/series lookup/filter) cần task đúng module, không giả lập. Không triển khai FE-09.
