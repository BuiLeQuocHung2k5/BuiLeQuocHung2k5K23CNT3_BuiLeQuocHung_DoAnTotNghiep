import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import HopThoai from '../../thanh-phan/giao-dien/HopThoai.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import NhanTrangThai from '../../thanh-phan/giao-dien/NhanTrangThai.jsx'
import ChiTietPhieuMuon from '../muon-tra/ChiTietPhieuMuon.jsx'
import { trangThaiPhieu, loiMuonTra } from '../muon-tra/dich-vu-muon-tra.js'
import { layPhieuCaNhan, layChiTietCaNhan } from './du-lieu-doc-gia.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import '../../kieu-dang/doc-gia.css'
import '../../kieu-dang/muon-tra.css'

const vongDoi = { retry: false, staleTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false }
export default function TrangLichSuMuon() {
  const phien = useXacThuc()
  const [thamSo, datThamSo] = useState({ page: 1, limit: 10, status: '' })
  const [ma, datMa] = useState(null)
  const khoaPhien = ['doc-gia', phien.nguoiDung?.user_id, phien.nguoiDung?.permissions]
  const danhSach = useQuery({ ...vongDoi, queryKey: [...khoaPhien, 'lich-su', thamSo], queryFn: ({ signal }) => layPhieuCaNhan(phien, thamSo, { signal }), enabled: phien.daDangNhap && !moiTruong.error })
  const chiTiet = useQuery({ ...vongDoi, queryKey: [...khoaPhien, 'chi-tiet', ma], queryFn: ({ signal }) => layChiTietCaNhan(ma, phien, { signal }), enabled: Boolean(ma) && phien.daDangNhap && !moiTruong.error })
  const trang = danhSach.data?.pagination
  const cacCot = [
    { key: 'borrow_id', header: 'Mã phiếu', render: giaTri => `#${giaTri}` },
    { key: 'borrow_date', header: 'Ngày mượn (UTC)' }, { key: 'due_date', header: 'Hạn trả (UTC)' },
    { key: 'status', header: 'Trạng thái', render: giaTri => <NhanTrangThai>{trangThaiPhieu[giaTri]}</NhanTrangThai> },
    { key: 'actions', header: 'Chi tiết', render: (_, phieu) => <NutBam variant="outline" size="sm" onClick={() => datMa(phieu.borrow_id)}>Xem phiếu #{phieu.borrow_id}</NutBam> },
  ]
  return <div className="app-page reader-page"><div className="app-page-intro"><p className="app-eyebrow">PHIẾU MƯỢN CỦA TÔI</p><h1>Sách đang mượn và lịch sử</h1><p>Thông tin phiếu và tình trạng trả từng bản sao của tài khoản hiện tại.</p></div>
    <div className="reader-shortcuts"><DanhSachChon label="Trạng thái phiếu cá nhân" value={thamSo.status} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(trangThaiPhieu).map(([value, label]) => ({ value, label }))]} onChange={e => datThamSo(cu => ({ ...cu, page: 1, status: e.target.value }))} />
      <NutBam variant="ghost" onClick={() => datThamSo({ page: 1, limit: 10, status: '' })}>Xem tất cả trạng thái</NutBam></div>
    {moiTruong.error ? <ThongBao variant="warning" title="Chưa kết nối dịch vụ">Chưa thể tải phiếu cá nhân.</ThongBao> : danhSach.isError ? <ThongBao variant="error" role="alert" title="Chưa tải được lịch sử"><p>{loiMuonTra(danhSach.error).message}</p><NutBam onClick={() => void danhSach.refetch()}>Thử tải lịch sử</NutBam></ThongBao> :
      <Bang caption="Phiếu mượn cá nhân" columns={cacCot} rows={danhSach.data?.data ?? []} rowKey="borrow_id" loading={danhSach.isPending} emptyTitle="Chưa có phiếu mượn phù hợp" emptyDescription="Bạn có thể đổi trạng thái lọc hoặc tra cứu sách trong thư viện." />}
    <div className="reader-shortcuts"><span>{trang ? `${trang.total} phiếu · Trang ${trang.page}/${Math.max(1, trang.totalPages)}` : 'Lịch sử cá nhân'}</span>
      <NutBam variant="outline" disabled={thamSo.page <= 1 || danhSach.isFetching} onClick={() => datThamSo(cu => ({ ...cu, page: cu.page - 1 }))}>Trang trước</NutBam>
      <NutBam variant="outline" disabled={!trang || thamSo.page >= trang.totalPages || danhSach.isFetching} onClick={() => datThamSo(cu => ({ ...cu, page: cu.page + 1 }))}>Trang sau</NutBam>
      <NutBam variant="ghost" disabled={danhSach.isFetching || Boolean(moiTruong.error)} onClick={() => void danhSach.refetch()}>Tải lại lịch sử</NutBam></div>
    {ma && <HopThoai open className="reader-detail-dialog" title={`Phiếu mượn #${ma}`} description="Chi tiết phiếu mượn cá nhân, chỉ xem." onOpenChange={mo => { if (!mo) datMa(null) }}>
      {chiTiet.isPending || chiTiet.isFetching ? <p role="status">Đang tải chi tiết…</p> : chiTiet.isError ? <ThongBao variant="error" role="alert" title="Chưa tải được phiếu"><p>{loiMuonTra(chiTiet.error).message}</p><NutBam onClick={() => void chiTiet.refetch()}>Thử tải phiếu cá nhân</NutBam></ThongBao> : chiTiet.data && <ChiTietPhieuMuon phieu={chiTiet.data} duQuyen={false} dangGui={false} chuaRo={false} />}
      <NutBam variant="outline" onClick={() => datMa(null)}>Đóng phiếu</NutBam>
    </HopThoai>}
  </div>
}
