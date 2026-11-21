import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { chuanHoaLoiApi } from '../../thu-vien/api/chuan-hoa-loi.js'
import { laySachCongKhai } from '../api-cong-khai/dich-vu-cong-khai.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'

const CAC_TRUONG = ['title', 'author', 'publisher', 'category_id', 'series_id', 'description', 'publication_year']
export const khoaSach = { all: ['sach'], danhSach: thamSo => ['sach', 'danh-sach', thamSo], chiTiet: ma => ['sach', 'chi-tiet', ma] }
const maHopLe = ma => typeof ma === 'string' && /^[1-9]\d{0,19}$/.test(ma) && BigInt(ma) <= 18446744073709551615n
const chuoiHoacNull = giaTri => giaTri === null || typeof giaTri === 'string'

function sachHopLe(sach) {
  return sach && maHopLe(sach.book_id) && typeof sach.title === 'string' && typeof sach.author === 'string' &&
    chuoiHoacNull(sach.publisher) && chuoiHoacNull(sach.description) &&
    ['category_id', 'series_id'].every(khoa => sach[khoa] === null || maHopLe(sach[khoa])) &&
    (sach.publication_year === null || (Number.isInteger(sach.publication_year) && sach.publication_year >= 0 && sach.publication_year <= 65535))
}

function kiemTraPhanHoi(hopLe) {
  if (!hopLe) throw Object.assign(new Error('Phản hồi sách không hợp lệ.'), { code: 'BOOK_RESPONSE_INVALID' })
}

function kiemTraMa(ma) {
  if (!maHopLe(ma)) throw Object.assign(new Error('Mã sách không hợp lệ.'), { code: 'BOOK_ID_INVALID' })
}

export async function layDanhSachSach(thamSo, { signal } = {}) {
  const phanHoi = await laySachCongKhai(thamSo, { signal })
  const noiDung = phanHoi.data, phanTrang = noiDung?.pagination
  kiemTraPhanHoi(noiDung?.success === true && Array.isArray(noiDung.data) && noiDung.data.every(sachHopLe) && phanTrang &&
    ['page', 'limit', 'total', 'totalPages'].every(khoa => Number.isSafeInteger(phanTrang[khoa])) &&
    phanTrang.page >= 1 && phanTrang.limit >= 1 && phanTrang.limit <= 100 && phanTrang.total >= 0 && phanTrang.totalPages >= 0)
  return phanHoi
}

export async function layChiTietSach(ma, { signal } = {}) {
  kiemTraMa(ma)
  const phanHoi = await ketNoiHttp.get(`/books/${ma}`, { signal })
  kiemTraPhanHoi(phanHoi.data?.success === true && sachHopLe(phanHoi.data.data) && phanHoi.data.data.book_id === ma)
  return phanHoi
}

// PUT là thay thế đầy đủ: chọn đúng 7 trường được ghi, giữ null/chuỗi rỗng và mô tả nguyên văn.
export function kiemTraBieuMauSach(giaTri) {
  const loi = {}, duLieu = {}
  for (const [khoa, toiDa, batBuoc] of [['title', 255, true], ['author', 150, true], ['publisher', 150, false]]) {
    const chuoi = giaTri[khoa]
    if (!batBuoc && chuoi == null) { duLieu[khoa] = null; continue }
    if (typeof chuoi !== 'string' || !chuoi.isWellFormed() || (batBuoc && !chuoi.trim()) || [...chuoi.trim()].length > toiDa) loi[khoa] = `Nhập văn bản hợp lệ${batBuoc ? ', không để trống' : ''}, tối đa ${toiDa} ký tự.`
    else duLieu[khoa] = chuoi.trim()
  }
  for (const khoa of ['category_id', 'series_id']) {
    const ma = giaTri[khoa]
    if (ma == null || ma === '') duLieu[khoa] = null
    else if (!maHopLe(ma)) loi[khoa] = 'Mã phải là số nguyên dương, tối đa 18446744073709551615.'
    else duLieu[khoa] = ma
  }
  const moTa = giaTri.description
  if (moTa == null) duLieu.description = null
  else if (typeof moTa !== 'string' || !moTa.isWellFormed() || new TextEncoder().encode(moTa).length > 65535) loi.description = 'Mô tả phải là Unicode hợp lệ, tối đa 65535 byte UTF-8.'
  else duLieu.description = moTa
  const nam = giaTri.publication_year
  if (nam == null || nam === '') duLieu.publication_year = null
  else if (!['number', 'string'].includes(typeof nam) || !String(nam).trim() || !Number.isInteger(Number(nam)) || Number(nam) < 0 || Number(nam) > 65535) loi.publication_year = 'Năm xuất bản là số nguyên từ 0 đến 65535, hoặc để trống.'
  else duLieu.publication_year = Number(nam)
  return { duLieu, loi }
}

function cauHinhGhi(phien, quyen, signal) {
  if (!phien?.daDangNhap || !phien.tokenTruyCap || !coQuyenTruyCap(phien.nguoiDung, { quyen: [quyen] })) {
    throw Object.assign(new Error('Không đủ quyền thao tác.'), { code: 'BOOK_ACTION_FORBIDDEN' })
  }
  // Ghim đúng token của thao tác; không để request cũ lấy token của user đăng nhập sau.
  return { headers: { Authorization: `Bearer ${phien.tokenTruyCap}` }, signal }
}

export async function luuSach(ma, giaTri, phien, { signal } = {}) {
  const cauHinh = cauHinhGhi(phien, ma === null ? 'book_create' : 'book_update', signal)
  if (ma !== null) kiemTraMa(ma)
  const { duLieu, loi } = kiemTraBieuMauSach(giaTri)
  if (Object.keys(loi).length) throw Object.assign(new Error('Kiểm tra lại các trường nhập.'), { code: 'BOOK_VALIDATION', loiTruong: loi })
  const phanHoi = ma === null ? await ketNoiHttp.post('/books', duLieu, cauHinh) : await ketNoiHttp.put(`/books/${ma}`, duLieu, cauHinh)
  kiemTraPhanHoi(phanHoi.status === (ma === null ? 201 : 200) && phanHoi.data?.success === true && sachHopLe(phanHoi.data.data) && (ma === null || phanHoi.data.data.book_id === ma))
  return phanHoi
}

export async function xoaSach(ma, phien, { signal } = {}) {
  const cauHinh = cauHinhGhi(phien, 'book_delete', signal)
  kiemTraMa(ma)
  const phanHoi = await ketNoiHttp.delete(`/books/${ma}`, cauHinh)
  kiemTraPhanHoi(phanHoi.status === 200 && phanHoi.data?.success === true && phanHoi.data.data === null)
  return phanHoi
}

export function loiSachAnToan(loi, dangGhi = false) {
  const chuan = chuanHoaLoiApi(loi)
  const loiTruong = Object.fromEntries(chuan.details.filter(muc => CAC_TRUONG.includes(muc.field)).map(muc => [muc.field, muc.message]))
  let message = chuan.message
  if (loi?.code === 'BOOK_RESPONSE_INVALID') message = 'Phản hồi sách không đúng định dạng. Vui lòng thử lại.'
  if (loi?.code === 'BOOK_VALIDATION') { message = 'Kiểm tra lại các trường nhập.'; Object.assign(loiTruong, loi.loiTruong) }
  if (loi?.code === 'BOOK_ACTION_FORBIDDEN' || chuan.status === 403) message = 'Bạn không có quyền thực hiện thao tác này. Phiên đăng nhập vẫn được giữ.'
  if (chuan.status === 401) message = 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'
  if (chuan.code === 'BOOK_NOT_FOUND') message = 'Không tìm thấy sách. Sách có thể đã được xóa.'
  if (['BOOK_HAS_COPIES', 'BOOK_IN_USE'].includes(chuan.code)) message = 'Sách có bản sao hoặc dữ liệu liên quan nên chưa thể xóa.'
  if (chuan.code === 'INVALID_REFERENCE') message = 'Thể loại hoặc bộ sách được tham chiếu không tồn tại. Kiểm tra lại mã đã chọn.'
  if (chuan.status === 413) message = 'Nội dung quá lớn. Hãy rút gọn mô tả.'
  const chuaRo = dangGhi && (chuan.isNetworkError || chuan.isTimeout || chuan.status >= 500 || loi?.code === 'BOOK_RESPONSE_INVALID')
  if (chuaRo) message = 'Chưa xác minh được thao tác đã hoàn tất. Hãy đóng hộp thoại và tải lại danh sách trước khi gửi lại.'
  return { message, loiTruong, chuaRo, isCancelled: chuan.isCancelled }
}
