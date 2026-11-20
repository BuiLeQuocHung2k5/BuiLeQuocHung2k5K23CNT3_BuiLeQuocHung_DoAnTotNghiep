# FE-RENAME-01 — Test report

Xác minh **2026-11-20**. Node24.20.0/npm11.19.0, React19.3.1/Vite8.3.6/Vitest5.1.1; dependency/lock không đổi. Phạm vi chỉ đổi tên và tham chiếu; không Backend/database hoặc FE06.

## Baseline và kết quả sau đổi tên

Các lệnh chạy tại `Frontend`:

| Lệnh | Trước | Sau |
| --- | --- | --- |
| `npm.cmd run lint` | exit0 | exit0 |
| `npm.cmd run test:run` | **152/152,10file**,exit0 | **152/152,10file**,exit0 khi chạy riêng |
| `npm.cmd run build` | exit0,2399modules | exit0,2399modules |

Giữ đủ 10 file test và toàn bộ 152 trường hợp. Chỉ đổi đường dẫn import/mock, tên binding/reference và named export của mock tương ứng; không đổi nội dung assertion, fixture nghiệp vụ, mô tả test, timeout hoặc bỏ test.

Lượt full đầu sau đổi tên, chạy cùng lint/build: **151/152**, test đầu của shell chờ banner quá 1 giây trong khi còn fallback lazy. Không thấy lỗi module hoặc assertion hành vi khác. Hai lượt chạy riêng sau đó đều đạt **152/152** (9,22 và9,61giây). Đây là rủi ro timing lúc tải module lạnh/chạy nhiều kiểm tra đồng thời, chưa kết luận ổn định trong mọi cấu hình máy; không thay timeout/assertion hoặc kiến trúc để che lỗi trong task đổi tên.

## Đối chiếu source với working baseline

Snapshot trước đổi tên gồm219hash file ngoài node_modules/dist/.git và62file source/config Frontend. Bao gồm FE04/FE05 chưa commit; Git HEAD/index được ghi nhận riêng. Dùng parser/traverse đã có trong node_modules cho kiểm tra tạm, không thêm dependency vào dự án.

- **57/57 AST JavaScript/JSX** khớp sau khi đảo ánh xạ lexical names/import paths/mock exports và chuẩn hóa alias shorthand. Bao gồm55file JS/JSX trong src và2config. So sánh giữ operator, literal, key object/JSON, member API, JSX props/text, nội dung điều kiện/assertion và cấu trúc hàm; chỉ bỏ metadata vị trí/comment/format và cờ shorthand khi so sánh.
- **5/5 CSS** khớp sau chuẩn hóa đúng đường dẫn local @import;4CSS nội dung giữ nguyên byte, stylesheet tổng chỉ đổi4import. Selectors, class names, custom properties, media queries và nội dung thiết kế không đổi.
- **129 cạnh import tương đối**, kể cả dynamic imports: trước/sau cùng module identity. **0 import thiếu/sai casing**, kiểm từng segment bằng danh sách thực tế trên đĩa; **0 cycle trước và sau**, không có vòng mới. Kiểm va chạm tên đích không phân biệt hoa/thường trước khi đổi.
- Vite chỉ đổi `test.setupFiles` sang `./src/kiem-thu/thiet-lap.js`. ESLint config không đổi; không có alias cần cập nhật. `main.jsx` giữ tên/đường dẫn, chỉ đổi imports App/CSS.
- Hai script QA01 được cập nhật đường dẫn/source export Frontend: `docs/quality-audit/verify-health-client.mjs`, `verify-static.mjs`. `node --check` cả hai đạt; không chạy lại script để tránh ghi đè evidence lịch sử hoặc mở kiểm tra Backend ngoài phạm vi.

## HTTP và assets

Tái dùng dev5173 có trước; preview4173 được khởi động tạm bằng `npm.cmd run preview` rồi dừng. HTTP kiểm tra bằng Node fetch:

- **9/9 dev và9/9 production route shells**200/có root: `/`, `/design-system`, `/app`, `/app/`, `/app/layouts`, `/app/workspace`, `/app/api-check`, `/app/missing`, `/missing`.
- **6/6 module/CSS dev**200, không trả HTML fallback: main,App,router,router khung,trang API và CSS tổng tại đường dẫn mới.
- **31/31 assets production**200/byte>0/không HTML, gồm6JS,1CSS và24font. CSS vẫn là `index-CUVur_Hb.css`;24tên font có hash giữ nguyên so với baseline build. Chunk JS đổi tên/hash do module/component được đổi tên, là kết quả dự kiến.
- RTL và AST đối chiếu routing chứng minh cấu hình/interaction cũ được giữ. HTTP200 ở deep link/unknown path là SPA fallback, không chứng minh browser render hoặc server404.

Không khởi động Backend, gọi API thật hoặc truy vấn MySQL trong task này. Kết quả Backend/JWT/account ở FE05 là snapshot lịch sử, không phải xác minh mới của FE-RENAME-01.

## Bảo toàn tài liệu và giới hạn

Tài liệu FE01..FE05 giữ tên file và các kết quả lịch sử; cập nhật tham chiếu source ở các tài liệu liên quan. Khi rà helper tài liệu đã phát hiện phạm vi khớp đường dẫn quá rộng làm sai một số tham chiếu Backend; đã khôi phục đúng baseline và giới hạn lại theo đường dẫn/module Frontend. Inventory/contract FE01, tài liệu database và toàn Backend được đối chiếu hash riêng; không dùng bản tham chiếu sai làm kết quả cuối.

Giữ package/lock/env/index.html/.gitignore, không cài dependency, không stage/reset/unstage/commit/push. Tổng hợp bảo toàn, link và Git cuối ở [handoff](FE_RENAME_01_HANDOFF.md); đầy đủ ánh xạ ở [mapping](FE_RENAME_01_MAPPING.md).

Kiểm cuối: **60/60 file src** được bảo toàn theo mapping, mọi đường dẫn tên file mới đều ASCII; **102/102 file Backend**,6tài liệu contract FE01,docs/DATABASE,env/package/lock/evidence QA01 giữ hash baseline. HEAD và SHA256 của `git ls-files --stage` không đổi. **457 liên kết nội bộ** trong README/docs Frontend và docs dự án hợp lệ; `git diff --check` exit0 (cảnh báo LF/CRLF theo cấu hình sẵn có).

`cua.getState()` trả apps/browsers rỗng, native pipe/browser access host unavailable. **Chưa xác minh** browser UI/Network, responsive375/768/1280, focus/AT/zoom thực hoặc chạy native Linux/case-sensitive filesystem. Static casing + jsdom/HTTP không thay các kiểm tra này.

Nghiệm thu thủ công: mở sáu route chính, kiểm drawer/desktop/active link/keyboard/dialog/form/preview theo checklist FE03/FE04 và manual API controls FE05. Không có thay đổi UI dự kiến; dùng mapping để mở file mới thay các IDE tab đang giữ đường dẫn cũ.
