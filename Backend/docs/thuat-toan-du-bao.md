# Baseline tần suất mượn — TASK-016

Xác minh source/SELECT: 2026-11-07. Nguồn: `utils/thuat-toan-du-bao.js`, `config/do-phu-du-bao.js`, `models/du-bao.model.js`; thiết kế mục tiêu tại `thiet-ke-du-lieu-du-bao.md`.

## Mục tiêu và công thức

`borrow_receipts_per_user_per_day`: số **phiếu mượn** PhieuMuon không cancelled của một người trong một ngày UTC. Đếm COUNT(*) trực tiếp từ PhieuMuon, không JOIN ChiTietPhieuMuon, không dùng login hoặc số bản sao. Một phiếu 3 bản sao vẫn là 1 lượt. Phiếu đã trả vẫn là lượt đã mượn.

Gọi D là ngày UTC hiện tại lấy từ MySQL. Chỉ dùng 7 ngày đã kết thúc D-7..D-1; không dùng phần dữ liệu D chưa hoàn tất. Baseline SMA7:

`m = (y[D-7] + ... + y[D-1]) / 7`

Dự báo cùng một kỳ vọng `round(m, 2)` cho **D+1..D+7**, tức ngày mai đến 7 ngày sau. Không dự báo ngày D trong response. Đây là lựa chọn bảo thủ: bỏ ngày hiện tại chưa đủ dữ liệu; có một ngày cách giữa ngày train cuối và ngày dự báo đầu.

ID giữ chuỗi BIGINT. Count đầu vào phải là số nguyên an toàn, 0..9.999.999.999; sai/NaN/Infinity/âm/trùng ngày/ngày tương lai trả insufficient_data. Cộng và làm tròn bằng BigInt: số phần trăm lượt = `(100 × tổng 7 count + 3) / 7` (chia nguyên), rồi định dạng 2 chữ số. Không có mức tiền, seed hoặc giá trị dự báo mặc định. predicted_count là chuỗi thập phân kỳ vọng, không phải khẳng định sẽ có đúng số nguyên lượt đó. `model_version=borrow_daily_sma7_v1` xác định đơn vị ngày/target/công thức này, không diễn giải các bản ghi legacy có version khác/null.

## Điều kiện đủ dữ liệu

- Người dùng tồn tại, active; có ít nhất 7 ngày đầy đủ sau khi tạo tài khoản. Nếu tạo giữa ngày, ngày tạo không đủ quan sát nên loại khỏi train; hoạt động hợp lệ trong ngày đó cũng không cộng vào SMA. Mốc tạo không hợp lệ hoặc có phiếu ở ngày trước ngày tạo thì từ chối dữ liệu.
- Có xác nhận phía server rằng toàn bộ nguồn PhieuMuon trong một khoảng liên tục là đầy đủ, không bị xóa/thiếu, có timezone UTC đã kiểm tra; khoảng đó bao trùm D-7..D-1. Cũng phải xác minh timezone của NguoiDung.created_at.
- Chỉ khi điều kiện trên đủ, ngày không có phiếu mới được tổng hợp thành 0. Một người chưa từng mượn có thể nhận 0.00 nếu đã tồn tại đủ lâu và **nguồn thực sự được xác nhận đầy đủ**. Nếu không có xác nhận thì trả insufficient_data, không tạo bảy số 0.
- Không suy ra coverage từ MIN/MAX ngày mượn, bảy ngày có bản ghi, số ngày login, ngày triển khai module, NODE_ENV hoặc query của client.

Nguồn hiện tại không có bảng/cột coverage. Provider `taoBoCungCapDoPhu()` mặc định trả chưa xác minh. Chỉ đọc file qua biến server `FORECAST_COVERAGE_FILE` nếu người vận hành đã audit thật; task không tạo file xác nhận hoặc sửa `.env`.

Hợp đồng file JSON (tối đa 16 KiB, không nhận trường ngoài danh sách):

| Trường | Điều kiện |
| --- | --- |
| verified, complete | Cả hai phải là true sau audit, không chỉ để bật UI |
| target | borrow_receipts_per_user_per_day |
| timezone, user_timestamps_timezone | UTC đã được xác minh |
| database_name, server_uuid | Khớp DATABASE()/@@server_uuid của kết nối thực tế |
| start_date, end_date | Ngày hợp lệ, liên tục, đã kết thúc; không có khoảng mất quan sát ở giữa |
| verified_at | UTC YYYY-MM-DDTHH:mm:ssZ, sau khi end_date kết thúc, không ở tương lai |
| evidence_ref | Tham chiếu biên bản kiểm tra có thật, không chứa bí mật |

Nên dùng đường dẫn tuyệt đối, chỉ người vận hành có quyền sửa file, không nhận file/upload/path từ client. File lỗi/thiếu/quá lớn/sai DB/server/timezone trả chưa xác minh; không in đường dẫn, bằng chứng, UUID hoặc nội dung file. Provider là cơ chế tiếp nhận xác nhận của người vận hành, **không tự chứng minh** dữ liệu đầy đủ bằng thuật toán. Nếu nguồn bị sửa/xóa/late-import sau audit phải rà lại xác nhận. Không tạo file verified=true với dữ liệu/bằng chứng giả. Xác nhận cũ thiếu ngày D-1 sẽ tự không đủ train cho ngày mới.

Các reason chính: COVERAGE_UNVERIFIED, INCOMPLETE_COVERAGE, USER_HISTORY_TOO_SHORT, USER_INACTIVE, INVALID_USER_CREATION_DATE, INVALID_HISTORY. Không đủ: predictions=[], MAE=null, persisted=false. Không fallback số mẫu trong API.

## Backtesting và MAE

Đọc tối đa 28 ngày đã kết thúc. Với phần lịch sử liên tục đã được xác nhận và người dùng đã tồn tại, chia các đoạn test 7 ngày không chồng lặp, đi lùi từ D-1. Mỗi fold: 7 ngày train → 1 ngày origin bị bỏ qua → 7 ngày test. Cách bỏ một ngày này khớp việc API bỏ ngày hiện tại D khi dự báo từ ngày mai.

`MAE = tổng |predicted_count - actual_borrow_count| / số ngày test`

Từ HOTFIX FORECAST-01 (23/11/2026), MAE dùng giá trị tổng 7 ngày chia 7 trước khi làm tròn để hiển thị. Train hoàn toàn trước test; test của fold trước có thể trở thành lịch sử của fold sau theo thời gian. Không đưa dữ liệu tương lai vào train. Response trả train_start/end, excluded_origin_date, test_start/end, sample_count và MAE từng fold/tổng. Ít nhất **15 ngày đã xác nhận** mới có 1 fold/7 mẫu; 28 ngày cho tối đa 2 fold/14 mẫu. Có 7 ngày train nhưng chưa đủ backtest vẫn được dự báo, còn evaluation.status=insufficient_data/MAE=null.

Fixture unit đã kiểm tra: train 2026-10-23..29 có 1 phiếu/ngày, bỏ 2026-10-30, test 2026-10-31..11-06 có 3 phiếu/ngày → MAE=2. Fixture hằng số 28 ngày → 14 mẫu test/MAE=0. **Đây là kiểm chứng công thức bằng dữ liệu giả lập trong test, không phải chất lượng trên người dùng thật.**

Ngày 2026-11-07 SELECT thực tế: 0 người dùng, 0 phiếu không cancelled, 0 dự báo. Chưa có coverage được xác nhận hoặc môi trường integration độc lập, nên không có train/test thực tế hay MAE thực tế hợp lệ.

## Giới hạn

Baseline phẳng không mô hình hóa thứ trong tuần, mùa vụ, lịch nghỉ, xu hướng hoặc cold start. Không có khoảng tin cậy hay cam kết chính xác. Tần suất thưa có thể làm tròn về 0.00, khác việc tạo số 0 khi thiếu quan sát.

PhieuMuon không có lịch sử thay đổi cancelled hoặc snapshot as-of; backtest dùng trạng thái lịch sử đang thấy tại lần đọc, chưa chứng minh tái dựng point-in-time khi dữ liệu từng sửa. Độ phủ, múi giờ legacy, retention, mất dữ liệu và tải SQL cần kiểm chứng trên môi trường test độc lập trước dùng vận hành. Bản demo đối soát và gia hạn độ phủ khi khởi động. API lưu và đọc kết quả được mô tả trong [hợp đồng dự báo](du-bao-api.md).
