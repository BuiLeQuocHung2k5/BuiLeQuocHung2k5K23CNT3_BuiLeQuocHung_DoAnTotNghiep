# BE-AUTH-PREP-01 — Phương án tài khoản test

Xác minh **2026-11-20**. **Không tạo account trong database nào ở task này.** Ba test mới chỉ có fixture tạm trong RAM, mọi SQL bị chặn; không phải tài khoản để đăng nhập bằng Frontend sau khi test kết thúc.

## Điều kiện môi trường chưa đạt

- Process không có TEST_DB_*; [napCauHinhKiemThu](../../Backend/integration/an-toan.mjs#L11) và runner thực tế từ chối MISSING_TEST_DB_NAME trước kết nối/ghi. Chưa xác minh test target,grants,marker/fingerprint hoặc server UUID hiện tại.
- Main DB có0user,3role,16bảng; tài khoản kết nối MySQL có quyền global/GRANT OPTION. Không tái dùng tài khoản này làm runtime test hoặc xem NODE_ENV=test là chứng cứ cô lập.
- [Config ứng dụng](../../Backend/src/config/co-so-du-lieu.js) luôn đọc DB_*; [guard integration](../../Backend/integration/an-toan.mjs) dùng TEST_DB_* riêng. Chỉ đổi TEST_DB_NAME không làm `npm start` đổi pool sang test; cần wiring toàn bộ DB_* của process ứng dụng tới test target đã duyệt, hoặc dùng factory truyền database đã guard. Không sửa env chính.
- TASK018 từng chạy instance tạm, sau đó đã dừng; fixture/credential của run đó không phải môi trường demo đang được bàn giao.

## Tối đa ba account đề xuất

Đây là nhãn mục đích, không phải username/email/password đã tạo hoặc được cấp:

| Account | Mục đích | Quyền tối thiểu/điều kiện |
| --- | --- | --- |
| Reader của run | Login/me/logout/401/expiry,own access,403 khi thiếu quyền |Register hợp lệ chỉ gán reader; không tự nhận role từ request. |
| Librarian của run | Me phản ánh role và permission,staff navigation được phép |Chỉ cấp role đã duyệt cho account thuộc run trong target cô lập; không cấp wildcard/global DB privileges. |
| Admin của run, tùy chọn | Chỉ khi cần nghiệm thu tình huống admin riêng |Không tạo mặc định để vượt mọi403; phải duyệt phạm vi/quyền test và xác minh grant thực tế. Nếu hai account đủ thì không tạo account thứ ba. |

Main role labels không tự tạo fixture; register không trả JWT và không có API cấp staff. Có thể tạo reader qua API register trên target test đã xác minh; staff role relation cần operator/test harness được duyệt. Không đổi seed production hoặc cấp toàn quyền để làm tests pass. `category_manage` thiếu ở main là task riêng, không giải quyết bằng gán admin.

## Quy trình chuẩn bị sau khi được giao môi trường riêng

1. Operator cung cấp target cô lập có schema hiện hữu đúng thiết kế, dữ liệu giả có thể giữ theo run và mục đích dev/test rõ ràng. Không tạo/clone/reset schema trong BE-AUTH-PREP-01. Nếu chưa có, giao task hạ tầng test riêng.
2. Tái dùng guard: TEST_DB_NAME thuộc allowlist chính xác `libriflow_integration_test` hoặc `libriflow_ci_test`; cần TEST_DB_HOST,PORT,USER,PASSWORD,SERVER_UUID,MAIN_SERVER_UUID. Xác minh DATABASE(), UUID khác main, account test-schema-only không GRANT OPTION/global/admin grants, marker version/fingerprint schema/seed khớp. Không chỉ tin tên DB hoặc NODE_ENV.
3. Account MySQL runtime chỉ có quyền cần thiết; auth cần SELECT/INSERT, harness run manifest còn UPDATE. Guard hiện cho phép tập quyền lớn hơn cho setup, không có nghĩa runtime phải được cấp toàn bộ. Không chạy setup/instance-isolee trong bước kiểm auth khi chưa có chỉ dẫn riêng: chúng có DDL/seed/provision.
4. Cấp JWT_SECRET ngẫu nhiên mạnh riêng cho process test, tối thiểu32byte theo source, nên sinh từ CSPRNG; giữ ổn định trong phiên kiểm thử. Không dùng secret production, không in token/password/hash hoặc lưu vào source,Git,report,Postman export,Frontend VITE_. Ví dụ env hiện hữu đã có JWT_SECRET trống; không cần sửa nó.
5. Dùng dữ liệu giả, email thuộc example.test và prefix runId ngẫu nhiên; password ngẫu nhiên trong RAM, đáp ứng12code point/72byte. Không dùng fixture password công khai trong tài liệu cũ làm credential của môi trường demo. Lưu manifest runId/user_id/role purpose, không credential/profile cá nhân.
6. Register → kiểm password hash/reader/không token → login → me → protected access/403 → logout → xác nhận token vẫn theo expiry. Thử inactive/locked hoặc thay quyền chỉ trên account thuộc run, không sửa user/role dùng chung. Không thay jwt algorithm/payload/expiration hoặc middleware.
7. Trước mỗi ghi, kiểm lại identity/marker/manifest và ownership fixture. Nếu một kiểm tra không đạt: dừng ghi, không fallback pool chính.

Hướng dẫn cũ [xac-thuc-api](../../Backend/docs/xac-thuc-api.md) có ví dụ tên DB thủ công; **allowlist của runner hiện tại là hai tên ở trên**, không suy một tên có hậu tố test là hợp lệ. [Integration guide](../../Backend/docs/kiem-thu-tich-hop.md) và [guard source](../../Backend/integration/an-toan.mjs) là căn cứ kỹ thuật; không chạy các lệnh setup được nhắc trong guide như một phần của audit này.

## Cleanup và bàn giao

Ở task này: đóng HTTP/pool, loại fixture/token/password khỏi scope RAM; không có dữ liệu DB mới cần xóa. Server smoke chỉ loopback cổng tạm, đã đóng; không lưu credential làm account bàn giao.

Ở run MySQL tương lai: ghi run manifest/status và chỉ khóa/deactivate account do run sở hữu nếu quy trình được duyệt; đóng app/pool, hủy credential test trong kênh bàn giao, dừng đúng instance disposable sau khi kiểm identity. Giữ evidence không credential. Harness hiện cấm DELETE/DROP/TRUNCATE và không tự xóa fixture; không gọi shutdown hoặc reset nhầm instance chính. Việc loại bỏ datadir/DB hoặc giữ account demo lâu dài cần quy trình operator riêng, không tự thực hiện ở đây.

FE06 cần môi trường/account có vòng đời đủ lâu cho browser nghiệm thu; một fixture RAM hoặc runner tự dừng sau test không đáp ứng điều đó. Chưa có account/secret thực được bàn giao ở BE-AUTH-PREP-01.
