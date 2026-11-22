import { Link } from 'react-router'
import { The, DauThe, TieuDeThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'

export default function TrangNguoiDung() {
  return <div className="app-page">
    <div className="app-page-intro"><p className="app-eyebrow">QUẢN TRỊ TÀI KHOẢN</p><h1>Quản lý người dùng</h1><p>Tình trạng hỗ trợ quản lý tài khoản thư viện.</p></div>
    <ThongBao variant="warning" title="Dịch vụ quản lý người dùng chưa được hỗ trợ">
      Hệ thống hiện chưa cung cấp dịch vụ để tải hoặc thay đổi tài khoản người dùng. Đây không phải danh sách người dùng rỗng.
    </ThongBao>
    <The><DauThe><TieuDeThe as="h2">Các tác vụ chưa thể sử dụng</TieuDeThe></DauThe><NoiDungThe>
      <ul><li>Danh sách, tìm kiếm, lọc và xem chi tiết người dùng.</li><li>Tạo hoặc cập nhật tài khoản từ khu vực quản trị.</li><li>Kích hoạt, vô hiệu hóa hoặc xóa tài khoản.</li><li>Thay đổi vai trò, quyền hoặc đặt lại mật khẩu.</li></ul>
      <p className="app-muted">Các tác vụ này cần được bổ sung vào dịch vụ trước khi sử dụng tại đây. Thông tin tài khoản hiện tại vẫn có thể xem trong trang cá nhân.</p>
      <Link className="app-text-link" to="/app/tai-khoan">Xem tài khoản của tôi</Link>
    </NoiDungThe></The>
    <Link className="app-text-link" to="/app/sach">Đến danh mục sách</Link>
  </div>
}
