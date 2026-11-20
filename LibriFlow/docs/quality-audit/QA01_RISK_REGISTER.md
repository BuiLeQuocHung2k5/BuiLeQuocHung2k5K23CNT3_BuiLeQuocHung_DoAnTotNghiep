# QA-01 — Risk register / Backend dependencies

Xác minh 2026-11-19. Mức ưu tiên theo ảnh hưởng, không theo độ dài file. P0 chưa phát hiện trong phạm vi đọc/test; security advisory/browser/MySQL ghi còn giới hạn. Chi tiết nguồn/tái hiện: [Backend findings](QA01_BACKEND_FINDINGS.md), [Frontend findings](QA01_FRONTEND_FINDINGS.md).

FE-04 chưa có đặc tả triển khai trong QA-01; cột gate hiểu là FE-04 có Login/session/guards tích hợp thật. Nếu phạm vi FE-04 khác, đánh giá theo feature phụ thuộc; không suy mọi thiếu API đều chặn mọi màn hình.

| ID / mức | Vấn đề và trạng thái mới | Chặn FE-04? | FE-05/FE-06 / feature về sau | Hành động / task riêng |
|---|---|---|---|---|
| R01 P1 (B01) | JWT chưa sẵn sàng, HTTP503 JWT_NOT_CONFIGURED | Có nếu auth thật | Mọi request bảo vệ | BE-CONFIG: operator cấu hình an toàn và kiểm auth; không thay middleware |
| R02 P1 (B02) | Dev user/staff chưa có, COUNT user0; chưa user CRUD | Có cho nghiệm thu role thật | Quản trị/người dùng | BE-DEV-ACCOUNT: chỉ tạo/gán khi có chỉ dẫn rõ, test env riêng |
| R03 P1 (F03) | Browser/native unavailable; FE-03 chưa nghiệm thu visual | Gate nghiệm thu FE-03 | Layout/responsive mọi màn | QA-UI: checklist Chrome/Edge, không sửa theo phỏng đoán |
| R04 P1→đã xử lý (F01) | Inventory mất chữ/thiếu contract đã viết lại UTF-8 theo40 source routes | Không còn blocker tài liệu này | Dùng inventory mới trước API integration | Review contract document, không thay Backend cho khớp docs |
| R05 P1 (B03) | Copy GET ẩn note, PUT bỏ note→null | Không nếu chưa sửa copy | Chặn edit copy đầy đủ | BE-COPY-NOTE: duyệt staff detail/PATCH hoặc contract giữ note |
| R06 P1 (B04) | category_manage thực tế0, source đã yêu cầu quyền | Không với Login/khung | Chặn category mutations | BE-GRANTS: xác minh và áp migration/grant riêng khi được phép |
| R07 P1 (B05) | Active fine rule0, thiếu lookup/quản trị rule | Không | Chặn create fine/acceptance payment flow | BE-FINE-CONFIG: duyệt policy/mức tiền/đơn vị/lookup; integration thành công |
| R08 P2 | Thiếu borrower lookup và user CRUD; user_manage grant không tạo API | Không | Chặn borrower picker/user management đầy đủ | BE-USER-LOOKUP: scope, quyền và PII tối thiểu; không dùng statistics/users |
| R09 P2 | Thiếu series lookup/CRUD, series_id vẫn nullable | Không | Catalog series picker | BE-SERIES nếu scope yêu cầu; có thể chưa mở series selection |
| R10 P2 (B06) | Forecast POST luôn503 có chủ đích | Không | Chặn tạo/lưu, không chặn trạng thái preview insufficient | BE-FORECAST-WRITE: quyền/dedup/run/persistence riêng; giữ gate |
| R11 P2 (B06/B07) | Coverage/UTC legacy/MAE thật chưa xác minh trong QA-01 | Không | Forecast ready và báo cáo tin cậy | DATA-COVERAGE: audit/operator evidence, không tự tạo verified file |
| R12 P2 | Profile/password/reset/refresh/revocation API thiếu | Không cho Login hiện hữu15phút | Chặn update profile/password/session mở rộng | BE-PROFILE/AUTH riêng; không refresh giả |
| R13 P2 | Upload/avatar/cover API thiếu, books không cover field | Không | Ảnh hồ sơ/sách | BE-UPLOAD nếu nghiệp vụ được yêu cầu; không fake save |
| R14 P2 (F04) | Không lấy được npm advisory report | Không chặn render/local unit; chưa chứng nhận security | Trước release/public exposure | QA-DEPS: audit trên registry hỗ trợ; không nâng package hàng loạt |
| R15 P2 (B11) | Không chạy MySQL ghi mới; chưa fine success/forecast ready/load | Không chặn khung, chặn chứng nhận end-to-end | Mượn/trả/phạt/concurrency | QA-DB-ISOLATED: chỉ môi trường và dữ liệu độc lập được duyệt |
| R16 P2 (B08/B09) | COUNT/page khác snapshot; O(n) lưu thông; LIKE substring/offset sâu | Không | Tải lớn, dữ liệu thay đổi đồng thời | PERF-BASELINE: EXPLAIN/benchmark đại diện trước SQL/index/locking changes |
| R17 P2 (B10) | CORS wildcard, loopback, in-memory limiter, chưa policy triển khai | Không trong local | Trước production/multi-instance | DEPLOY-SECURITY riêng; không tự đổi origin/header/auth |
| R18 P3 | metadata main/index.js, unused candidate tokens, thin wrappers, nhiều transitive version | Không | Không yêu cầu xử lý hiện tại | Giữ interface/scaffold; chỉ sửa khi có tác động thật |

## Thứ tự xử lý

1. Trước nghiệm thu FE-04 tích hợp: R01/R02 và nghiệm thu UI R03; R04 đã sửa, cần dùng bản mới. Khởi động dịch vụ/cấu hình origin là bước vận hành, không thêm proxy/CORS workaround.
2. Trước feature tương ứng FE-05/FE-06: R05..R13 và R15, tùy scope thực tế. Không gom migration, user, phạt, forecast vào một task cleanup.
3. Trước release/public: R14/R17 và đánh giá tải/timezone R11/R16.
4. Không cần đổi stack, TypeScript, store, UI library, major version, schema hoặc thin wrappers ở giai đoạn hiện tại. Các đề xuất còn mở **chưa được duyệt để thực hiện** trong QA-01.
