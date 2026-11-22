import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { chuanHoaLoiApi } from '../../thu-vien/api/chuan-hoa-loi.js'

export function guiDangNhap({ email, password }, signal) {
  return ketNoiHttp.post('/auth/login', { email: email.trim().toLowerCase(), password }, { signal, boQuaPhien: true })
}

export async function guiDangKy({ name, email, password }, signal) {
  const phanHoi = await ketNoiHttp.post('/auth/register', { name: name.trim(), email: email.trim().toLowerCase(), password }, { signal, boQuaPhien: true })
  const nguoiDung = phanHoi.data?.data
  if (phanHoi.status !== 201 || phanHoi.data?.success !== true || typeof nguoiDung?.user_id !== 'string' ||
    nguoiDung.status !== 'active' || nguoiDung.roles?.length !== 1 || nguoiDung.roles[0] !== 'reader') {
    throw Object.assign(new Error('Phản hồi đăng ký không hợp lệ.'), { code: 'REGISTER_RESPONSE_INVALID' })
  }
}

export function thongBaoLoiDangKy(loi) {
  const anToan = chuanHoaLoiApi(loi)
  const chuaRo = anToan.isNetworkError || anToan.isTimeout || anToan.status >= 500 || loi?.code === 'REGISTER_RESPONSE_INVALID'
  const message = anToan.code === 'EMAIL_ALREADY_EXISTS' ? 'Email đã được sử dụng. Hãy đăng nhập hoặc dùng email khác.'
    : anToan.code === 'REGISTRATION_NOT_CONFIGURED' || anToan.code === 'JWT_NOT_CONFIGURED' ? 'Dịch vụ đăng ký tạm thời chưa sẵn sàng. Vui lòng thử lại sau.'
      : chuaRo ? 'Chưa xác minh được kết quả đăng ký. Hãy thử đăng nhập trước khi đăng ký lại.'
        : anToan.status === 429 ? 'Bạn đã gửi quá nhiều yêu cầu đăng ký. Vui lòng chờ rồi thử lại.' : anToan.message
  return { message, chuaRo, loiTruong: Object.fromEntries(anToan.details.filter(muc => ['name', 'email', 'password'].includes(muc.field)).map(muc => [muc.field, muc.message])) }
}

export function layNguoiDung(token, signal) {
  return ketNoiHttp.get('/auth/me', { headers: { Authorization: `Bearer ${token}` }, signal })
}

export function guiSoDienThoai(phone, token, signal) {
  return ketNoiHttp.patch('/auth/me', { phone }, { headers: { Authorization: `Bearer ${token}` }, signal })
}

export function guiAnhDaiDien(tep, token, signal) {
  return ketNoiHttp.put('/auth/me/avatar', tep, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': tep.type },
    signal,
  })
}

export function thongBaoLoiHoSo(loi) {
  const { status, code, message } = chuanHoaLoiApi(loi)
  if (code === 'INVALID_AVATAR') return 'Ảnh không hợp lệ hoặc không đọc được. Hãy chọn ảnh JPEG, PNG hoặc WebP khác.'
  if (status === 413) return 'Ảnh vượt quá giới hạn 2 MB.'
  if (status === 415) return 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'
  if (code === 'VALIDATION_ERROR') return 'Số điện thoại chưa hợp lệ. Hãy kiểm tra lại số đã nhập.'
  if (status === 401) return 'Phiên đã hết hạn. Vui lòng đăng nhập lại.'
  if (loi?.code === 'PROFILE_RESPONSE_INVALID') return 'Chưa xác minh được hồ sơ sau khi lưu. Hãy đăng nhập lại để xem thông tin mới nhất.'
  if (loi?.code === 'PROFILE_BUSY') return 'Đang lưu hồ sơ. Vui lòng chờ yêu cầu hiện tại hoàn tất.'
  return message
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
