# BE-AUTH-SETUP-01 — Test report

Xác minh **2026-11-20**. Baseline HEAD 9bd5f45 sạch, Node 24.20.0/npm 11.19.0. Chỉ thực thi phần chuẩn bị, guard và đọc database; chưa provision hoặc login MySQL test mới.

| Kiểm tra | Kết quả |
| --- | --- |
| Backend npm.cmd test trước | 175/175 pass, 0 fail/skip. |
| Backend npm.cmd test sau | 178/178 pass, 0 fail/skip; giữ 175 test cũ. |
| Targeted moi-truong-xac-thuc.test.js | 3/3 pass. |
| Targeted xac-thuc.test.js + chuan-bi-xac-thuc.test.js | 18/18 pass; model giả, không MySQL. |
| Backend syntax/import/export/casing/cycles | 78 JS/MJS, 201 cạnh import tương đối, 264 local import bindings; không lỗi hoặc vòng. |
| node integration/ke-hoach-xac-thuc.mjs | Đạt; main identity verified, binary 8.0 sẵn có, SELECT only, provisioningStarted=false. |
| node integration/chay-xac-thuc.mjs | Chưa chạy scenario: MISSING_TEST_DB_NAME trước kết nối/ghi. |
| Instance runner thiếu một trong hai cờ auth | Exit 2; EXPLICIT_PROVISION_APPROVAL_REQUIRED hoặc AUTH_ONLY_MODE_REQUIRED, không start mysqld. |
| Git và phạm vi cuối | 97/97 file Frontend khớp blob HEAD qua Git filters; 100 file Backend được bảo vệ không có diff; HEAD/index không đổi. Chỉ 7 file cũ sửa và 12 file mới đúng phạm vi, không xóa. |
| Tài liệu và whitespace | 132 local links tại 13 docs hợp lệ; UTF-8, trailing whitespace và git diff --check đạt. |
| Frontend tests/lint/build mới | Không chạy vì không sửa Frontend; kiểm phạm vi Git riêng. |

Ba test mới kiểm: plan chỉ SELECT và không xuất identity chính; từ chối identity chưa xác minh trước khi đếm; từ chối cờ provisioning không đầy đủ trước startup. Guard refusal không phải integration pass.

Lượt targeted cuối chạy chung ba file test: 21/21 đạt (18 auth + 3 guard), không phải 21 scenario MySQL. Đối chiếu Git không bao gồm file env ignored; xác nhận không sửa env dựa trên các thao tác của task, không tuyên bố hash env cuối khi chưa đối chiếu riêng.

## Snapshot main chỉ đọc

MySQL 8.0.40, 16 bảng, users = 0; ba role admin/librarian/reader. JWT config hiện thiếu/chưa hợp lệ; bảy TEST_DB_* bắt buộc đều chưa có. Main metadata/count hashes khớp qua các lượt đọc, không đọc PII hoặc hash user.

- Metadata hash: 18d26653eb38148712c97014df3a33c61b9d63c810e2c6d31462e661ec8e3207.
- Counts hash: 583fce11d9954abd44ab0cd8bc8ce01ba276aedd2d37c613656dbfebe3df37b6.

Binary được kiểm bằng --no-defaults --version, không start instance/service. Không DDL, CREATE USER, GRANT, REVOKE, ALTER USER hoặc ghi account trên main/test. Không tạo secret file hoặc ghi đè env. Lệnh provision chưa chạy do mục 6 yêu cầu phê duyệt.

## Chưa thực thi

[Auth suite](../../Backend/integration/xac-thuc.mjs) có 10 scenario chuẩn bị, không tự chạy bởi npm test. Chưa có bằng chứng login/register/JWT/me/authorization/logout hoặc event persistence trên MySQL test mới; chưa quan sát startup, runtime grants, cleanup/datadir của nhánh auth-only.

Hai diagnostic trong suite là thiếu config và DB fault injection, không tính như outage MySQL thật. Unit HTTP hiện hữu dùng model giả. Kết quả TASK-018 MySQL và BE-AUTH-PREP smoke là lịch sử, không thay bằng chứng run mới.

Chưa kiểm browser/CORS enforcement, FE-06, TLS/proxy, pentest/advisory, tải/concurrency hoặc Backend dev lâu dài. Backend không có lint/build script; không ghi unit pass thành lint/build pass.

## Điều kiện tiếp tục

Cần duyệt [kế hoạch instance/DDL/account/grants](BE_AUTH_SETUP_01_TEST_DATABASE.md) trước khi dùng lệnh opt-in. Sau chạy cập nhật status/code/claims, fixture/events, main before/after và cleanup bằng kết quả thực tế. Nếu lỗi, phân biệt helper/environment với runtime; không nới assertion hoặc sửa nghiệp vụ.

Đối chiếu phạm vi Git và links cuối ở [handoff](BE_AUTH_SETUP_01_HANDOFF.md).
