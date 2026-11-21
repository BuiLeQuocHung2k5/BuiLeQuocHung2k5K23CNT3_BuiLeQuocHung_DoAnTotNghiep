import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { chuanHoaLoiApi } from '../../thu-vien/api/chuan-hoa-loi.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'

export const tinhTrangBanSao = { good: 'Tốt', damaged: 'Hư hỏng' }
export const trangThaiBanSao = { available: 'Sẵn sàng', maintenance: 'Bảo trì', borrowed: 'Đang mượn', lost: 'Bị mất' }
export const khoaBanSao = ma => ['ban-sao', ma]
const maHopLe = ma => typeof ma === 'string' && /^[1-9]\d{0,19}$/.test(ma) && BigInt(ma) <= 18446744073709551615n
function kiemTra(duoc) {
  if (!duoc) throw Object.assign(new Error('Phản hồi bản sao không hợp lệ.'), { code: 'COPY_RESPONSE_INVALID' })
}
function hopLe(banSao, maSach) {
  return banSao && maHopLe(banSao.copy_id) && banSao.book_id === maSach && typeof banSao.barcode === 'string' &&
    (banSao.isbn === null || typeof banSao.isbn === 'string') && Object.hasOwn(tinhTrangBanSao, banSao.condition_status) && Object.hasOwn(trangThaiBanSao, banSao.availability_status)
}
export function kiemTraBieuMauBanSao(giaTri) {
  const loi = {}, duLieu = { book_id: giaTri.book_id, condition_status: giaTri.condition_status, availability_status: giaTri.availability_status }
  if (!maHopLe(giaTri.book_id)) loi.book_id = 'Mã đầu sách không hợp lệ.'
  for (const [khoa, toiDa, batBuoc] of [['barcode', 50, true], ['isbn', 20, false]]) {
    const chuoi = giaTri[khoa]
    if (!batBuoc && chuoi == null) duLieu[khoa] = null
    else if (typeof chuoi !== 'string' || !chuoi.isWellFormed() || [...chuoi.trim()].length > toiDa || (batBuoc && !chuoi.trim())) loi[khoa] = `Nhập ${batBuoc ? '1–' : 'tối đa '}${toiDa} ký tự Unicode hợp lệ.`
    else duLieu[khoa] = chuoi.trim()
  }
  if (!Object.hasOwn(tinhTrangBanSao, giaTri.condition_status)) loi.condition_status = 'Chọn tình trạng hợp lệ.'
  if (!['available', 'maintenance'].includes(giaTri.availability_status)) loi.availability_status = 'Chỉ chuyển sang sẵn sàng hoặc bảo trì tại đây.'
  const ghiChu = giaTri.note
  if (ghiChu == null) duLieu.note = null
  else if (typeof ghiChu !== 'string' || !ghiChu.isWellFormed() || new TextEncoder().encode(ghiChu).length > 65535) loi.note = 'Ghi chú tối đa 65535 byte UTF-8 hợp lệ.'
  else duLieu.note = ghiChu
  return { loi, duLieu }
}
export async function layBanSaoTheoSach(ma, thamSo, { signal } = {}) {
  kiemTra(maHopLe(ma))
  const phanHoi = await ketNoiHttp.get(`/books/${ma}/copies`, { params: thamSo, signal })
  const { success, data, pagination: trang } = phanHoi.data ?? {}
  kiemTra(success === true && Array.isArray(data) && data.every(muc => hopLe(muc, ma)) && trang &&
    ['page', 'limit', 'total', 'totalPages'].every(khoa => Number.isSafeInteger(trang[khoa])) && trang.page >= 1 && trang.limit >= 1 && trang.limit <= 100 && trang.total >= 0 && trang.totalPages >= 0)
  return phanHoi
}
export async function ghiBanSao(loai, ma, giaTri, phien, { signal } = {}) {
  if (!phien?.daDangNhap || !phien.tokenTruyCap || !coQuyenTruyCap(phien.nguoiDung, { quyen: ['copy_manage'] })) throw Object.assign(new Error('Không đủ quyền.'), { code: 'COPY_ACTION_FORBIDDEN' })
  const cauHinh = { headers: { Authorization: `Bearer ${phien.tokenTruyCap}` }, signal }
  if (loai !== 'them') kiemTra(maHopLe(ma))
  if (loai === 'xoa') {
    const phanHoi = await ketNoiHttp.delete(`/book-copies/${ma}`, cauHinh)
    kiemTra(phanHoi.status === 200 && phanHoi.data?.success === true && phanHoi.data.data === null)
    return phanHoi
  }
  const { duLieu, loi } = kiemTraBieuMauBanSao(giaTri)
  if (Object.keys(loi).length) throw Object.assign(new Error('Kiểm tra lại các trường nhập.'), { code: 'COPY_VALIDATION', loiTruong: loi })
  const phanHoi = loai === 'them' ? await ketNoiHttp.post('/book-copies', duLieu, cauHinh) : await ketNoiHttp.put(`/book-copies/${ma}`, duLieu, cauHinh)
  kiemTra(phanHoi.status === (loai === 'them' ? 201 : 200) && phanHoi.data?.success === true && hopLe(phanHoi.data.data, duLieu.book_id) && (loai === 'them' || phanHoi.data.data.copy_id === ma))
  return phanHoi
}
export function loiBanSaoAnToan(loi, dangGhi = false) {
  const chuan = chuanHoaLoiApi(loi)
  const thongBao = {
    COPY_RESPONSE_INVALID: 'Chưa đọc được phản hồi bản sao. Hãy tải lại.', COPY_ACTION_FORBIDDEN: 'Bạn không có quyền quản lý bản sao.',
    DUPLICATE_VALUE: 'Mã vạch hoặc ISBN đã tồn tại. Hãy kiểm tra lại.', COPY_NOT_FOUND: 'Bản sao không còn tồn tại. Hãy tải lại danh sách.',
    BOOK_NOT_FOUND: 'Đầu sách không còn tồn tại.', INVALID_REFERENCE: 'Đầu sách không còn tồn tại.',
    COPY_CIRCULATION_LOCKED: 'Bản sao đang mượn, bị mất hoặc có lượt mượn chưa hoàn tất nên chưa thể sửa/xóa.',
    CIRCULATION_STATE_MANAGED: 'Chỉ thay đổi giữa sẵn sàng và bảo trì tại đây.', COPY_BOOK_IMMUTABLE: 'Không thể chuyển bản sao sang đầu sách khác.',
    COPY_HAS_LOAN_HISTORY: 'Bản sao có lịch sử mượn nên không thể xóa.', COPY_HAS_USAGE_HISTORY: 'Bản sao có lịch sử sử dụng nên không thể xóa.', COPY_IN_USE: 'Bản sao có dữ liệu liên quan nên không thể xóa.',
  }
  const chuaRo = dangGhi && (chuan.isNetworkError || chuan.isTimeout || chuan.status >= 500 || loi?.code === 'COPY_RESPONSE_INVALID')
  const message = chuaRo ? 'Chưa xác minh được kết quả. Hãy đóng form và tải lại trước khi gửi tiếp.' : chuan.status === 403 ? 'Bạn không có quyền thực hiện thao tác này. Phiên đăng nhập vẫn được giữ.' : thongBao[loi?.code] ?? thongBao[chuan.code] ?? chuan.message
  return { message, chuaRo, isCancelled: chuan.isCancelled, loiTruong: loi?.loiTruong ?? Object.fromEntries(chuan.details.map(muc => [muc.field, muc.message])) }
}
