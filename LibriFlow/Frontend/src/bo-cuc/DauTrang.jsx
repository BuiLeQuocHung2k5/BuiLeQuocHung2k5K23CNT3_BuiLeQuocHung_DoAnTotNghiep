import { Link, useNavigate } from 'react-router'
import { ChevronRight, UserRound, LogOut } from 'lucide-react'
import BieuTuong from "../thanh-phan/giao-dien/BieuTuong.jsx"
import { DUONG_DAN_UNG_DUNG } from "../ung-dung/dinh-tuyen/cau-hinh-tuyen.js"
import NutBam from '../thanh-phan/giao-dien/NutBam.jsx'
import { useXacThuc } from '../chuc-nang/xac-thuc/useXacThuc.js'
import AnhDaiDien from '../chuc-nang/xac-thuc/AnhDaiDien.jsx'

const tenVaiTro = { admin: 'Quản trị viên', librarian: 'Thủ thư', reader: 'Bạn đọc' }

export default function DauTrang({ pageTitle: tieuDeTrang }) {
  const { nguoiDung, dangXuat } = useXacThuc()
  const dieuHuong = useNavigate()
  function xuLyDangXuat() {
    void dangXuat()
    dieuHuong('/dang-nhap', { replace: true })
  }
  return (
    <header className="app-header">
      <nav className="app-breadcrumb" aria-label="Đường dẫn trang"><ol>
        <li><Link to={DUONG_DAN_UNG_DUNG}>Ứng dụng</Link></li>
        <li aria-hidden="true"><BieuTuong icon={ChevronRight} size={14} /></li>
        <li><span aria-current="page">{tieuDeTrang}</span></li>
      </ol></nav>
      <div className="app-account-slot" aria-label="Tài khoản LibriFlow">
        {nguoiDung ? <><AnhDaiDien avatar={nguoiDung.avatar} /><div className="auth-account-info"><strong>{nguoiDung.name}</strong><span>{nguoiDung.roles.map(vaiTro => tenVaiTro[vaiTro] ?? vaiTro).join(', ') || 'Chưa có vai trò'}</span></div>
          <NutBam variant="ghost" size="sm" onClick={xuLyDangXuat} icon={<BieuTuong icon={LogOut} size={17} />}>Đăng xuất</NutBam></>
          : <><BieuTuong icon={UserRound} size={18} /><span>Chế độ xem thử</span><Link className="app-text-link" to="/dang-nhap">Đăng nhập</Link></>}
      </div>
    </header>
  )
}
