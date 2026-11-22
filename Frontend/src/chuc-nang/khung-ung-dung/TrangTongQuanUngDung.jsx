import { Link } from 'react-router'
import BieuTuong from '../../thanh-phan/giao-dien/BieuTuong.jsx'
import { The, DauThe, TieuDeThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import { cacTrangTrongKhung } from '../../ung-dung/dinh-tuyen/cau-hinh-tuyen.js'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'

const loiTat = {
  books: 'Tra cứu đầu sách và bản sao',
  borrows: 'Lập phiếu hoặc ghi nhận trả sách',
  reader: 'Xem các phiếu và hạn trả của tôi',
  admin: 'Mở tổng quan quản trị',
}

export default function TrangTongQuanUngDung({ title }) {
  const { nguoiDung } = useXacThuc()
  const cacTrang = cacTrangTrongKhung.filter(trang => loiTat[trang.id] && coQuyenTruyCap(nguoiDung, trang.yeuCauTruyCap))
  return <div className="app-page">
    <div className="app-page-intro"><h1>{title}</h1></div>
    <div className="app-overview-grid">{cacTrang.map(trang =>
      <The key={trang.id}><DauThe><BieuTuong icon={trang.icon} size={24} /><TieuDeThe as="h2" className="mt-4">{trang.title}</TieuDeThe></DauThe>
        <NoiDungThe><Link className="app-text-link" to={trang.to}>{loiTat[trang.id]}</Link></NoiDungThe></The>)}</div>
  </div>
}
