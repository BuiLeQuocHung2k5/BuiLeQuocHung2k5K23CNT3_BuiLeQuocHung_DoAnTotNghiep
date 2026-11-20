# FE-05 — Query conventions

Xác minh 2026-11-20; implementation [truy-van-cong-khai.js](../src/chuc-nang/api-cong-khai/truy-van-cong-khai.js), [params](../src/chuc-nang/api-cong-khai/dich-vu-cong-khai.js), tests [query lifecycle](../src/chuc-nang/api-cong-khai/truy-van-cong-khai.test.jsx).

| Resource | Key |
| --- | --- |
| Nhóm public | `['public']` (prefix để lọc cache) |
| Health | `['public','health']` |
| Books | `['public','books',{page,limit,search}]` |
| Categories | `['public','categories',{page,limit,search}]` |

Key factory và service cùng canonical hóa defaults/trim/validation. Thứ tự field đầu vào không làm thay đổi dữ liệu key; các trang/search/resource khác nhau được tách biệt. Chỉ giữ params được phép; không URL ngẫu nhiên, Date, callback, token, credentials hoặc principal trong key. Không dùng tìm kiếm public để đưa PII/secret vào cache. Caller không sửa key trả về.

## Chính sách hiện tại

- Ba hook mặc định `enabled:false`. Caller có thể truyền `{enabled:true}` khi feature thực sự cần tải tự động; không gọi HTTP trong render. Với list, params là tham số thứ nhất, options là thứ hai; health chỉ nhận options.
- Trang kỹ thuật không enable tự động: nút gọi `refetch()`; mỗi resource độc lập, chặn click lặp khi fetching/paused hoặc cấu hình lỗi. Không mount polling, không interval.
- Public hooks: staleTime **30 giây**, gcTime **5 phút** sau không còn observer; retry **false**, refetchOnWindowFocus/OnReconnect/OnMount **false**. Cache chỉ trong bộ nhớ, không persistence. Cache có thể hiển thị khi quay lại route, nút kiểm tra gửi request mới dù cache còn fresh. Stale không đồng nghĩa đã xóa cache.
- QueryClientProvider hiện hữu tạo client ổn định; global queries staleTime0/retryfalse/focusfalse và mutationsretryfalse giữ nguyên. Không thêm cache/store toàn cục khác; QueryClient mặc định cũng hữu hạn.
- QueryFn nhận `({signal})` và chuyển xuống service/Axios. Không catch rồi trả lỗi dưới dạng data thành công; hook error là lỗi transport gốc.
- Hủy chính xác bằng key; unmount observer cuối cũng abort nhờ signal được sử dụng. Không retry/cảnh báo server khi người dùng hủy. Query paused theo trạng thái mạng có thể tiếp tục khi mạng trở lại nếu chưa hủy.

Ví dụ list hook: `useSachCongKhai({page:1,limit:10,search:''}, {enabled:false})`. Truy cập envelope bằng `query.data.data`, pagination bằng `query.data.data.pagination`; `query.data.status/headers` vẫn có. Tên `data` lặp phản ánh AxiosResponse bao Backend envelope, không phải flatten ngoài contract.

## Mở rộng sau FE-05

Chỉ thêm service/hook khi có feature và endpoint xác minh được. Query key phải chứa mọi public filter ảnh hưởng kết quả. Không bật protected request trước phiên auth hợp lệ; ranh giới Auth ở [architecture](FE05_API_ARCHITECTURE.md). Không coi prefix `public` là authorization.

Mutation nghiệp vụ chưa tồn tại ở FE-05. Nhiệm vụ sau cần quy định invalidation cụ thể theo resource, xử lý xung đột và session/cache isolation; không retry writes mặc định, không invalidate mọi cache hoặc optimistic update thiếu contract. Không thêm services giả cho các API còn thiếu.
