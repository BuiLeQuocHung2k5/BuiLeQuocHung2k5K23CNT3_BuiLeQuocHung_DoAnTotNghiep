import { Link } from 'react-router'
import { ArrowUpRight, Blocks, LayoutTemplate, SquareDashed } from 'lucide-react'
import NhanTrangThai from "../../thanh-phan/giao-dien/NhanTrangThai.jsx"
import BieuTuong from "../../thanh-phan/giao-dien/BieuTuong.jsx"
import { The, DauThe, TieuDeThe, MoTaThe, NoiDungThe } from "../../thanh-phan/giao-dien/The.jsx"
import { cacTrangTrongKhung } from "../../ung-dung/dinh-tuyen/cau-hinh-tuyen.js"

export default function TrangTongQuanUngDung({ title }) {
  return (
    <div className="app-page">
      <div className="app-page-intro">
        <p className="app-eyebrow">Nền tảng giao diện / FE-04</p>
        <h1>{title}</h1>
        <p>Một không gian rõ ràng để các chức năng tìm được vị trí của mình.</p>
      </div>
      <section className="app-welcome" aria-labelledby="welcome-title">
        <div><NhanTrangThai>Application Shell</NhanTrangThai><h2 id="welcome-title">Bố cục đã sẵn sàng.<br />Trải nghiệm sẽ tiếp nối.</h2><p>Sidebar, header và vùng nội dung cùng chia sẻ một cấu trúc. Đây là khung điều hướng kỹ thuật, chưa phải Dashboard hay chức năng thư viện.</p></div>
        <div className="app-shell-illustration" aria-hidden="true"><div className="app-mini-sidebar"><span /><span /><span /><span /></div><div className="app-mini-main"><span className="app-mini-header" /><div><span /><span /><span /></div></div></div>
      </section>
      <div className="app-overview-grid">
        <The><DauThe><BieuTuong icon={Blocks} size={24} /><TieuDeThe as="h2" className="mt-4">Một khung, nhiều ngữ cảnh</TieuDeThe><MoTaThe>App Shell dùng chung cho các màn hình tương lai.</MoTaThe></DauThe><NoiDungThe><p className="app-muted">Nội dung được đặt trong Outlet; bố cục không phụ thuộc Backend, tài khoản hay dữ liệu nghiệp vụ.</p></NoiDungThe></The>
        <The><DauThe><BieuTuong icon={LayoutTemplate} size={24} /><TieuDeThe as="h2" className="mt-4">Cấu hình có thể mở rộng</TieuDeThe><MoTaThe>Admin, Librarian và Reader chỉ là các bố cục dự kiến.</MoTaThe></DauThe><NoiDungThe><Link className="app-text-link" to={cacTrangTrongKhung.find(trang => trang.id === 'layouts').to}>Xem cấu hình bố cục <BieuTuong icon={ArrowUpRight} size={16} /></Link></NoiDungThe></The>
        <The><DauThe><BieuTuong icon={SquareDashed} size={24} /><TieuDeThe as="h2" className="mt-4">Khoảng dành cho nội dung</TieuDeThe><MoTaThe>Một placeholder minh họa vùng hiển thị của route con.</MoTaThe></DauThe><NoiDungThe><Link className="app-text-link" to={cacTrangTrongKhung.find(trang => trang.id === 'workspace').to}>Thử vùng nội dung <BieuTuong icon={ArrowUpRight} size={16} /></Link></NoiDungThe></The>
      </div>
      <p className="app-scope-note">Tài khoản đã được xác thực với thư viện. Phân quyền chi tiết từng chức năng sẽ được triển khai ở nhiệm vụ sau; nhìn thấy một mục điều hướng không đại diện cho quyền truy cập.</p>
    </div>
  )
}
