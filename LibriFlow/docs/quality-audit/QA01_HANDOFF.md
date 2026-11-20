# QA-01 — Handoff

Xác minh2026-11-19. **Hoàn tất audit và safe optimization trong phạm vi môi trường; chờ người dùng nghiệm thu.** Browser/integration ghi/advisory còn chưa xác minh như báo cáo, không coi toàn hệ thống production-ready. Không triển khai FE-04 và không tự làm task kế tiếp.

Kết quả:10module Backend+health/40endpoint(29JWT),15nhóm UI+Field helper,33direct deps;107JS/JSX/MJS+4CSS,251relative edges/0cycle. 172Backend và78Frontend trước/sau đạt,lint/build đạt;17HTTP read checks/12SELECT, real server.js+health-api/Axios200 trong process test. DB16bảng/96cột khớp tên/kiểu/NULL,46index; JWT503/users0/rules0/category_manage0 là blockers hiện tại. [Tổng quan](QA01_FULLSTACK_AUDIT.md), [verification](QA01_VERIFICATION_REPORT.md).

## Thay đổi QA-01

- Backend/src/controllers/sach.controller.js: dùng helper JSON chung, giữ validator/415/response.
- Backend/test/an-toan-tich-hop.test.js: pattern bảo vệ import nhận tên DB hiện tại, không thêm/xóa/nới test.
- Frontend/docs/01_BACKEND_API_INVENTORY.md: UTF-8 + contract40endpoint theo source; Frontend/README.md và docs/FE02_BACKEND_DEPENDENCIES.md cập nhật trạng thái.
- docs/quality-audit/:8 báo cáo theo yêu cầu,3 script verify chỉ đọc và evidence baseline/static/smoke/health/dependency audit cùng kiểm tra tài liệu cuối.
- docs/PROJECT_CONTEXT.md,DATABASE.md,DECISIONS.md,TASKS.md,HANDOFF.md: snapshot mới, lịch sử task giữ nguyên. Handoff FE01/02/03 không ghi đè.

Chi tiết thay đổi/verification/lỗi script đã sửa: [optimization log](QA01_OPTIMIZATION_LOG.md). Package/lockfile/SQL/Frontend runtime/styles/config và index ban đầu giữ nguyên; không đọc/in env values/PII, không sửa env, không migration/seed hoặc ghi/xóa DB. Không thay nghiệp vụ, API, auth/authorization, transaction/concurrency hoặc cách tính phạt. Giữ67file staged có trước; QA changes chưa stage/commit/push.

## Điều kiện FE-04

1. Chưa nên nghiệm thu FE-04 có auth thật trước khi operator giải quyết JWT và dev users/staff trong môi trường được chỉ dẫn riêng; QA không tự cấp hoặc tạo credential.
2. Nghiệm thu trực quan FE-03 theo checklist375/768/1280/keyboard/zoom/reduced-motion/AT. Browser tools hiện unavailable, RTL không thay bước đó.
3. Dùng inventory01 đã sửa trước khi xây API feature. Phụ thuộc copy-note/grants/rules/borrower/series/profile/upload/forecast xử lý theo feature, không bắt mọi API mới hoàn thành trước Login/khung.
4. Không cần đổi React/Vite/JS/Express/MySQL hoặc thiết kế Warm Wooden Library. Cần tasks Backend/operator riêng, giữ phương án C; scope FE-04 cụ thể do người dùng giao sau nghiệm thu.

Đề xuất chưa được duyệt: cấu hình/cấp tài khoản/quyền, note contract, migration, fine policy/rules/lookup, APIs mới, forecast write/coverage, deployment security, SQL/index/locking optimization. Không action nào trong danh sách này đã thực hiện. [Risk register](QA01_RISK_REGISTER.md) có priority, gate và task đề xuất cho từng mục.

QA-01 hoàn tất phần kiểm chứng được không có nghĩa mọi checkbox browser/MySQL/security được pass. Các kiểm tra chưa chạy và giới hạn đều ghi tại verification report. Dừng chờ nghiệm thu, không tự mở FE-04.
