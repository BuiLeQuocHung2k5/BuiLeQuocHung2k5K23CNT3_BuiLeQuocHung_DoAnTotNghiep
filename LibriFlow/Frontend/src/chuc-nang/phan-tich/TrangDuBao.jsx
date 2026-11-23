import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { maHopLe } from '../muon-tra/dich-vu-muon-tra.js'
import { The, DauThe, TieuDeThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import { layDuBao, layChuoiMuon, loiPhanTich } from './dich-vu-phan-tich.js'
import '../../kieu-dang/phan-tich.css'

const lyDoThieu = {
  COVERAGE_UNVERIFIED: 'Chưa xác minh được lịch sử liên tục và đầy đủ.', INCOMPLETE_COVERAGE: 'Độ phủ chưa đủ 7 ngày huấn luyện hoàn chỉnh.',
  USER_HISTORY_TOO_SHORT: 'Tài khoản chưa có đủ 7 ngày lịch sử hoàn chỉnh.', USER_INACTIVE: 'Tài khoản không ở trạng thái hoạt động.',
  INVALID_HISTORY: 'Dữ liệu lịch sử chưa hợp lệ để dự báo.', INVALID_USER_CREATION_DATE: 'Chưa xác định được ngày tạo tài khoản hợp lệ.',
  INVALID_CUTOFF: 'Chưa xác định được ngày cắt dữ liệu hợp lệ.',
}
function BieuDoDuBao({ duBao, lichSu }) {
  const cacDuBao = duBao.predictions.map(m => ({ ngay: m.forecast_date, so: Number(m.predicted_count) }))
  const cacNgayCu = lichSu.map(m => ({ ngay: m.period_start, so: m.borrow_count }))
  const tatCa = [...cacNgayCu, ...cacDuBao]
  const dau = Date.parse(tatCa[0].ngay), cuoi = Date.parse(tatCa.at(-1).ngay)
  const toiDa = Math.max(1, ...tatCa.map(m => m.so))
  const x = m => 64 + (Date.parse(m.ngay) - dau) / Math.max(86400000, cuoi - dau) * 700
  const y = m => 235 - m.so / toiDa * 185
  function veDuong(cacDiem) {
    return cacDiem.map((m, i) => `${i && Date.parse(m.ngay) - Date.parse(cacDiem[i - 1].ngay) === 86400000 ? 'L' : 'M'}${x(m)},${y(m)}`).join(' ')
  }
  return <figure className="forecast-figure"><figcaption>Phiếu mượn/người/ngày · trục thời gian UTC</figcaption>
    <p className="analytics-legend"><span>━━ Lịch sử thực tế (nếu được cung cấp)</span><span className="forecast-label">┄┄ Dự báo SMA7</span></p>
    <svg viewBox="0 0 820 290" role="img" aria-label="Biểu đồ lịch sử và dự báo, hai đường tách biệt; không nối qua ngày thiếu">
      <path className="forecast-axis" d="M64 40V235H764" /><text x="14" y="56">{toiDa}</text><text x="40" y="239">0</text>
      <text x="64" y="267">{tatCa[0].ngay}</text><text x="764" y="267" textAnchor="end">{tatCa.at(-1).ngay}</text>
      <path className="forecast-history" d={veDuong(cacNgayCu)} /><path className="forecast-prediction" d={veDuong(cacDuBao)} />
      {cacNgayCu.map(m => <circle className="forecast-history-point" key={m.ngay} cx={x(m)} cy={y(m)} r="4"><title>{m.ngay}: {m.so} phiếu thực tế</title></circle>)}
      {cacDuBao.map(m => <circle className="forecast-prediction-point" key={m.ngay} cx={x(m)} cy={y(m)} r="4"><title>{m.ngay}: {m.so} phiếu dự báo</title></circle>)}
    </svg>
    <p>Lịch sử và dự báo là hai chuỗi độc lập. Không nối qua ngày không có dữ liệu hoặc nối từ lịch sử sang tương lai.</p>
  </figure>
}
export default function TrangDuBao() {
  const phien = useXacThuc()
  const [maNhap, datMaNhap] = useState('')
  const [ma, datMa] = useState('')
  const [loi, datLoi] = useState('')
  const duocXem = coQuyenTruyCap(phien.nguoiDung, { quyen: ['forecast_view'] })
  const duocDocLichSu = coQuyenTruyCap(phien.nguoiDung, { quyen: ['report_view'] })
  const duBao = useQuery({ queryKey: ['phan-tich', phien.nguoiDung?.user_id, 'du-bao', ma], queryFn: ({ signal }) => layDuBao(phien, ma, { signal }), enabled: phien.daDangNhap && duocXem && !moiTruong.error, retry: false, staleTime: 0, refetchOnWindowFocus: false })
  const duLieu = duBao.data
  const lichSu = useQuery({ queryKey: ['phan-tich', phien.nguoiDung?.user_id, 'lich-su-du-bao', duLieu?.user_id, duLieu?.cutoff_date],
    queryFn: ({ signal }) => layChuoiMuon(phien, { start_date: duLieu.training.start_date, end_date: duLieu.training.end_date, group_by: 'day', user_id: duLieu.user_id }, { signal }),
    enabled: Boolean(duLieu?.status === 'ready' && duocDocLichSu && duocXem) && !duBao.isError && !moiTruong.error, retry: false, staleTime: 0, refetchOnWindowFocus: false })
  function chonNguoiDung(e) { e.preventDefault(); const moi = maNhap.trim(); if (moi && !maHopLe(moi)) { datLoi('Nhập mã người dùng hợp lệ hoặc để trống để xem của tôi.'); return } datLoi(''); if (moi === ma) void duBao.refetch(); else datMa(moi) }
  return <div className="app-page"><div className="app-page-intro"><p className="app-eyebrow">DỰ BÁO TẦN SUẤT</p><h1>Dự báo tần suất người dùng</h1><p>Số phiếu mượn không hủy/người/ngày, không phải số bản sao hay số lượt đến thư viện.</p></div>
    <The className="analytics-filter"><form onSubmit={chonNguoiDung}><ONhap label="Mã người dùng dự báo" value={maNhap} onChange={e => datMaNhap(e.target.value)} helperText="Để trống để xem của tôi. Chỉ nhập mã thực tế đã biết; hiện chưa có dịch vụ tra cứu tên người dùng." error={loi} /><NutBam type="submit" disabled={Boolean(moiTruong.error) || duBao.isFetching}>Xem dự báo</NutBam></form></The>
    {moiTruong.error ? <ThongBao variant="warning" title="Chưa kết nối dịch vụ dự báo">Chưa thể xem dữ liệu.</ThongBao> : duBao.isError ? <ThongBao variant="error" role="alert" title="Chưa tải được dự báo"><p>{loiPhanTich(duBao.error)}</p><NutBam onClick={() => void duBao.refetch()}>Thử tải dự báo</NutBam></ThongBao> : duBao.isPending ? <p role="status">Đang tải dự báo…</p> : duLieu && <>
      <The><DauThe><TieuDeThe as="h2">{duLieu.user_id === phien.nguoiDung.user_id ? `Dự báo của tôi — ${phien.nguoiDung.name}` : `Người dùng #${duLieu.user_id}`}</TieuDeThe></DauThe><NoiDungThe>
        <p>Ngày cắt dữ liệu: {duLieu.cutoff_date} (UTC). Phương pháp: trung bình trượt 7 ngày (SMA7).</p><p>Bản xem trước từ Backend, chưa lưu. Hiện chưa hỗ trợ tạo/lưu kết quả dự báo.</p>
        {duLieu.status === 'insufficient_data' ? <ThongBao variant="warning" title="Chưa đủ điều kiện dự báo">{lyDoThieu[duLieu.reason] ?? 'Backend chưa đủ dữ liệu hợp lệ để dự báo.'} Không có giá trị dự báo để hiển thị.</ThongBao> : <>
          <p>Cơ sở huấn luyện: {duLieu.training.start_date} – {duLieu.training.end_date}, {duLieu.training.observed_days} ngày hoàn chỉnh, tổng {duLieu.training.borrow_count} phiếu. Bỏ ngày cắt chưa kết thúc; dự báo 7 ngày từ hôm sau.</p>
          {!duocDocLichSu && <p>Chưa có quyền xem chuỗi lịch sử thống kê; chỉ hiển thị tổng huấn luyện mà API dự báo cung cấp.</p>}
          {duocDocLichSu && (lichSu.isFetching ? <p role="status">Đang tải chuỗi lịch sử…</p> : lichSu.isError ? <ThongBao variant="warning" title="Chưa tải được chuỗi lịch sử"><p>{loiPhanTich(lichSu.error)}</p><NutBam onClick={() => void lichSu.refetch()}>Thử tải lịch sử dự báo</NutBam></ThongBao> : <p>Chỉ vẽ các ngày lịch sử Backend trả về; không tự điền ngày thiếu bằng số 0.</p>)}
          <BieuDoDuBao duBao={duLieu} lichSu={duocDocLichSu && !lichSu.isError ? lichSu.data?.data ?? [] : []} />
          <Bang caption="Kết quả dự báo từ Backend" rows={duLieu.predictions} rowKey="forecast_date" columns={[{ key: 'forecast_date', header: 'Ngày dự báo (UTC)' }, { key: 'predicted_count', header: 'Số phiếu dự kiến/ngày' }]} />
          {duocDocLichSu && lichSu.isSuccess && <Bang caption="Lịch sử phiếu mượn thực tế" rows={lichSu.data.data} rowKey="period_start" columns={[{ key: 'period_start', header: 'Ngày (UTC)' }, { key: 'borrow_count', header: 'Số phiếu thực tế' }]} emptyTitle="API chưa trả ngày phát sinh trong khoảng huấn luyện" />}
        </>}
      </NoiDungThe></The>
      <The><DauThe><TieuDeThe as="h2">Đánh giá và giới hạn</TieuDeThe></DauThe><NoiDungThe>
        {duLieu.evaluation.status === 'evaluated' ? <p>MAE: {duLieu.evaluation.mae} phiếu/ngày, trên {duLieu.evaluation.sample_count} mẫu; đánh giá theo các khối thời gian 7 ngày, bỏ ngày gốc giữa huấn luyện và kiểm tra.</p> : <p>Chưa đủ dữ liệu đánh giá MAE; không có tỷ lệ chính xác được xác nhận.</p>}
        <p>Giá trị là mức ước lượng trung bình, có thể là số thập phân. Không bảo đảm nhu cầu thực tế sẽ đúng bằng dự báo. Ngày cắt, lịch sử và độ phủ do Backend quyết định.</p>
      </NoiDungThe></The>
    </>}
  </div>
}
