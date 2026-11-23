import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { BookOpen } from 'lucide-react'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import ONhapMatKhau from './ONhapMatKhau.jsx'
import { The, DauThe, TieuDeThe, MoTaThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import BieuTuong from '../../thanh-phan/giao-dien/BieuTuong.jsx'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { useXacThuc } from './useXacThuc.js'
import { guiDangKy, thongBaoLoiDangKy } from './dich-vu-xac-thuc.js'

const coKyTuDieuKhien = chuoi => [...chuoi].some(kyTu => kyTu.codePointAt(0) < 32 || kyTu.codePointAt(0) === 127)

export default function TrangDangKy() {
  const { daDangNhap } = useXacThuc()
  const dieuHuong = useNavigate()
  const [giaTri, datGiaTri] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loiTruong, datLoiTruong] = useState({})
  const [loi, datLoi] = useState(null)
  const [dangGui, datDangGui] = useState(false)
  const yeuCau = useRef(null)
  useEffect(() => {
    const cu = document.title
    document.title = 'Đăng ký · LibriFlow'
    return () => { yeuCau.current?.abort(); document.title = cu }
  }, [])
  const doi = (khoa, giaTriMoi) => { datGiaTri(cu => ({ ...cu, [khoa]: giaTriMoi })); datLoiTruong(cu => ({ ...cu, [khoa]: undefined })) }
  async function gui(suKien) {
    suKien.preventDefault()
    if (yeuCau.current || loi?.chuaRo || moiTruong.error) return
    const cacLoi = {}
    if (!giaTri.name.isWellFormed() || !giaTri.name.trim() || [...giaTri.name.trim()].length > 100 || coKyTuDieuKhien(giaTri.name.trim())) cacLoi.name = 'Nhập họ tên từ 1 đến 100 ký tự, không chứa ký tự điều khiển.'
    if (!giaTri.email.isWellFormed() || [...giaTri.email.trim()].length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(giaTri.email.trim()) || coKyTuDieuKhien(giaTri.email.trim())) cacLoi.email = 'Nhập email hợp lệ, tối đa 150 ký tự.'
    if (!giaTri.password.isWellFormed() || [...giaTri.password].length < 4 || [...giaTri.password].length > 12) cacLoi.password = 'Mật khẩu từ 4 đến 12 ký tự.'
    if (giaTri.confirm !== giaTri.password || !giaTri.confirm) cacLoi.confirm = 'Mật khẩu xác nhận chưa khớp.'
    datLoiTruong(cacLoi); datLoi(null)
    if (Object.keys(cacLoi).length) return
    const boDieuKhien = new AbortController()
    yeuCau.current = boDieuKhien; datDangGui(true)
    try {
      await guiDangKy(giaTri, boDieuKhien.signal)
      if (!boDieuKhien.signal.aborted) dieuHuong('/dang-nhap', { replace: true, state: { daDangKy: true } })
    } catch (loiDangKy) {
      if (!boDieuKhien.signal.aborted) { const anToan = thongBaoLoiDangKy(loiDangKy); datLoi(anToan); datLoiTruong(anToan.loiTruong) }
    } finally {
      if (yeuCau.current === boDieuKhien) yeuCau.current = null
      if (!boDieuKhien.signal.aborted) { datDangGui(false); datGiaTri(cu => ({ ...cu, password: '', confirm: '' })) }
    }
  }
  if (daDangNhap) return <Navigate to="/app" replace />
  return <main className="auth-page"><div className="auth-layout">
    <section className="auth-intro" aria-labelledby="register-welcome"><Link to="/" className="auth-brand"><span className="app-brand-mark"><BieuTuong icon={BookOpen} size={26} /></span><span>LibriFlow</span></Link><p className="auth-eyebrow">KHÔNG GIAN CỦA NHỮNG TRANG SÁCH</p><h1 id="register-welcome">Bắt đầu<br />hành trình đọc.</h1><p className="auth-intro-description">Tạo tài khoản độc giả để khám phá kho sách và theo dõi hành trình mượn sách của bạn.</p></section>
    <The className="auth-card"><DauThe><p className="auth-eyebrow">THƯ VIỆN LIBRIFLOW</p><TieuDeThe as="h2" className="auth-title">Đăng ký</TieuDeThe><MoTaThe>Tạo tài khoản độc giả mới.</MoTaThe></DauThe><NoiDungThe>
      <form className="auth-form" aria-label="Đăng ký độc giả" aria-busy={dangGui} noValidate onSubmit={gui}>
        {moiTruong.error && <ThongBao variant="warning" title="Chưa thể kết nối dịch vụ">Dịch vụ đăng ký chưa được cấu hình. Vui lòng liên hệ thư viện.</ThongBao>}
        {loi && <ThongBao variant="error" title="Chưa hoàn tất đăng ký" role="alert">{loi.message}</ThongBao>}
        <ONhap label="Họ tên" name="name" autoComplete="name" required value={giaTri.name} disabled={dangGui} error={loiTruong.name} onChange={suKien => doi('name', suKien.target.value)} />
        <ONhap label="Email" name="email" type="email" autoComplete="username" required value={giaTri.email} disabled={dangGui} error={loiTruong.email} onChange={suKien => doi('email', suKien.target.value)} />
        <ONhapMatKhau label="Mật khẩu" name="password" autoComplete="new-password" required value={giaTri.password} disabled={dangGui} error={loiTruong.password} helperText="Mật khẩu từ 4 đến 12 ký tự" onChange={suKien => doi('password', suKien.target.value)} />
        <ONhapMatKhau label="Xác nhận mật khẩu" name="confirm" autoComplete="new-password" required value={giaTri.confirm} disabled={dangGui} error={loiTruong.confirm} onChange={suKien => doi('confirm', suKien.target.value)} />
        <NutBam type="submit" loading={dangGui} disabled={Boolean(moiTruong.error || loi?.chuaRo)}>{dangGui ? 'Đang đăng ký…' : 'Đăng ký'}</NutBam>
      </form><p className="auth-session-note">Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link></p>
    </NoiDungThe></The>
  </div></main>
}
