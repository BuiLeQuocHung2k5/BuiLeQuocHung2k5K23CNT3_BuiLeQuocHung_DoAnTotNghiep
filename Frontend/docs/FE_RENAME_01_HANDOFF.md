# FE-RENAME-01 — Handoff

Xác minh **2026-11-20**. Đã đổi tên và kiểm tra trong phạm vi được giao, chờ nghiệm thu; chưa triển khai FE06. Chức năng ứng dụng vẫn dừng ở FE05. Browser thực và Linux runtime **Chưa xác minh**.

## Kết quả và ánh xạ

- **59 file đổi đường dẫn**:57đổi basename,2file App/App.test giữ basename và đổi thư mục. `main.jsx` giữ đường dẫn, cập nhật import. Không làm mất source/test.
- **17 tên thư mục** được Việt hóa; **18 đường dẫn thư mục** thay đổi nếu tính cả `lib/api → thu-vien/api` do thư mục cha. Giữ src/docs/api và các thư mục hệ sinh thái.
- **203 tên định danh**, áp dụng tại516lexical bindings (gồm import nội bộ). Component PascalCase; custom hook vẫn có tiền tố use; file utility kebab-case. Import/export, dynamic import, mock export và tham chiếu được cập nhật theo scope.

Bảng đầy đủ từng file/thư mục/định danh, lý do và mức ảnh hưởng: [FE_RENAME_01_MAPPING](FE_RENAME_01_MAPPING.md).

Các vị trí chính hiện tại:

| Phần | Source |
| --- | --- |
| Root/provider/router | [App](../src/ung-dung/App.jsx), [provider](../src/ung-dung/bo-cung-cap/BoCungCapUngDung.jsx), [router](../src/ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx) |
| Shell/navigation | [KhungUngDung](../src/bo-cuc/KhungUngDung.jsx), [DauTrang](../src/bo-cuc/DauTrang.jsx), [ThanhBen](../src/bo-cuc/ThanhBen.jsx), [mobile](../src/bo-cuc/DieuHuongDiDong.jsx), [hook desktop](../src/bo-cuc/useDieuHuongDesktop.js) |
| Trang đang mở trong IDE | [TrangTongQuanUngDung](../src/chuc-nang/khung-ung-dung/TrangTongQuanUngDung.jsx), [TrangXemThuBoCuc](../src/chuc-nang/khung-ung-dung/TrangXemThuBoCuc.jsx), [DinhTuyenKhung](../src/chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx), [role config](../src/ung-dung/dieu-huong/cau-hinh-bo-cuc-vai-tro.js) |
| API | [TrangKiemTraApi](../src/chuc-nang/api-cong-khai/TrangKiemTraApi.jsx), [services](../src/chuc-nang/api-cong-khai/dich-vu-cong-khai.js), [queries](../src/chuc-nang/api-cong-khai/truy-van-cong-khai.js), [Axios](../src/thu-vien/api/ket-noi-http.js), [errors](../src/thu-vien/api/chuan-hoa-loi.js) |
| UI/CSS | [thanh-phan/giao-dien](../src/thanh-phan/giao-dien), [kieu-dang](../src/kieu-dang), [preview](../src/chuc-nang/he-thong-giao-dien/TrangHeThongGiaoDien.jsx) |

## Cấu hình, tests và tài liệu

`vite.config.js` chỉ cập nhật test.setupFiles; eslint.config.js/package/lock giữ nguyên. 10file test đổi đường dẫn/import/binding, không đổi assertion hoặc dữ liệu nghiệp vụ. Tài liệu FE01..FE05 không xóa/đổi tên; cập nhật đường dẫn/tên source liên quan, giữ số đo lịch sử. README,docs/PROJECT_CONTEXT/DECISIONS/TASKS/HANDOFF cập nhật trạng thái hiện tại. Hai helper QA01 chỉ đổi reference Frontend, không ghi đè evidence cũ.

Baseline và kiểm cuối: **152/152 tests**, lint/build đạt; AST57/57,CSS5/5,129cạnh import,0thiếu/case mismatch/cycle;9dev+9production route shells và31assets200. Có một lượt151/152 khi lint/build/test chạy đồng thời, timeout ở lazy shell; chạy riêng đạt, giữ nguyên timeout/assertion. Chi tiết và giới hạn ở [test report](FE_RENAME_01_TEST_REPORT.md).

Đối chiếu cuối: source60file trước/sau đủ theo mapping;102file Backend,6docs FE01,docs/DATABASE,env/package/lock/evidence QA01 giữ hash; HEAD/index entries không đổi. 457link nội bộ và diff-check đạt. Script/bản chụp tạm phục vụ đổi tên được dọn sau kiểm tra; bảng mapping và báo cáo giữ lại đầy đủ trong3docs FE-RENAME-01.

## Tên giữ nguyên và bảo toàn hành vi

Giữ các tên file/framework theo yêu cầu, App.jsx/App.test.jsx, package/API thư viện, props/DOM/React, object/JSON keys, HTTP/env/role identifiers, CSS classes/tokens, toàn bộ nội dung UI và các literal query keys. Biến được đổi tên trong destructuring/object shorthand dùng alias để giữ key. Không dịch property tùy chỉnh hoặc thay đổi giao diện component chỉ để đồng nhất tên.

Các URL `/`, `/design-system`, `/app`, `/app/layouts`, `/app/workspace`, `/app/api-check`, trailing slash và wildcard giữ nguyên. Không auth/session/JWT storage/guard/login/logout hoặc logic nghiệp vụ mới. Không Backend/database/schema/seed/migration, không dependency mới, không commit/push hoặc thay index. FE04/FE05 chưa commit đã được dùng làm baseline, không khôi phục về HEAD làm mất công việc có trước.

## Rủi ro và bước tiếp theo

- IDE tab/bookmark tới file cũ có thể không tự cập nhật; mở theo bảng mapping. Không thêm wrapper/alias đường dẫn cũ làm hai nguồn source.
- Test lazy shell có độ nhạy timing dưới tải đồng thời; chưa xử lý ngoài phạm vi đổi tên. Không coi một lượt pass là chứng minh hết flakiness.
- Chưa chạy app trên Linux hoặc quan sát browser thực; cần nghiệm thu checklist FE03..05. Kiểm casing hiện là static từng segment, không phải Linux runtime.
- Dev hiện hữu tại **http://127.0.0.1:5173** được giữ; preview4173 tạm đã dừng. Không thay cấu hình env; Backend vẫn thuộc quy trình vận hành FE05.
- FE06 chỉ khi người dùng giao nhiệm vụ riêng; JWT/account/session policy vẫn theo bàn giao FE05, không được xác minh hoặc sửa mới trong task này.

Dừng sau FE-RENAME-01 và chờ người dùng nghiệm thu.
