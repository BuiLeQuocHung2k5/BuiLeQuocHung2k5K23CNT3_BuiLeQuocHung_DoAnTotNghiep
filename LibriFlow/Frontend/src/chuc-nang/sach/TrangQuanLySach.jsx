import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'
import HopThoai from '../../thanh-phan/giao-dien/HopThoai.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import NhanTrangThai from '../../thanh-phan/giao-dien/NhanTrangThai.jsx'
import KhungCho from '../../thanh-phan/giao-dien/KhungCho.jsx'
import BieuTuong from '../../thanh-phan/giao-dien/BieuTuong.jsx'
import { The } from '../../thanh-phan/giao-dien/The.jsx'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import { useDanhMucCongKhai } from '../api-cong-khai/truy-van-cong-khai.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { khoaSach, layDanhSachSach, layChiTietSach, luuSach, xoaSach, loiSachAnToan } from './dich-vu-sach.js'
import BieuMauSach from './BieuMauSach.jsx'
import QuanLyBanSao from './QuanLyBanSao.jsx'
import AnhBiaSach from './AnhBiaSach.jsx'
import '../../kieu-dang/sach.css'

const QUYEN_THAO_TAC = { them: 'book_create', sua: 'book_update', xoa: 'book_delete' }
const vongDoiDoc = { retry: false, staleTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false, networkMode: 'always' }

function NoiDungChiTietSach({ sach, tenTheLoai }) {
  const cacTruong = [['Mã sách', sach.book_id], ['ISBN', sach.isbn ?? '—'], ['Tác giả', sach.author], ['Thể loại', tenTheLoai(sach.category_id)],
    ['Nhà xuất bản', sach.publisher ?? '—'], ['Năm xuất bản', sach.publication_year ?? '—'], ['Mã bộ sách', sach.series_id ?? '—']]
  return <div className="book-detail"><AnhBiaSach sach={sach} size="chi-tiet" /><h2>{sach.title}</h2>
    <dl>{cacTruong.map(([nhan, giaTri]) => <div key={nhan}><dt>{nhan}</dt><dd>{giaTri}</dd></div>)}</dl>
    <h3>Mô tả</h3><p className="book-description">{sach.description ?? 'Chưa có mô tả.'}</p>
  </div>
}

export default function TrangQuanLySach({ title }) {
  const [truyVanUrl, datTruyVanUrl] = useSearchParams()
  const phien = useXacThuc()
  const trinhTruyVan = useQueryClient()
  const [thamSo, datThamSo] = useState({ page: 1, limit: 10, search: '' })
  const [tuKhoa, datTuKhoa] = useState('')
  const [loiTim, datLoiTim] = useState('')
  const [hopThoai, datHopThoai] = useState(() => truyVanUrl.get('sach') ? { loai: 'chi-tiet', ma: truyVanUrl.get('sach') } : null)
  const [dangGui, datDangGui] = useState(false)
  const [dangGhiBanSao, datDangGhiBanSao] = useState(false)
  const [loiThaoTac, datLoiThaoTac] = useState(null)
  const yeuCauGhi = useRef(null)
  useEffect(() => () => { yeuCauGhi.current?.abort() }, [phien.tokenTruyCap])

  const danhSach = useQuery({ ...vongDoiDoc, queryKey: khoaSach.danhSach(thamSo), queryFn: ({ signal }) => layDanhSachSach(thamSo, { signal }), enabled: !moiTruong.error })
  const danhMuc = useDanhMucCongKhai({ page: 1, limit: 100 }, { enabled: !moiTruong.error })
  const canChiTiet = Boolean(hopThoai?.ma && ['chi-tiet', 'sua'].includes(hopThoai.loai))
  const chiTiet = useQuery({ ...vongDoiDoc, queryKey: khoaSach.chiTiet(hopThoai?.ma ?? ''), queryFn: ({ signal }) => layChiTietSach(hopThoai.ma, { signal }), enabled: canChiTiet && !moiTruong.error })
  const noiDung = danhSach.data?.data
  const cacSach = noiDung?.data ?? []
  const sach = chiTiet.data?.data?.data
  const phanTrang = noiDung?.pagination
  const cacDanhMuc = Array.isArray(danhMuc.data?.data?.data) ? danhMuc.data.data.data.filter(muc => muc && typeof muc.category_id === 'string' && typeof muc.name === 'string') : []
  const tenTheLoai = ma => ma === null ? 'Chưa phân loại' : cacDanhMuc.find(muc => muc.category_id === ma && typeof muc.name === 'string')?.name ?? `Thể loại #${ma}`
  const coQuyen = loai => coQuyenTruyCap(phien.nguoiDung, { quyen: [QUYEN_THAO_TAC[loai]] })
  const duQuyenHopThoai = !hopThoai || hopThoai.loai === 'chi-tiet' || coQuyen(hopThoai.loai)

  function capNhatDanhSach() {
    void trinhTruyVan.invalidateQueries({ queryKey: khoaSach.all })
    void trinhTruyVan.invalidateQueries({ queryKey: ['public', 'books'] })
  }
  function moHopThoai(loai, hang) {
    if (yeuCauGhi.current || (loai !== 'chi-tiet' && !coQuyen(loai))) return
    datLoiThaoTac(null)
    datHopThoai({ loai, ma: hang?.book_id, sach: hang })
  }
  function dongHopThoai() {
    if (yeuCauGhi.current || dangGhiBanSao) return
    if (truyVanUrl.has('sach')) datTruyVanUrl(cu => { const moi = new URLSearchParams(cu); moi.delete('sach'); return moi }, { replace: true })
    if (loiThaoTac?.chuaRo) capNhatDanhSach()
    datHopThoai(null); datLoiThaoTac(null)
  }
  async function thucHienGhi(giaTri) {
    if (!hopThoai || yeuCauGhi.current) return
    if (!coQuyen(hopThoai.loai)) { datLoiThaoTac({ message: 'Bạn không có quyền thực hiện thao tác này.', loiTruong: {} }); return }
    const boDieuKhien = new AbortController()
    yeuCauGhi.current = boDieuKhien
    datDangGui(true); datLoiThaoTac(null)
    try {
      if (hopThoai.loai === 'xoa') await xoaSach(hopThoai.ma, phien, { signal: boDieuKhien.signal })
      else await luuSach(hopThoai.loai === 'them' ? null : hopThoai.ma, giaTri, phien, { signal: boDieuKhien.signal })
      if (boDieuKhien.signal.aborted) return
      capNhatDanhSach()
      if (hopThoai.loai === 'them') { datTuKhoa(''); datThamSo(cu => ({ ...cu, page: 1, search: '' })) }
      if (hopThoai.loai === 'xoa') {
        trinhTruyVan.removeQueries({ queryKey: khoaSach.chiTiet(hopThoai.ma), exact: true })
        if (cacSach.length === 1 && thamSo.page > 1) datThamSo(cu => ({ ...cu, page: cu.page - 1 }))
      }
      toast.success(hopThoai.loai === 'them' ? 'Đã thêm sách.' : hopThoai.loai === 'sua' ? 'Đã lưu thay đổi.' : 'Đã xóa sách.')
      datHopThoai(null)
    } catch (loi) {
      if (boDieuKhien.signal.aborted) return
      const anToan = loiSachAnToan(loi, true)
      if (!anToan.isCancelled) { datLoiThaoTac(anToan); toast.error(anToan.message) }
    } finally {
      if (yeuCauGhi.current === boDieuKhien) yeuCauGhi.current = null
      if (!boDieuKhien.signal.aborted) datDangGui(false)
    }
  }
  function timKiem(suKien) {
    suKien.preventDefault()
    if (!tuKhoa.isWellFormed() || [...tuKhoa.trim()].length > 255) { datLoiTim('Từ khóa tối đa 255 ký tự Unicode hợp lệ.'); return }
    datLoiTim(''); datThamSo(cu => ({ ...cu, search: tuKhoa.trim(), page: 1 }))
  }
  function noiDungHopThoai() {
    if (!hopThoai) return null
    if (hopThoai.loai === 'them') return <BieuMauSach dangGui={dangGui} duQuyen={duQuyenHopThoai} loiServer={loiThaoTac} onSave={thucHienGhi} onCancel={dongHopThoai} />
    if (hopThoai.loai === 'xoa') return <div className="book-delete">
      <p>Bạn có chắc muốn xóa <strong>{hopThoai.sach.title}</strong> (mã {hopThoai.ma})?</p>
      <p>Thao tác không thể hoàn tác. Sách có bản sao hoặc dữ liệu liên quan sẽ bị từ chối xóa.</p>
      <div className="book-form-actions"><NutBam variant="outline" onClick={dongHopThoai} disabled={dangGui}>{loiThaoTac?.chuaRo ? 'Đóng và tải lại' : 'Hủy'}</NutBam>
        <NutBam variant="danger" loading={dangGui} disabled={!duQuyenHopThoai || loiThaoTac?.chuaRo} onClick={() => void thucHienGhi()}>Xác nhận xóa</NutBam></div>
    </div>
    if (chiTiet.isPending || (hopThoai.loai === 'sua' && chiTiet.isFetching)) return <div role="status" aria-label="Đang tải thông tin sách"><KhungCho variant="text" /><KhungCho variant="text" /></div>
    if (chiTiet.isError) return <ThongBao variant="error" role="alert" title="Chưa tải được thông tin sách"><p>{loiSachAnToan(chiTiet.error).message}</p><NutBam variant="outline" onClick={() => void chiTiet.refetch()}>Thử tải chi tiết</NutBam></ThongBao>
    if (!sach) return null
    if (hopThoai.loai === 'sua') return <BieuMauSach key={sach.book_id} sach={sach} dangGui={dangGui} duQuyen={duQuyenHopThoai} loiServer={loiThaoTac} onSave={thucHienGhi} onCancel={dongHopThoai} />
    return <><NoiDungChiTietSach sach={sach} tenTheLoai={tenTheLoai} /><QuanLyBanSao key={sach.book_id} maSach={sach.book_id} onBusyChange={datDangGhiBanSao} /></>
  }
  const cacCot = [
    { key: 'title', header: 'Tên sách', render: (ten, hang) => <div className="book-title-cell"><AnhBiaSach sach={hang} /><div><button className="book-title-button" onClick={() => moHopThoai('chi-tiet', hang)}>{ten}</button><span className="book-record-id">Mã: {hang.book_id}</span></div></div> },
    { key: 'author', header: 'Tác giả' },
    { key: 'category_id', header: 'Thể loại', render: tenTheLoai },
    { key: 'publisher', header: 'Nhà xuất bản', render: giaTri => giaTri ?? '—' },
    { key: 'publication_year', header: 'Năm', render: giaTri => giaTri ?? '—' },
    { key: 'actions', header: 'Thao tác', render: (_, hang) => <div className="book-row-actions">
      <NutBam variant="ghost" size="sm" onClick={() => moHopThoai('chi-tiet', hang)} aria-label={`Xem chi tiết ${hang.title}`}>Chi tiết</NutBam>
      {coQuyen('sua') && <NutBam variant="ghost" size="sm" onClick={() => moHopThoai('sua', hang)} aria-label={`Sửa ${hang.title}`}>Sửa</NutBam>}
      {coQuyen('xoa') && <NutBam variant="danger" size="sm" onClick={() => moHopThoai('xoa', hang)} aria-label={`Xóa ${hang.title}`}>Xóa</NutBam>}
    </div> },
  ]
  return <div className="app-page book-page">
    <div className="book-heading"><div className="app-page-intro"><p className="app-eyebrow">THƯ VIỆN LIBRIFLOW</p><h1>{title ?? 'Quản lý sách'}</h1><p>Tra cứu đầu sách và chăm chút danh mục của thư viện.</p></div>{coQuyen('them') && <NutBam disabled={Boolean(moiTruong.error)} icon={<BieuTuong icon={Plus} />} onClick={() => moHopThoai('them')}>Thêm sách</NutBam>}</div>
    {moiTruong.error && <ThongBao variant="warning" title="Chưa cấu hình dịch vụ sách">Vui lòng liên hệ người quản lý hệ thống để kết nối dịch vụ.</ThongBao>}
    <The className="book-toolbar"><form onSubmit={timKiem} className="book-search" aria-label="Tìm sách">
      <ONhap label="Tìm kiếm sách" placeholder="Tên sách, tác giả hoặc nhà xuất bản" value={tuKhoa} onChange={suKien => datTuKhoa(suKien.target.value)} error={loiTim} />
      <NutBam type="submit" disabled={Boolean(moiTruong.error)} icon={<BieuTuong icon={Search} />}>Tìm kiếm</NutBam>
      <NutBam variant="outline" onClick={() => { datTuKhoa(''); datLoiTim(''); datThamSo(cu => ({ ...cu, search: '', page: 1 })) }} disabled={!tuKhoa && !thamSo.search}>Xóa tìm kiếm</NutBam>
    </form><DanhSachChon label="Số sách mỗi trang" value={String(thamSo.limit)} options={[10, 20, 50].map(so => ({ value: String(so), label: `${so} sách` }))} onChange={suKien => datThamSo(cu => ({ ...cu, limit: Number(suKien.target.value), page: 1 }))} /></The>
    {!moiTruong.error && (danhSach.isError ? <ThongBao variant="error" role="alert" title="Chưa tải được sách"><p>{loiSachAnToan(danhSach.error).message}</p><NutBam variant="outline" onClick={() => void danhSach.refetch()}>Thử lại</NutBam></ThongBao> : <The>
      <Bang columns={cacCot} rows={cacSach} rowKey="book_id" caption="Danh sách sách" loading={danhSach.isPending && !moiTruong.error} emptyTitle={thamSo.search ? 'Không tìm thấy sách phù hợp' : 'Chưa có sách'} emptyDescription="Thử từ khóa khác hoặc tải lại danh sách." />
    </The>)}
    <div className="book-pagination"><NhanTrangThai>{phanTrang ? `${phanTrang.total} đầu sách` : 'Danh mục sách'}</NhanTrangThai><span>Trang {thamSo.page}{phanTrang ? ` / ${Math.max(1, phanTrang.totalPages)}` : ''}</span>
      <NutBam variant="outline" size="sm" disabled={thamSo.page <= 1 || danhSach.isFetching} onClick={() => datThamSo(cu => ({ ...cu, page: cu.page - 1 }))}>Trang trước</NutBam>
      <NutBam variant="outline" size="sm" disabled={!phanTrang || thamSo.page >= phanTrang.totalPages || danhSach.isFetching} onClick={() => datThamSo(cu => ({ ...cu, page: cu.page + 1 }))}>Trang sau</NutBam>
      {thamSo.page > 1 && cacSach.length === 0 && !danhSach.isPending && <NutBam variant="ghost" onClick={() => datThamSo(cu => ({ ...cu, page: 1 }))}>Về trang đầu</NutBam>}
      <NutBam variant="ghost" disabled={danhSach.isFetching || Boolean(moiTruong.error)} onClick={() => void danhSach.refetch()}>Tải lại danh sách</NutBam>
    </div>
    {hopThoai && <HopThoai open onOpenChange={mo => { if (!mo) dongHopThoai() }} className={`book-dialog${hopThoai.loai === 'chi-tiet' ? ' book-inventory-dialog' : ''}`} title={{ them: 'Thêm sách', sua: 'Sửa sách', xoa: 'Xác nhận xóa sách', 'chi-tiet': 'Chi tiết sách' }[hopThoai.loai]} description={hopThoai.loai === 'xoa' ? 'Xóa vĩnh viễn đầu sách khỏi thư viện.' : 'Thông tin đầu sách trong thư viện.'}>
      {loiThaoTac && <ThongBao variant="error" role="alert" title="Chưa hoàn tất thao tác">{loiThaoTac.message}</ThongBao>}
      {noiDungHopThoai()}
    </HopThoai>}
  </div>
}
