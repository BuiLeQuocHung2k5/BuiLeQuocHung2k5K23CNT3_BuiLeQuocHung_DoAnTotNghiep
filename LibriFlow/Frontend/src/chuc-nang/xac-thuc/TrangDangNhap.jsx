import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { BookOpen, ArrowRight } from 'lucide-react'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import { The, DauThe, TieuDeThe, MoTaThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import BieuTuong from '../../thanh-phan/giao-dien/BieuTuong.jsx'
import { useXacThuc } from './useXacThuc.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { thongBaoLoiDangNhap } from './dich-vu-xac-thuc.js'

export default function TrangDangNhap() {
  const { daDangNhap, dangDangNhap, thongBaoPhien, dangNhap } = useXacThuc()
  const [email, datEmail] = useState('')
  const [matKhau, datMatKhau] = useState('')
  const [loiTruong, datLoiTruong] = useState({})
  const [loi, datLoi] = useState('')

  useEffect(() => {
    const tieuDeCu = document.title
    document.title = 'Đăng nhập · LibriFlow'
    return () => { document.title = tieuDeCu }
  }, [])

  async function guiBieuMau(suKien) {
    suKien.preventDefault()
    if (dangDangNhap || moiTruong.error) return
    const cacLoi = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 150) cacLoi.email = 'Nhập địa chỉ email hợp lệ.'
    if (!matKhau) cacLoi.matKhau = 'Nhập mật khẩu của bạn.'
    else if (new TextEncoder().encode(matKhau).length > 72) cacLoi.matKhau = 'Mật khẩu vượt quá giới hạn 72 byte UTF-8.'
    datLoiTruong(cacLoi)
    datLoi('')
    if (Object.keys(cacLoi).length) return
    try { await dangNhap({ email, password: matKhau }) }
    // Chỉ lưu chuỗi an toàn; AxiosError có thể chứa body/password và không vào UI state.
    catch (loiDangNhap) { datLoi(thongBaoLoiDangNhap(loiDangNhap)) }
    finally { datMatKhau('') }
  }

  if (daDangNhap) return <Navigate to="/app" replace />
  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="auth-welcome">
          <Link to="/" className="auth-brand"><span className="app-brand-mark"><BieuTuong icon={BookOpen} size={26} /></span><span>LibriFlow</span></Link>
          <p className="auth-eyebrow">KHÔNG GIAN CỦA NHỮNG TRANG SÁCH</p>
          <h1 id="auth-welcome">Chào mừng<br />bạn trở lại.</h1>
          <p className="auth-intro-description">Một cuốn sách hay, một góc yên tĩnh.<br />Tiếp tục hành trình khám phá của bạn cùng LibriFlow.</p>
          <div className="auth-books" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          <p className="auth-note">Mỗi trang sách mở ra một điều mới.</p>
        </section>
        <The className="auth-card">
          <DauThe><p className="auth-eyebrow">THƯ VIỆN LIBRIFLOW</p><TieuDeThe as="h2" className="auth-title">Đăng nhập</TieuDeThe><MoTaThe>Sử dụng email đã đăng ký với thư viện.</MoTaThe></DauThe>
          <NoiDungThe>
            <form className="auth-form" onSubmit={guiBieuMau} noValidate aria-label="Đăng nhập LibriFlow" aria-busy={dangDangNhap}>
              {thongBaoPhien && <ThongBao variant="warning" title="Vui lòng đăng nhập lại" role="status">{thongBaoPhien}</ThongBao>}
              {moiTruong.error && <ThongBao variant="warning" title="Chưa thể kết nối dịch vụ" role="status">Dịch vụ đăng nhập chưa được cấu hình. Vui lòng liên hệ người quản lý hệ thống.</ThongBao>}
              {loi && <ThongBao variant="error" title="Chưa đăng nhập được" role="alert">{loi}</ThongBao>}
              <ONhap label="Email" name="email" type="email" inputMode="email" autoComplete="username" required maxLength={150}
                value={email} onChange={suKien => datEmail(suKien.target.value)} error={loiTruong.email} disabled={dangDangNhap} />
              <ONhap label="Mật khẩu" name="password" type="password" autoComplete="current-password" required
                value={matKhau} onChange={suKien => datMatKhau(suKien.target.value)} error={loiTruong.matKhau} disabled={dangDangNhap} />
              <NutBam type="submit" loading={dangDangNhap} disabled={Boolean(moiTruong.error)} icon={<BieuTuong icon={ArrowRight} size={18} />}>{dangDangNhap ? 'Đang đăng nhập…' : 'Đăng nhập'}</NutBam>
            </form>
            <p className="auth-session-note">Phiên đăng nhập chỉ được giữ trong tab hiện tại. Tải lại trang sẽ cần đăng nhập lại.</p>
          </NoiDungThe>
        </The>
        <footer className="auth-footer"><span>LibriFlow · Warm Wooden Library</span><Link to="/">Kiểm tra nền tảng</Link></footer>
      </div>
    </main>
  )
}
