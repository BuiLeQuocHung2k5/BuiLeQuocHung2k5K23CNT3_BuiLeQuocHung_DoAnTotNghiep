import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { The, DauThe, TieuDeThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import { cacChiSo, khoangNgayMacDinh, loiBoLoc, layTongQuanThongKe, layChuoiMuon, loiPhanTich } from './dich-vu-phan-tich.js'
import '../../kieu-dang/phan-tich.css'

function BieuDoMuon({ cacDong }) {
  if (!cacDong.length) return <p>Không có kỳ phát sinh trong kết quả. Không bổ sung kỳ thiếu bằng số 0.</p>
  const toiDa = Math.max(1, ...cacDong.flatMap(m => [m.borrow_count, m.borrowed_copy_count]))
  return <><p className="analytics-legend"><span>■ Số phiếu</span><span className="analytics-copy-label">▨ Số bản sao</span></p>
    <div className="analytics-bars" role="img" aria-label="Biểu đồ số phiếu và bản sao theo thời gian; số liệu chi tiết ở bảng bên dưới">
      {cacDong.map(m => <div className="analytics-bar-row" key={m.period_start}><span>{m.period_start}</span><div>
        <div className="analytics-bar-track"><span className="analytics-bar" style={{ width: `${m.borrow_count / toiDa * 100}%` }} /><b>{m.borrow_count} phiếu</b></div>
        <div className="analytics-bar-track"><span className="analytics-bar analytics-bar--copies" style={{ width: `${m.borrowed_copy_count / toiDa * 100}%` }} /><b>{m.borrowed_copy_count} bản sao</b></div>
      </div></div>)}
    </div><p>Thang đo chung: 0–{toiDa} lượt. Các kỳ không có trong phản hồi không được hiểu là số 0.</p></>
}
export default function TrangThongKe() {
  const phien = useXacThuc()
  const [boLoc, datBoLoc] = useState(khoangNgayMacDinh)
  const [thamSo, datThamSo] = useState(boLoc)
  const [loi, datLoi] = useState('')
  const thongKe = useQuery({ queryKey: ['phan-tich', phien.nguoiDung?.user_id, 'thong-ke', thamSo],
    queryFn: async ({ signal }) => { const [tong, chuoi] = await Promise.all([layTongQuanThongKe(phien, thamSo, { signal }), layChuoiMuon(phien, thamSo, { signal })]); return { tong, chuoi } },
    enabled: phien.daDangNhap && coQuyenTruyCap(phien.nguoiDung, { quyen: ['report_view'] }) && !moiTruong.error, retry: false, staleTime: 0, refetchOnWindowFocus: false })
  const duLieu = thongKe.data
  function apDung(e) { e.preventDefault(); const moi = { ...boLoc, user_id: boLoc.user_id.trim() }; const thongBao = loiBoLoc(moi); datLoi(thongBao); if (!thongBao) datThamSo(moi) }
  return <div className="app-page"><div className="app-page-intro"><p className="app-eyebrow">SỐ LIỆU THƯ VIỆN</p><h1>Thống kê</h1><p>Phân biệt số phiếu mượn và số bản sao; tất cả khoảng ngày theo UTC.</p></div>
    <The className="analytics-filter"><form onSubmit={apDung}><ONhap label="Từ ngày (UTC)" type="date" value={boLoc.start_date} onChange={e => datBoLoc(cu => ({ ...cu, start_date: e.target.value }))} /><ONhap label="Đến ngày (UTC)" type="date" value={boLoc.end_date} onChange={e => datBoLoc(cu => ({ ...cu, end_date: e.target.value }))} />
      <DanhSachChon label="Nhóm theo" value={boLoc.group_by} options={[{ value: 'day', label: 'Ngày' }, { value: 'week', label: 'Tuần (thứ Hai)' }, { value: 'month', label: 'Tháng' }]} onChange={e => datBoLoc(cu => ({ ...cu, group_by: e.target.value }))} />
      <ONhap label="Mã người dùng (chỉ chuỗi mượn)" value={boLoc.user_id} onChange={e => datBoLoc(cu => ({ ...cu, user_id: e.target.value }))} /><NutBam type="submit" disabled={Boolean(moiTruong.error)}>Áp dụng bộ lọc</NutBam></form>
      {loi && <p role="alert">{loi}</p>}</The>
    {moiTruong.error ? <ThongBao variant="warning" title="Chưa kết nối dịch vụ thống kê">Chưa thể tải số liệu.</ThongBao> : thongKe.isError ? <ThongBao variant="error" role="alert" title="Chưa tải được thống kê"><p>{loiPhanTich(thongKe.error)}</p><NutBam onClick={() => void thongKe.refetch()}>Thử tải thống kê</NutBam></ThongBao> : thongKe.isPending ? <p role="status">Đang tải thống kê…</p> : duLieu && <>
      <section aria-label="Các số tổng"><h2>Số tổng hiện tại / mọi thời gian</h2><p>Bộ lọc ngày không thay đổi tồn kho, tổng tài khoản và tổng phiếu không hủy.</p><div className="analytics-cards">{cacChiSo.slice(0, 4).map(([khoa, nhan]) => <The key={khoa}><DauThe><TieuDeThe>{nhan}</TieuDeThe></DauThe><NoiDungThe><strong>{duLieu.tong.data[khoa]}</strong></NoiDungThe></The>)}</div></section>
      <section aria-label="Số liệu trong kỳ"><h2>Trong kỳ {duLieu.tong.period.start_date} – {duLieu.tong.period.end_date} (UTC)</h2><div className="analytics-cards">{cacChiSo.slice(4).map(([khoa, nhan]) => <The key={khoa}><DauThe><TieuDeThe>{nhan}</TieuDeThe></DauThe><NoiDungThe><strong>{duLieu.tong.data[khoa]}</strong></NoiDungThe></The>)}</div><p>Số mượn theo ngày mượn; số trả theo ngày trả. Không suy thành số lượt đến thư viện.</p></section>
      <The><DauThe><TieuDeThe as="h2">Phiếu và bản sao theo thời gian</TieuDeThe></DauThe><NoiDungThe><p>{duLieu.chuoi.period.start_date} – {duLieu.chuoi.period.end_date} · UTC · {thamSo.user_id ? `Người dùng #${thamSo.user_id}` : 'Tất cả người dùng'}</p>
        <BieuDoMuon cacDong={duLieu.chuoi.data} /><p>Tuần bắt đầu thứ Hai; kỳ đầu/cuối có thể chỉ gồm một phần tuần/tháng trong bộ lọc.</p>
        <Bang caption="Số liệu biểu đồ mượn" rowKey="period_start" rows={duLieu.chuoi.data} columns={[{ key: 'period_start', header: 'Kỳ (UTC)' }, { key: 'borrow_count', header: 'Số phiếu' }, { key: 'borrowed_copy_count', header: 'Số bản sao' }]} emptyTitle="Không có kỳ phát sinh" />
      </NoiDungThe></The></>}
  </div>
}
