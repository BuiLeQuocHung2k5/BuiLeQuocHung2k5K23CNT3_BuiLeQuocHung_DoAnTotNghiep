# QA-01 — Full-stack audit

Xác minh **2026-11-19**. Audit và safe optimization hoàn tất trong phạm vi kiểm chứng được; chờ nghiệm thu. **Chưa đủ căn cứ chuyển sang nghiệm thu FE-04 tích hợp auth**: JWT chưa sẵn sàng, chưa dev user/staff và FE-03 chưa kiểm browser thật. Không triển khai FE-04. Báo cáo không phải chứng nhận production/security/concurrency.

## Baseline và phạm vi

Git HEAD `3a4c69e`, ban đầu67 file staged từ các task trước (62 file Frontend thêm +5 docs root sửa), không unstaged/untracked. Đã lưu tên/hash/status/index trong [baseline](evidence/baseline.json). Giữ index nguyên trạng, không stage/commit/reset/stash/push. Node24.20.0/npm11.19.0. Tài liệu bắt buộc được đọc và đối chiếu source, không dùng kết quả cũ làm baseline.

| Kiểm kê / định nghĩa | Kết quả |
|---|---|
| File ban đầu thuộc Git/không ignore, không tính env files | 169 unique; không tuyên bố mọi file được review thủ công cùng mức sâu |
| Source src | Backend59 JS; Frontend38 file (34JS/JSX gồm6 test +setup,4CSS) |
| Parser/import/syntax scope | 107JS/JSX/MJS: Backend59src+9test+5integration=73, Frontend34;4CSS review riêng |
| Backend modules / API | 10 nghiệp vụ +health,40 method/path,29JWT/11public; runtime route inventory không trùng |
| UI | 15 nhóm,16 file JSX gồm Field helper,6 section preview; toàn bộ groups được rà |
| Direct dependencies | 33: Backend7prod+1dev; Frontend10prod+15dev |
| Relative edges / cycles | 251edges, không missing/casing sai/cycle; config files đọc riêng ngoài scope107 |
| MySQL snapshot | 16bảng/96cột/16PK/16FK/6UNIQUE/3CHECK/46index;96 tên/kiểu/NULL khớp DDL |

Entry: Backend server.js→app.js→app-factory.js; Frontend index.html→main.jsx→App/providers/router; source bằng chứng tại [static](evidence/static-after.json), [smoke](evidence/smoke.json). SQL/schema/seed/migration chỉ đọc; không setup/migrate/seed hoặc ghi DB.

## Kiến trúc, code quality và maintainability

Backend route/controller/service/model rõ ràng; validators trong utils, middleware lỗi tập trung, factory tiêm dependency; không cần đổi framework hoặc tách thêm repository. Controllers chủ yếu parse/serialize; services không phụ thuộc Express. Một số service thin/pass-through là seam public/test, không tự xóa. Models auth/borrow gọi history service nội bộ để validate event, có layering back-edge nhưng không cycle. Book/auth/shared helper có transaction wrappers lặp; không sửa vì user loại transaction changes khỏi safe optimization.

Frontend chia app/features/components/lib/config/styles phù hợp quy mô hiện tại; state UI cục bộ, QueryClient ổn định, không store hoặc abstraction thừa cần loại. UI không import API/auth. Health thủ công dùng mutation GET, không auto fetch/retry. /design-system lazy, / và fallback giữ nguyên. Không phát hiện unused import/local Backend theo subset linter, FE lint đạt; exported methods/UI variants/tokens/tools gọi qua scripts không bị coi là dead code chỉ vì không import ở main.

Source cleanup duy nhất là dùng helper JSON sẵn có cho books (B12); sửa test cũ tham chiếu tên DB sai (B13). Giá trị là giảm một implementation kiểm Content-Type trùng và sửa coverage guard, không tuyên bố tăng tốc. [Optimization log](QA01_OPTIMIZATION_LOG.md).

## Security và tính đúng nghiệp vụ

JWT HS256/issuer/audience/exp900s/sub bounds, bcrypt12/max72byte, RBAC đọc DB, SQL placeholders/allowlist, ownership WHERE, JSON256kb, error không lộ SQL/stack và auth limiter đã có source/test. Auth probe mới vẫn503 JWT_NOT_CONFIGURED; users0 và chưa staff. Logout stateless/CORS wildcard/local binding là contract/policy hiện hữu, không thay trong QA. Chưa có advisory report hợp lệ hoặc browser attack testing; không khẳng định không có lỗ hổng. Không phát hiện P0 trong phạm vi đã kiểm.

Borrow/return khóa copy theo ID, kiểm available/good/open-loan, transaction giữ usage event cùng ghi; partial/all return và rollback có unit coverage. Phạt server-priced BigInt, chặn duplicate theo detail/type bằng locking protocol; schema chưa UNIQUE tương ứng, mọi writer khác cần cùng quy tắc. Forecast thiếu coverage giữ insufficient_data và generate503 có chủ đích, không fake forecast. MySQL ghi/concurrency mới **không chạy** nên không lấy mock làm chứng nhận SQL thực.

Các vấn đề thật: copy note có thể mất khi PUT từ GET; category_manage thực tế thiếu; fine rules active0/thiếu lookup; JWT/dev users; thiếu borrower/user/series/profile/upload API. Mỗi issue có file/symbol/tái hiện/ảnh hưởng và task đề xuất tại [Backend findings](QA01_BACKEND_FINDINGS.md), [risk register](QA01_RISK_REGISTER.md). Không tự sửa nghiệp vụ/auth/transaction/schema.

## Performance

Không đo latency/Web Vitals/QPS, không có performance gain đã chứng minh. Rủi ro từ source: LIKE substring, deep OFFSET, count/page khác snapshot, lô100copy O(n) round trips, statistics derived aggregates. Metadata đối chiếu indexes hỗ trợ FK/title/author/user-date; không tự thêm/xóa index, không EXPLAIN ANALYZE hoặc tải DB chính. Tách rủi ro có căn cứ khỏi giả thuyết slowdown.

Frontend không useEffect/memo dư, fonts local/subsets/weights có caller và lazy preview. Build baseline baseJS381.34kB/gzip121.75; lazy preview65.66/gzip21.71; CSS31.44/gzip7.07;24font files357076byte. Build sau và các thay đổi nhỏ artifact trong verification report; output size không bằng bytes browser thực tải. Không tự gỡ package/font hoặc thêm caching/memoization.

## Integration và documentation

Health trước audit không có response3000/5173; process hiện tại thiếu origin nên interceptor chặn đúng. Probe start server.js thật3000/health-db200; nạp health-api/Axios thật bằng Vite SSR với origin tạm trong process trả200 đúng envelope. Preflight204/CORS* đạt trên app thật; **không phải browser verification**. Không sửa CORS/Backend config/env và đã dừng server kiểm thử. Không có bằng chứng MySQL làm health fail hiện tại.

Inventory FE-01 bị mất ký tự trong bytes, không chỉ render encoding; phần contract thực sự thiếu. Đã viết lại UTF-8,40 endpoint đầy đủ alias params/query/body/DTO/status/error/auth/date + nguồn; runtime/table khớp. README/phụ thuộc/context/database cập nhật, giữ nguyên handoff FE-01..03. Một số đoạn lịch sử root còn lỗi chữ/lạc thời được ghi rõ là snapshot cũ, không phục hồi đoán toàn bộ lịch sử. Không copy code hoặc bí mật cấu hình vào báo cáo.

## Testing và hướng tiếp

172/172 Backend và78/78 Frontend trước/sau; lint/build đạt;34/34 targeted regression đạt;107 parser/73 node syntax/import checks đạt. Backend không có script lint/build: subset linter không được gọi là backend lint script. MySQL integration ghi/browser/advisory scan đầy đủ chưa thực hiện; coverage phần trăm không được đo, không suy pass count thành coverage100%.

Giữ React/Vite/JS/Express/MySQL và kế hoạch Frontend, bổ sung tasks operator/Backend theo feature thay vì viết lại kiến trúc. Trước FE-04 tích hợp: xử lý JWT/dev account, nghiệm thu FE-03 browser và dùng inventory mới. Chi tiết [verification](QA01_VERIFICATION_REPORT.md), [handoff](QA01_HANDOFF.md). Dừng chờ người dùng nghiệm thu QA-01.
