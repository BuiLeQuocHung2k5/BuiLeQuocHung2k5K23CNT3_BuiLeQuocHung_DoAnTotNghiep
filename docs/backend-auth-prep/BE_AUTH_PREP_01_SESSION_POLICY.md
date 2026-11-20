# BE-AUTH-PREP-01 — Session policy đề xuất

Xác minh source và tham khảo bảo mật **2026-11-20**. **ĐỀ XUẤT — CHƯA ĐƯỢC DUYỆT/CHƯA TRIỂN KHAI.** Task này không sửa Frontend, storage, middleware, JWT hoặc Backend contract.

## Phương án khuyến nghị cho FE06 hiện tại

Bearer JWT900giây, không refresh/cookie/revocation trong [source JWT](../../Backend/src/utils/jwt.js) và [logout controller](../../Backend/src/controllers/xac-thuc.controller.js#L17). Đề xuất giữ token trong memory mỗi tab, reload phải login lại. Đây là lựa chọn tương thích Backend hiện có cho phạm vi local; không phải chứng nhận an toàn production.

OWASP khuyến cáo tránh lưu credential/token trong Web Storage vì JavaScript cùng origin có thể truy cập; memory hạn chế lưu bền nhưng XSS đang chạy vẫn có thể dùng phiên. Lựa chọn memory ở đây là suy luận theo contract hiện tại, không phải thay thế phòng chống XSS. [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#html5-web-storage-api).

| Lựa chọn | Reload/tab | Rủi ro/phụ thuộc | Trạng thái |
| --- | --- | --- | --- |
| Memory mỗi tab | Reload/login lại;tab độc lập | XSS vẫn sử dụng được phiên đang chạy; UX phải chấp nhận mất phiên khi reload |Khuyến nghị để duyệt |
| sessionStorage | Giữ qua reload trong tab | JS đọc được, tăng lưu bền so với memory |Không tự chọn; không khuyến nghị lưu token |
| localStorage | Giữ qua reload/nhiều tab | JS đọc được, tồn tại lâu, tăng phạm vi token bị lấy |Không tự chọn; không khuyến nghị lưu token |
| HttpOnly cookie/BFF | Có thể thiết kế persistence | Cần Backend/contract/CSRF/SameSite/TLS/CORS và kiểm thử riêng; chưa có ở source |Task thiết kế riêng, không triển khai ở đây |

HttpOnly giảm khả năng đọc cookie bằng script nhưng không ngăn script gửi request trong phiên; cookie tự gửi cần chống CSRF phù hợp. Không bật withCredentials hoặc chuyển wildcard CORS thành cookie session trong FE06 nếu chưa có Backend task được duyệt. [OWASP cookie guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#httponly-attribute).

## Vòng đời đề xuất

1. Login thủ công,retry=false; chỉ gửi email/password đúng contract, email chuẩn hóa được nhưng **password không trim**. Không lưu/log mật khẩu hoặc request body.
2. Nhận accessToken vào memory tạm, gọi me với Bearer; chỉ chuyển sang trạng thái authenticated sau me thành công. Login không trả profile/role. Me lỗi mạng/503 thì trạng thái chưa xác minh, không giả principal hoặc quyền.
3. HTTP client lấy token từ session tại thời điểm gửi protected request; giữ nguyên Axios response/error. Public calls không cần Bearer. Token không vào URL, TanStack query keys,persistence,analytics,toast hoặc raw-error log.
4. expiresIn dùng cho UX timeout gần hạn, không gia hạn theo hoạt động. Timer/client clock không thay signature/expiry validation của Backend; server401 quyết định phiên còn dùng được hay không. Không refresh giả hoặc tự retry request ghi sau login lại.
5. Khi logout/đổi user/hết hạn: hủy protected requests, xóa principal/token và cache protected của phiên cũ trước khi hiển thị user mới. Ngăn response401/me chậm từ phiên cũ xóa/ghi đè phiên mới bằng kiểm session generation; generation không phải token/credential. Public cache theo quy tắc FE05, không đưa server state vào store thứ hai.

## Các tình huống

| Tình huống | Hành vi đề xuất |
| --- | --- |
|401 từ login | Báo lỗi form chung; không xử lý như một phiên cũ vừa bị revoke. |
|401 từ protected request của phiên hiện hành | Xóa phiên/cache protected; yêu cầu login; không retry vô hạn. |
|403 FORBIDDEN | Giữ session, báo thiếu quyền; cập nhật principal có kiểm soát nếu cần, không tự nâng quyền. |
|403 ACCOUNT_INACTIVE | Khóa sử dụng phiên và xóa token/principal/cache theo policy; không lặp login. |
|Network/timeout/503 | Không suy logout hoặc sai mật khẩu; báo tạm không kết nối. Với login timeout, không biết event phía server đã ghi hay chưa; người dùng thử lại chủ động. |
|Logout khi online | Thử POST logout với token hiện hành, sau đó luôn xóa local trong finally. Không gọi kết quả này là server revocation. |
|Logout offline/hết hạn | Vẫn xóa local; báo rõ giới hạn khi cần, không chờ vô hạn hoặc giữ token vì endpoint lỗi. |
|Reload/đóng tab | Memory mất, cần login lại; không tự phục hồi token từ cache. |
|Nhiều tab | Mặc định session độc lập; logout ở tab A không revoke token tab B. Có thể duyệt BroadcastChannel chỉ truyền tín hiệu logout, không truyền token; chưa triển khai. |

Giữ source Frontend hiện hữu: [ket-noi-http](../../Frontend/src/thu-vien/api/ket-noi-http.js), [trinh-truy-van](../../Frontend/src/thu-vien/trinh-truy-van.js), [errors](../../Frontend/src/thu-vien/api/chuan-hoa-loi.js); không gắn policy phiên vào error utility global của FE05. FE06 cần tests cho pending/unverified/authenticated,403/401,expiry/races/cache isolation và browser thực.

## Quyết định cần duyệt

- Chấp nhận memory-only và login lại khi reload; không có remember-me ở scope đầu.
- Chọn logout riêng tab hoặc đồng bộ tín hiệu giữa các tab; Backend hiện không logout-all.
- Duyệt quy trình cung cấp môi trường/account/JWT riêng và điều kiện nghiệm thu thực tế; không dùng main DB để test login.
- Nếu cần persistence/cookie/refresh/revocation, giao task Backend/security riêng trước thay contract. Giữ HS256/issuer/audience/900giây và verify hiện tại; [RFC8725](https://www.rfc-editor.org/rfc/rfc8725) nêu nguyên tắc giới hạn thuật toán và xác minh JWT, không phải chỉ dẫn tự đổi thuật toán trong task này.
