import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { The, DauThe, TieuDeThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import '../../kieu-dang/doc-gia.css'

const tenVaiTro = { admin: 'Quản trị viên', librarian: 'Thủ thư', reader: 'Bạn đọc' }
const trangThai = { active: 'Đang hoạt động', inactive: 'Ngừng hoạt động', locked: 'Bị khóa' }
export default function TrangTaiKhoan() {
  const { nguoiDung } = useXacThuc()
  // Chỉ render allowlist trường hồ sơ từ principal FE06, không dump object/JSON hay token.
  const cacTruong = [['Họ và tên', nguoiDung?.name], ['Mã tài khoản', nguoiDung?.user_id], ['Email', nguoiDung?.email],
    ['Số điện thoại', nguoiDung?.phone], ['Vai trò', nguoiDung?.roles?.map(vaiTro => tenVaiTro[vaiTro] ?? vaiTro).join(', ')], ['Trạng thái', trangThai[nguoiDung?.status] ?? nguoiDung?.status]]
  return <div className="app-page reader-page"><div className="app-page-intro"><p className="app-eyebrow">HỒ SƠ CÁ NHÂN</p><h1>Tài khoản của tôi</h1><p>Thông tin tài khoản đang đăng nhập.</p></div>
    <The><DauThe><TieuDeThe>Thông tin liên hệ</TieuDeThe></DauThe><NoiDungThe><dl className="reader-profile">{cacTruong.map(([nhan, giaTri]) => <div key={nhan}><dt>{nhan}</dt><dd>{giaTri || 'Chưa cung cấp'}</dd></div>)}</dl></NoiDungThe></The>
    <p className="app-muted">Hiện chưa hỗ trợ chỉnh sửa hồ sơ hoặc đổi mật khẩu tại đây. Bạn có thể đăng xuất bằng nút trên Header.</p>
  </div>
}
