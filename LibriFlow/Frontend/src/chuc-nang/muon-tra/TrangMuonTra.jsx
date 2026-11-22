import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import TrangKhongCoQuyen from '../../trang/TrangKhongCoQuyen.jsx'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { The } from '../../thanh-phan/giao-dien/The.jsx'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import HopThoai from '../../thanh-phan/giao-dien/HopThoai.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import NhanTrangThai from '../../thanh-phan/giao-dien/NhanTrangThai.jsx'
import BieuMauMuon from './BieuMauMuon.jsx'
import ChiTietPhieuMuon from './ChiTietPhieuMuon.jsx'
import { trangThaiPhieu, maHopLe, khoaMuonTra, layDanhSachPhieu, layChiTietPhieu, taoPhieuMuon, traSach, loiMuonTra } from './dich-vu-muon-tra.js'
import '../../kieu-dang/muon-tra.css'

const vongDoi = { retry: false, staleTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false, networkMode: 'always' }
export default function TrangMuonTra({ title = 'Mượn / Trả sách' }) {
  const phien = useXacThuc()
  const trinhTruyVan = useQueryClient()
  const quyenQuanLy = coQuyenTruyCap(phien.nguoiDung, { quyen: ['borrow_manage'] })
  const quyenTra = coQuyenTruyCap(phien.nguoiDung, { quyen: ['return_process'] })
  const [thamSo, datThamSo] = useState({ page: 1, limit: 10 })
  const [loc, datLoc] = useState({ status: '', user_id: '' })
  const [loiLoc, datLoiLoc] = useState('')
  const [hopThoai, datHopThoai] = useState(null)
  const [loiGhi, datLoiGhi] = useState(null)
  const [dangGui, datDangGui] = useState(false)
  const yeuCau = useRef(null)
  useEffect(() => () => { yeuCau.current?.abort() }, [phien.tokenTruyCap])
  const danhSach = useQuery({ ...vongDoi, queryKey: [...khoaMuonTra, phien.nguoiDung?.user_id, 'danh-sach', thamSo],
    queryFn: ({ signal }) => layDanhSachPhieu(thamSo, phien, { signal }), enabled: quyenQuanLy && !moiTruong.error })
  const chiTiet = useQuery({ ...vongDoi, queryKey: [...khoaMuonTra, phien.nguoiDung?.user_id, 'chi-tiet', hopThoai?.ma],
    queryFn: ({ signal }) => layChiTietPhieu(hopThoai.ma, phien, { signal }), enabled: quyenQuanLy && Boolean(hopThoai?.ma) && !moiTruong.error })
  function taiLai() {
    for (const khoa of [khoaMuonTra, ['ban-sao'], ['sach'], ['public', 'books']]) void trinhTruyVan.invalidateQueries({ queryKey: khoa })
  }
  function dong() {
    if (yeuCau.current) return
    if (loiGhi?.chuaRo) taiLai()
    datHopThoai(null); datLoiGhi(null)
  }
  async function ghi(duLieu) {
    if (!hopThoai || yeuCau.current) return
    if (!quyenQuanLy || (hopThoai.loai === 'chi-tiet' && !quyenTra)) { datLoiGhi({ message: 'Bạn không có quyền thực hiện thao tác này.' }); return }
    const boDieuKhien = new AbortController()
    yeuCau.current = boDieuKhien; datDangGui(true); datLoiGhi(null)
    try {
      const phieu = hopThoai.loai === 'them' ? await taoPhieuMuon(duLieu, phien, { signal: boDieuKhien.signal }) : await traSach(hopThoai.ma, duLieu, phien, { signal: boDieuKhien.signal })
      if (boDieuKhien.signal.aborted) return
      taiLai()
      trinhTruyVan.setQueryData([...khoaMuonTra, phien.nguoiDung.user_id, 'chi-tiet', phieu.borrow_id], phieu)
      if (hopThoai.loai === 'them') { datThamSo({ page: 1, limit: 10 }); datLoc({ status: '', user_id: '' }) }
      toast.success(hopThoai.loai === 'them' ? 'Đã lập phiếu mượn.' : 'Đã ghi nhận trả sách.')
      datHopThoai(null)
    } catch (loi) {
      if (!boDieuKhien.signal.aborted) { const anToan = loiMuonTra(loi, true); if (!anToan.isCancelled) { datLoiGhi(anToan); toast.error(anToan.message) } }
    } finally {
      if (yeuCau.current === boDieuKhien) yeuCau.current = null
      if (!boDieuKhien.signal.aborted) datDangGui(false)
    }
  }
  function apDungLoc(e) {
    e.preventDefault()
    if (loc.user_id.trim() && !maHopLe(loc.user_id.trim())) { datLoiLoc('Mã độc giả không hợp lệ.'); return }
    datLoiLoc(''); datThamSo({ page: 1, limit: thamSo.limit, ...(loc.status ? { status: loc.status } : {}), ...(loc.user_id.trim() ? { user_id: loc.user_id.trim() } : {}) })
  }
  if (!quyenQuanLy) return <TrangKhongCoQuyen />
  const trang = danhSach.data?.pagination
  const cacCot = [
    { key: 'borrow_id', header: 'Mã phiếu', render: ma => `#${ma}` },
    { key: 'user_id', header: 'Độc giả', render: ma => phien.nguoiDung.user_id === ma ? `${phien.nguoiDung.name} (#${ma})` : `Độc giả #${ma}` },
    { key: 'borrow_date', header: 'Ngày mượn (UTC)' }, { key: 'due_date', header: 'Hạn trả (UTC)' },
    { key: 'status', header: 'Trạng thái', render: giaTri => <NhanTrangThai>{trangThaiPhieu[giaTri]}</NhanTrangThai> },
    { key: 'actions', header: 'Thao tác', render: (_, muc) => <NutBam size="sm" variant="outline" onClick={() => { datLoiGhi(null); datHopThoai({ loai: 'chi-tiet', ma: muc.borrow_id }) }}>Xem phiếu #{muc.borrow_id}</NutBam> },
  ]
  return <div className="app-page borrow-page">
    <div className="borrow-heading"><div className="app-page-intro"><p className="app-eyebrow">LƯU THÔNG THƯ VIỆN</p><h1>{title}</h1><p>Lập phiếu và ghi nhận trả theo từng bản sao.</p></div><NutBam disabled={Boolean(moiTruong.error)} onClick={() => { datLoiGhi(null); datHopThoai({ loai: 'them' }) }}>Lập phiếu mượn</NutBam></div>
    {moiTruong.error && <ThongBao variant="warning" title="Chưa cấu hình dịch vụ">Liên hệ người quản lý để kết nối dịch vụ mượn/trả.</ThongBao>}
    <The className="borrow-toolbar"><form className="borrow-search" onSubmit={apDungLoc}>
      <DanhSachChon label="Trạng thái phiếu" value={loc.status} onChange={e => datLoc(cu => ({ ...cu, status: e.target.value }))} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(trangThaiPhieu).map(([value, label]) => ({ value, label }))]} />
      <ONhap label="Lọc mã độc giả" value={loc.user_id} onChange={e => datLoc(cu => ({ ...cu, user_id: e.target.value }))} error={loiLoc} />
      <NutBam type="submit" disabled={Boolean(moiTruong.error)}>Áp dụng bộ lọc</NutBam><NutBam variant="ghost" onClick={() => { datLoc({ status: '', user_id: '' }); datLoiLoc(''); datThamSo({ page: 1, limit: 10 }) }}>Xóa bộ lọc</NutBam>
    </form></The>
    {!moiTruong.error && (danhSach.isError ? <ThongBao variant="error" role="alert" title="Chưa tải được phiếu mượn"><p>{loiMuonTra(danhSach.error).message}</p><NutBam onClick={() => void danhSach.refetch()}>Thử tải phiếu</NutBam></ThongBao> :
      <Bang columns={cacCot} rows={danhSach.data?.data ?? []} rowKey="borrow_id" caption="Danh sách phiếu mượn" loading={danhSach.isPending} emptyTitle="Chưa có phiếu phù hợp" emptyDescription="Thay đổi bộ lọc hoặc lập phiếu mới." />)}
    <div className="borrow-actions"><span>{trang ? `${trang.total} phiếu · Trang ${trang.page}/${Math.max(1, trang.totalPages)}` : 'Danh sách phiếu'}</span>
      <NutBam variant="outline" disabled={thamSo.page <= 1 || danhSach.isFetching} onClick={() => datThamSo(cu => ({ ...cu, page: cu.page - 1 }))}>Trang trước</NutBam>
      <NutBam variant="outline" disabled={!trang || thamSo.page >= trang.totalPages || danhSach.isFetching} onClick={() => datThamSo(cu => ({ ...cu, page: cu.page + 1 }))}>Trang sau</NutBam>
      <NutBam variant="ghost" disabled={Boolean(moiTruong.error) || danhSach.isFetching} onClick={() => void danhSach.refetch()}>Tải lại phiếu</NutBam></div>
    {hopThoai && <HopThoai open className="borrow-dialog" title={hopThoai.loai === 'them' ? 'Lập phiếu mượn' : `Phiếu mượn #${hopThoai.ma}`} description="Thao tác trên phiếu và bản sao thực tế của thư viện." onOpenChange={mo => { if (!mo) dong() }}>
      {loiGhi && <ThongBao variant="error" role="alert" title="Chưa hoàn tất thao tác">{loiGhi.message}</ThongBao>}
      {hopThoai.loai === 'them' ? <BieuMauMuon dangGui={dangGui} duQuyen={quyenQuanLy} loiServer={loiGhi} onSave={ghi} onCancel={dong} /> : chiTiet.isPending || chiTiet.isFetching ? <p role="status">Đang tải chi tiết…</p> : chiTiet.isError ?
        <ThongBao variant="error" role="alert" title="Chưa tải được chi tiết"><p>{loiMuonTra(chiTiet.error).message}</p><NutBam onClick={() => void chiTiet.refetch()}>Thử tải chi tiết</NutBam></ThongBao> : chiTiet.data && <ChiTietPhieuMuon key={`${hopThoai.ma}:${chiTiet.dataUpdatedAt}`} phieu={chiTiet.data} duQuyen={quyenTra} dangGui={dangGui} chuaRo={Boolean(loiGhi?.chuaRo)} onReturn={ghi} />}
      {hopThoai.loai === 'chi-tiet' && <div className="borrow-actions"><NutBam variant="outline" disabled={dangGui} onClick={dong}>{loiGhi?.chuaRo ? 'Đóng và tải lại' : 'Đóng phiếu'}</NutBam><NutBam variant="ghost" disabled={dangGui || Boolean(loiGhi?.chuaRo)} onClick={() => void chiTiet.refetch()}>Tải lại chi tiết</NutBam></div>}
    </HopThoai>}
  </div>
}
