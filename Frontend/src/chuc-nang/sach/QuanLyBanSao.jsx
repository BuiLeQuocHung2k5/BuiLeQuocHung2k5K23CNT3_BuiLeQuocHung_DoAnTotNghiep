import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import VungNhap from '../../thanh-phan/giao-dien/VungNhap.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import NhanTrangThai from '../../thanh-phan/giao-dien/NhanTrangThai.jsx'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import { khoaSach } from './dich-vu-sach.js'
import { khoaBanSao, layBanSaoTheoSach, ghiBanSao, kiemTraBieuMauBanSao, loiBanSaoAnToan, tinhTrangBanSao, trangThaiBanSao } from './dich-vu-ban-sao.js'

function BieuMauBanSao({ banSao, maSach, dangGui, duQuyen, loiServer, onSave: luu, onCancel: huy }) {
  const [giaTri, datGiaTri] = useState(() => ({ book_id: maSach, barcode: banSao?.barcode ?? '', condition_status: banSao?.condition_status ?? 'good', availability_status: banSao?.availability_status ?? 'available', note: null }))
  const [loi, datLoi] = useState({})
  const [xacNhanGhiChu, datXacNhan] = useState(false)
  const khoa = dangGui || !duQuyen || loiServer?.chuaRo
  const doi = (truong, giaTriMoi) => { datGiaTri(cu => ({ ...cu, [truong]: giaTriMoi })); datLoi(cu => ({ ...cu, [truong]: undefined })) }
  const loiTruong = truong => loi[truong] ?? loiServer?.loiTruong?.[truong]
  function gui(suKien) {
    suKien.preventDefault()
    if (khoa || (banSao && !xacNhanGhiChu)) return
    const ketQua = kiemTraBieuMauBanSao(giaTri)
    datLoi(ketQua.loi)
    if (!Object.keys(ketQua.loi).length) void luu(ketQua.duLieu)
  }
  return <form className="book-form copy-editor" aria-label={banSao ? 'Sửa bản sao' : 'Thêm bản sao'} onSubmit={gui} noValidate aria-busy={dangGui}>
    <h4>{banSao ? `Sửa bản sao #${banSao.copy_id}` : 'Thêm bản sao mới'}</h4>
    {!duQuyen && <ThongBao variant="warning" title="Không đủ quyền">Bạn không có quyền lưu bản sao.</ThongBao>}
    <div className="book-form-grid">
      <ONhap label="Mã vạch" required autoFocus value={giaTri.barcode} disabled={khoa} onChange={suKien => doi('barcode', suKien.target.value)} error={loiTruong('barcode')} />
      <DanhSachChon label="Tình trạng bản sao" value={giaTri.condition_status} disabled={khoa} options={Object.entries(tinhTrangBanSao).map(([value, label]) => ({ value, label }))} onChange={suKien => doi('condition_status', suKien.target.value)} error={loiTruong('condition_status')} />
      <DanhSachChon label="Trạng thái bản sao" value={giaTri.availability_status} disabled={khoa} options={['available', 'maintenance'].map(value => ({ value, label: trangThaiBanSao[value] }))} onChange={suKien => doi('availability_status', suKien.target.value)} error={loiTruong('availability_status')} />
      <div className="book-form-wide"><VungNhap label={banSao ? 'Ghi chú thay thế' : 'Ghi chú nội bộ'} value={giaTri.note ?? ''} disabled={khoa} onChange={suKien => doi('note', suKien.target.value)} error={loiTruong('note')} /></div>
    </div>
    {banSao && <label className="copy-note-confirm"><input type="checkbox" checked={xacNhanGhiChu} disabled={khoa} onChange={suKien => datXacNhan(suKien.target.checked)} /><span>Ghi chú hiện tại không xem được. Tôi đồng ý thay thế ghi chú cũ bằng nội dung trên; để trống sẽ xóa ghi chú cũ.</span></label>}
    <div className="book-form-actions"><NutBam variant="outline" disabled={dangGui} onClick={huy}>{loiServer?.chuaRo ? 'Đóng và tải lại' : 'Hủy'}</NutBam><NutBam type="submit" loading={dangGui} disabled={khoa || (Boolean(banSao) && !xacNhanGhiChu)}>{banSao ? 'Lưu bản sao' : 'Thêm bản sao'}</NutBam></div>
  </form>
}

export default function QuanLyBanSao({ maSach, onBusyChange: baoDangGui }) {
  const phien = useXacThuc()
  const client = useQueryClient()
  const [trang, datTrang] = useState(1)
  const [thaoTac, datThaoTac] = useState(null)
  const [loi, datLoi] = useState(null)
  const [dangGui, datDangGui] = useState(false)
  const yeuCau = useRef(null)
  useEffect(() => () => { yeuCau.current?.abort() }, [phien.tokenTruyCap])
  useEffect(() => { baoDangGui(dangGui); return () => baoDangGui(false) }, [dangGui, baoDangGui])
  const duQuyen = coQuyenTruyCap(phien.nguoiDung, { quyen: ['copy_manage'] })
  const danhSach = useQuery({ queryKey: [...khoaBanSao(maSach), trang], queryFn: ({ signal }) => layBanSaoTheoSach(maSach, { page: trang, limit: 10 }, { signal }), retry: false, staleTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false, networkMode: 'always' })
  const cacBanSao = danhSach.data?.data?.data ?? []
  const phanTrang = danhSach.data?.data?.pagination
  function taiLai() {
    void client.invalidateQueries({ queryKey: khoaBanSao(maSach) })
    void client.invalidateQueries({ queryKey: khoaSach.all })
  }
  function mo(loai, banSao) { if (!duQuyen || yeuCau.current) return; datLoi(null); datThaoTac({ loai, banSao }) }
  function dong() { if (yeuCau.current) return; if (loi?.chuaRo) taiLai(); datThaoTac(null); datLoi(null) }
  async function luu(giaTri) {
    if (!thaoTac || yeuCau.current || loi?.chuaRo) return
    if (!duQuyen) { datLoi({ message: 'Bạn không có quyền quản lý bản sao.' }); return }
    const boDieuKhien = new AbortController()
    yeuCau.current = boDieuKhien; datDangGui(true); datLoi(null)
    try {
      await ghiBanSao(thaoTac.loai, thaoTac.banSao?.copy_id, giaTri, phien, { signal: boDieuKhien.signal })
      if (boDieuKhien.signal.aborted) return
      taiLai()
      if (thaoTac.loai === 'them') datTrang(1)
      if (thaoTac.loai === 'xoa' && cacBanSao.length === 1 && trang > 1) datTrang(trang - 1)
      toast.success(thaoTac.loai === 'them' ? 'Đã thêm bản sao.' : thaoTac.loai === 'sua' ? 'Đã lưu bản sao.' : 'Đã xóa bản sao.')
      datThaoTac(null)
    } catch (loiGhi) {
      if (boDieuKhien.signal.aborted) return
      const anToan = loiBanSaoAnToan(loiGhi, true)
      if (!anToan.isCancelled) { datLoi(anToan); toast.error(anToan.message) }
    } finally {
      if (yeuCau.current === boDieuKhien) yeuCau.current = null
      if (!boDieuKhien.signal.aborted) datDangGui(false)
    }
  }
  const cacCot = [
    { key: 'copy_id', header: 'Mã bản sao' }, { key: 'barcode', header: 'Mã vạch' },
    { key: 'condition_status', header: 'Tình trạng', render: giaTri => tinhTrangBanSao[giaTri] },
    { key: 'availability_status', header: 'Trạng thái', render: giaTri => <NhanTrangThai>{trangThaiBanSao[giaTri]}</NhanTrangThai> },
    ...(duQuyen ? [{ key: 'actions', header: 'Thao tác', render: (_, hang) => ['available', 'maintenance'].includes(hang.availability_status) ? <div className="book-row-actions"><NutBam size="sm" variant="ghost" disabled={Boolean(thaoTac)} onClick={() => mo('sua', hang)} aria-label={`Sửa bản sao ${hang.barcode}`}>Sửa</NutBam><NutBam size="sm" variant="danger" disabled={Boolean(thaoTac)} onClick={() => mo('xoa', hang)} aria-label={`Xóa bản sao ${hang.barcode}`}>Xóa</NutBam></div> : <span className="ui-helper">Chỉ xem</span> }] : []),
  ]
  return <section className="copy-section" aria-label="Bản sao của đầu sách">
    <div className="book-heading"><div><h3>Bản sao sách</h3><p className="ui-helper">Theo dõi từng cuốn sách trong kho.</p></div>{duQuyen && <NutBam variant="outline" disabled={Boolean(thaoTac) || danhSach.isError} onClick={() => mo('them')}>Thêm bản sao</NutBam>}</div>
    {danhSach.isError ? <ThongBao variant="error" role="alert" title="Chưa tải được bản sao"><p>{loiBanSaoAnToan(danhSach.error).message}</p><NutBam variant="outline" onClick={() => void danhSach.refetch()}>Thử tải bản sao</NutBam></ThongBao> : <Bang columns={cacCot} rows={cacBanSao} rowKey="copy_id" caption="Danh sách bản sao" loading={danhSach.isPending} emptyTitle="Chưa có bản sao" emptyDescription="Đầu sách chưa có bản sao trong kho." />}
    <div className="book-pagination"><span>{phanTrang ? `${phanTrang.total} bản sao · ` : ''}Trang {trang} / {Math.max(1, phanTrang?.totalPages ?? 1)}</span><NutBam variant="outline" size="sm" disabled={trang <= 1 || danhSach.isFetching || Boolean(thaoTac)} onClick={() => datTrang(trang - 1)}>Bản sao trước</NutBam><NutBam variant="outline" size="sm" disabled={!phanTrang || trang >= phanTrang.totalPages || danhSach.isFetching || Boolean(thaoTac)} onClick={() => datTrang(trang + 1)}>Bản sao sau</NutBam><NutBam variant="ghost" size="sm" disabled={danhSach.isFetching || Boolean(thaoTac)} onClick={() => void danhSach.refetch()}>Tải lại bản sao</NutBam>{trang > 1 && !cacBanSao.length && !danhSach.isPending && <NutBam variant="ghost" disabled={Boolean(thaoTac)} onClick={() => datTrang(1)}>Về trang bản sao đầu</NutBam>}</div>
    {thaoTac && <div className="copy-operation">
      {loi && <ThongBao variant="error" role="alert" title="Chưa hoàn tất thao tác bản sao">{loi.message}</ThongBao>}
      {thaoTac.loai === 'xoa' ? <div className="book-delete copy-editor"><h4>Xóa bản sao {thaoTac.banSao.barcode}?</h4><p>Thao tác không thể hoàn tác. Bản sao có lịch sử mượn hoặc sử dụng sẽ không thể xóa.</p><div className="book-form-actions"><NutBam variant="outline" disabled={dangGui} onClick={dong}>{loi?.chuaRo ? 'Đóng và tải lại' : 'Hủy'}</NutBam><NutBam variant="danger" loading={dangGui} disabled={!duQuyen || loi?.chuaRo} onClick={() => void luu()}>Xác nhận xóa bản sao</NutBam></div></div> : <BieuMauBanSao key={thaoTac.banSao?.copy_id ?? 'moi'} banSao={thaoTac.banSao} maSach={maSach} dangGui={dangGui} duQuyen={duQuyen} loiServer={loi} onSave={luu} onCancel={dong} />}
    </div>}
  </section>
}
