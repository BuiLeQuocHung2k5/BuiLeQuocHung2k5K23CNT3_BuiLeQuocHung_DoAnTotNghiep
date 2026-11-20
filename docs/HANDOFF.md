# Bàn giao hiện tại

Cập nhật **2026-11-20 · FE-RENAME-01**. Chức năng vẫn ở FE05. [Lịch sử](TASKS.md), [mapping đầy đủ](../Frontend/docs/FE_RENAME_01_MAPPING.md), [test report](../Frontend/docs/FE_RENAME_01_TEST_REPORT.md), [handoff chi tiết](../Frontend/docs/FE_RENAME_01_HANDOFF.md).

- Đã Việt hóa59file đổi đường dẫn (57basename,2App giữ tên chuyển thư mục),17tên thư mục/18đường dẫn và203tên định danh tại516bindings. Source chính: src/ung-dung,chuc-nang,bo-cuc,thanh-phan,thu-vien,cau-hinh,kieu-dang,trang,kiem-thu. main.jsx/App.jsx và file hệ sinh thái giữ tên.
- Import/export/dynamic import/mock và reference docs/tools đã cập nhật. Vite chỉ đổi test.setupFiles; ESLint/package/lock giữ nguyên. Không đổi API/URL/HTTP/JSON/env/role/query key/props/CSS/UI hoặc assertion/logic.
- Baseline/cuối **152/152,10file**, lint/build đạt. Có1lượt151/152 khi chạy đồng thời, timeout lazy shell;2lượt chạy riêng sau đó152/152, không sửa timeout/assertion. AST57/57,CSS5/5 khớp;129cạnh import cùng identity,0thiếu/case mismatch/cycle.
- Dev9/9 vàproduction9/9route shells,6/6modules/CSSdev,31/31assets production200; CSS filename hash và24font filenames giữ nguyên. HTTP/jsdom/static casing không thay browser hoặc Linux runtime: các phần này **Chưa xác minh** vì browser/native host unavailable.
- Giữ FE04/FE05 chưa commit theo working baseline, không stage/reset/unstage/commit/push hoặc sửa Backend/database. Inventory/contract FE01, docs/DATABASE, Backend/SQL/config/env/package/lock và evidence QA01 được bảo toàn; 2helper QA01 chỉ cập nhật reference Frontend, kiểm syntax, không chạy ghi đè evidence.
- Dev có trước **http://127.0.0.1:5173/app** tiếp tục phục vụ; preview4173 tạm đã dừng. IDE tab cũ cần mở lại theo mapping. Không chạy Backend/DB/API thật hoặc thay env trong task này.
- Chờ nghiệm thu FE-RENAME-01, gồm browser checklist FE03..05 khi công cụ sẵn sàng. FE06 chưa triển khai; JWT/account/session policy giữ trạng thái bàn giao FE05, không xác minh mới và không tự sửa.
