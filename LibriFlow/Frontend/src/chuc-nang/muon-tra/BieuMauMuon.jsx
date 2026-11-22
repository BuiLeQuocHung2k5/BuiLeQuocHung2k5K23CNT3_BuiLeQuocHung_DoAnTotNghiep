import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import VungNhap from '../../thanh-phan/giao-dien/VungNhap.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import AnhBiaSach from '../sach/AnhBiaSach.jsx'
import { layDanhSachSach, khoaSach } from '../sach/dich-vu-sach.js'
import { layBanSaoTheoSach } from '../sach/dich-vu-ban-sao.js'
import { kiemTraPhieuMuon } from './dich-vu-muon-tra.js'

export default function BieuMauMuon({ dangGui, duQuyen, loiServer, onSave, onCancel }) {
  const [maDocGia, datMaDocGia] = useState('')
  const [hanTra, datHanTra] = useState('')
  const [ghiChu, datGhiChu] = useState('')
  const [tuKhoa, datTuKhoa] = useState('')
  const [thamSo, datThamSo] = useState({ page: 1, limit: 10, search: '' })
  const [sach, datSach] = useState(null)
  const [trangBanSao, datTrangBanSao] = useState(1)
  const [daChon, datDaChon] = useState([])
  const [loi, datLoi] = useState({})
  const [xemLai, datXemLai] = useState(null)
  const khoa = dangGui || !duQuyen || Boolean(loiServer?.chuaRo)
  const danhSach = useQuery({ queryKey: khoaSach.danhSach(thamSo), queryFn: ({ signal }) => layDanhSachSach(thamSo, { signal }), retry: false })
  const cacSach = danhSach.data?.data?.data ?? []
  const cacBanSao = useQuery({ queryKey: ['ban-sao', sach?.book_id, 'cho-muon', trangBanSao],
    queryFn: ({ signal }) => layBanSaoTheoSach(sach.book_id, { page: trangBanSao, limit: 20, availability_status: 'available', condition_status: 'good' }, { signal }), enabled: Boolean(sach), retry: false })
  const banSao = cacBanSao.data?.data?.data ?? []
  const loiTruong = { ...loiServer?.loiTruong, ...loi }
  function timSach() {
    if (!tuKhoa.isWellFormed() || [...tuKhoa.trim()].length > 255) { datLoi({ tim: 'Từ khóa tối đa 255 ký tự hợp lệ.' }); return }
    datLoi({}); datThamSo(cu => ({ ...cu, page: 1, search: tuKhoa.trim() }))
  }
  function xemTruoc(suKien) {
    suKien.preventDefault()
    const ngay = new Date(hanTra)
    const duLieu = { user_id: maDocGia.trim(), copy_ids: daChon.map(m => m.copy_id), due_date: Number.isFinite(ngay.getTime()) ? ngay.toISOString().replace(/\.\d{3}Z$/, 'Z') : '', note: ghiChu || null }
    const cacLoi = kiemTraPhieuMuon(duLieu)
    datLoi(cacLoi)
    if (!Object.keys(cacLoi).length) datXemLai(duLieu)
  }
  if (xemLai) return <section aria-label="Xem lại phiếu mượn" className="borrow-form">
    <h3>Xem lại trước khi lập phiếu</h3><p>Độc giả #{xemLai.user_id}</p><p>Hạn trả (UTC): {xemLai.due_date}</p>
    <ul>{daChon.map(m => <li key={m.copy_id}>{m.title} — {m.barcode} (bản sao #{m.copy_id})</li>)}</ul>
    {xemLai.note && <p className="borrow-note">Ghi chú: {xemLai.note}</p>}
    <p>Backend sẽ kiểm tra độc giả hoạt động và khả năng mượn của tất cả bản sao khi xác nhận.</p>
    <div className="borrow-actions"><NutBam variant="outline" disabled={khoa} onClick={() => datXemLai(null)}>Chỉnh sửa</NutBam>
      <NutBam loading={dangGui} disabled={khoa} onClick={() => onSave(xemLai)}>Xác nhận lập phiếu</NutBam>
      <NutBam variant="ghost" disabled={dangGui} onClick={onCancel}>{loiServer?.chuaRo ? 'Đóng và tải lại' : 'Hủy'}</NutBam></div>
  </section>
  return <form className="borrow-form" aria-label="Lập phiếu mượn" onSubmit={xemTruoc} noValidate>
    <fieldset disabled={khoa}>
      <ONhap label="Mã độc giả" value={maDocGia} onChange={e => datMaDocGia(e.target.value)} error={loiTruong.user_id} required helperText="Nhập mã độc giả thực tế. Hiện chưa có dịch vụ tra cứu tên độc giả." />
      <ONhap label="Hạn trả" type="datetime-local" value={hanTra} onChange={e => datHanTra(e.target.value)} error={loiTruong.due_date} required helperText="Nhập theo giờ máy của bạn; hệ thống chuyển sang UTC khi gửi." />
      <VungNhap label="Ghi chú phiếu" value={ghiChu} onChange={e => datGhiChu(e.target.value)} error={loiTruong.note} />
      <h3>Chọn đầu sách và bản sao</h3>
      <div className="borrow-search"><ONhap label="Tìm đầu sách" value={tuKhoa} onChange={e => datTuKhoa(e.target.value)} error={loi.tim} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); timSach() } }} />
        <NutBam variant="outline" onClick={timSach}>Tìm đầu sách</NutBam></div>
      {danhSach.isPending && <p role="status">Đang tải đầu sách…</p>}
      {danhSach.isSuccess && !cacSach.length && <p>Không tìm thấy đầu sách phù hợp.</p>}
      {danhSach.isError && <ThongBao variant="error" title="Chưa tải được đầu sách"><NutBam onClick={() => void danhSach.refetch()}>Thử tải đầu sách</NutBam></ThongBao>}
      <DanhSachChon label="Đầu sách" value={sach?.book_id ?? ''} options={[{ value: '', label: 'Chọn một đầu sách' }, ...cacSach.map(m => ({ value: m.book_id, label: `${m.title} — ${m.author} (#${m.book_id})` }))]}
        onChange={e => { datSach(cacSach.find(m => m.book_id === e.target.value) ?? null); datTrangBanSao(1) }} />
      <div className="borrow-actions"><NutBam variant="ghost" disabled={thamSo.page <= 1 || danhSach.isFetching} onClick={() => datThamSo(cu => ({ ...cu, page: cu.page - 1 }))}>Đầu sách trước</NutBam>
        <NutBam variant="ghost" disabled={!danhSach.data || thamSo.page >= danhSach.data.data.pagination.totalPages || danhSach.isFetching} onClick={() => datThamSo(cu => ({ ...cu, page: cu.page + 1 }))}>Đầu sách sau</NutBam></div>
      {sach && <div className="borrow-book"><AnhBiaSach sach={sach} /><div><strong>{sach.title}</strong><p>{sach.author}</p></div></div>}
      {sach && <section aria-label="Bản sao có thể mượn">
        {cacBanSao.isPending ? <p role="status">Đang tải bản sao…</p> : cacBanSao.isError ? <ThongBao variant="error" title="Chưa tải được bản sao"><NutBam onClick={() => void cacBanSao.refetch()}>Thử tải bản sao</NutBam></ThongBao> : <>
          {!banSao.length && <p>Không có bản sao tốt và sẵn sàng trong kết quả này.</p>}
          {banSao.map(m => <div className="borrow-copy" key={m.copy_id}><span>{m.barcode} — bản sao #{m.copy_id}</span><NutBam size="sm" variant="outline" disabled={daChon.some(c => c.copy_id === m.copy_id) || daChon.length >= 100 || m.condition_status !== 'good' || m.availability_status !== 'available'}
            onClick={() => datDaChon(cu => [...cu, { ...m, title: sach.title }])}>Chọn {m.barcode}</NutBam></div>)}
          <div className="borrow-actions"><NutBam variant="ghost" disabled={trangBanSao <= 1 || cacBanSao.isFetching} onClick={() => datTrangBanSao(cu => cu - 1)}>Bản sao trước</NutBam>
            <NutBam variant="ghost" disabled={trangBanSao >= (cacBanSao.data?.data?.pagination.totalPages ?? 0) || cacBanSao.isFetching} onClick={() => datTrangBanSao(cu => cu + 1)}>Bản sao sau</NutBam></div>
        </>}
      </section>}
      <h3>Đã chọn {daChon.length}/100 bản sao</h3>
      {daChon.map(m => <div className="borrow-copy" key={m.copy_id}><span>{m.title} — {m.barcode} (#{m.copy_id})</span><NutBam variant="ghost" onClick={() => datDaChon(cu => cu.filter(c => c.copy_id !== m.copy_id))}>Bỏ {m.barcode}</NutBam></div>)}
      {loiTruong.copy_ids && <p role="alert">{loiTruong.copy_ids}</p>}
    </fieldset>
    <div className="borrow-actions"><NutBam type="submit" disabled={khoa}>Xem lại phiếu</NutBam><NutBam variant="outline" disabled={dangGui} onClick={onCancel}>Hủy</NutBam></div>
  </form>
}
