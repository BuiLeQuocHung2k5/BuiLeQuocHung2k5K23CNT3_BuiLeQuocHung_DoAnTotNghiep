import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { chuanHoaLoiApi } from '../../thu-vien/api/chuan-hoa-loi.js'

export function guiDangNhap({ email, password }, signal) {
  return ketNoiHttp.post('/auth/login', { email: email.trim().toLowerCase(), password }, { signal, boQuaPhien: true })
}

export function layNguoiDung(token, signal) {
  return ketNoiHttp.get('/auth/me', { headers: { Authorization: `Bearer ${token}` }, signal })
}

export function guiDangXuat(token) {
  return ketNoiHttp.post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` }, boQuaPhien: true })
}

export function thongBaoLoiDangNhap(loi) {
  if (loi?.code === 'AUTH_RESPONSE_INVALID') return 'Phản hồi đăng nhập chưa đúng định dạng. Vui lòng thử lại sau.'
  const loiAnToan = chuanHoaLoiApi(loi)
  if (loiAnToan.code === 'INVALID_CREDENTIALS') return 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.'
  if (loiAnToan.status === 401) return 'Phiên đăng nhập chưa hợp lệ. Vui lòng đăng nhập lại.'
  if (loiAnToan.code === 'ACCOUNT_INACTIVE') return 'Tài khoản đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ thư viện.'
  if (loiAnToan.status === 429) return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ rồi thử lại.'
  return loiAnToan.message
}
