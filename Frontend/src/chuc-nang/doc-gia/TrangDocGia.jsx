import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { The, DauThe, TieuDeThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import { layPhieuCaNhan } from './du-lieu-doc-gia.js'
import { loiMuonTra } from '../muon-tra/dich-vu-muon-tra.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import '../../kieu-dang/doc-gia.css'

export default function TrangDocGia() {
  const phien = useXacThuc()
  const tongQuan = useQuery({ queryKey: ['doc-gia', phien.nguoiDung?.user_id, phien.nguoiDung?.permissions, 'tong-quan'],
    queryFn: async ({ signal }) => {
      const [ganDay, ...dangMuon] = await Promise.all([
        layPhieuCaNhan(phien, { limit: 5 }, { signal }),
        ...['borrowed', 'partially_returned', 'overdue'].map(status => layPhieuCaNhan(phien, { limit: 1, status }, { signal })),
      ])
      return { ganDay, conMuon: dangMuon.reduce((tong, muc) => tong + muc.pagination.total, 0), quaHan: dangMuon[2].pagination.total }
    }, enabled: Boolean(phien.daDangNhap) && !moiTruong.error, retry: false, staleTime: 0, refetchOnWindowFocus: false })
  const toiHan = tongQuan.data?.ganDay.data.filter(phieu => {
    const han = Date.parse(`${phieu.due_date.replace(' ', 'T')}Z`)
    return ['borrowed', 'partially_returned', 'overdue'].includes(phieu.status) && han >= tongQuan.dataUpdatedAt && han <= tongQuan.dataUpdatedAt + 7 * 86400000
  }) ?? []
  return <div className="app-page reader-page">
    <div className="app-page-intro"><p className="app-eyebrow">GÓC ĐỘC GIẢ</p><h1>Xin chào, {phien.nguoiDung?.name}</h1><p>Tra cứu sách và theo dõi những phiếu mượn của bạn.</p></div>
    <The><DauThe><TieuDeThe>Tài khoản của bạn</TieuDeThe></DauThe><NoiDungThe><p>{phien.nguoiDung?.email}</p><Link className="app-text-link" to="/app/tai-khoan">Xem thông tin tài khoản</Link></NoiDungThe></The>
    <nav className="reader-shortcuts" aria-label="Lối tắt độc giả"><Link to="/app/sach" className="app-text-link">Tra cứu sách</Link><Link to="/app/lich-su-muon" className="app-text-link">Sách đang mượn và lịch sử</Link><Link to="/app/tai-khoan" className="app-text-link">Tài khoản</Link></nav>
    {moiTruong.error ? <ThongBao variant="warning" title="Chưa kết nối dịch vụ">Chưa thể tải thông tin mượn cá nhân.</ThongBao> : tongQuan.isPending ? <p role="status">Đang tải tổng quan cá nhân…</p> : tongQuan.isError ?
      <ThongBao variant="error" role="alert" title="Chưa tải được tổng quan"><p>{loiMuonTra(tongQuan.error).message}</p><NutBam onClick={() => void tongQuan.refetch()}>Thử tải tổng quan</NutBam></ThongBao> : tongQuan.data && <>
        <div className="reader-summary">{[['Phiếu còn sách chưa trả', tongQuan.data.conMuon], ['Phiếu quá hạn theo Backend', tongQuan.data.quaHan], ['Tổng phiếu cá nhân', tongQuan.data.ganDay.pagination.total]].map(([nhan, so]) => <The key={nhan}><DauThe><TieuDeThe>{nhan}</TieuDeThe></DauThe><NoiDungThe><strong className="reader-count">{so}</strong></NoiDungThe></The>)}</div>
        <The><DauThe><TieuDeThe>Hạn trả trong 7 ngày tới</TieuDeThe></DauThe><NoiDungThe><p>Trong 5 phiếu gần đây, tính theo giờ UTC; xem lịch sử để duyệt đầy đủ.</p>
          {toiHan.length ? <ul>{toiHan.map(phieu => <li key={phieu.borrow_id}>Phiếu #{phieu.borrow_id} — hạn trả {phieu.due_date} (UTC)</li>)}</ul> : <p>Không có phiếu sắp đến hạn trong nhóm phiếu này.</p>}
          <Link to="/app/lich-su-muon" className="app-text-link">Xem tất cả phiếu của tôi</Link></NoiDungThe></The>
      </>}
  </div>
}
