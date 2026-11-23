import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { chuanHoaLoiApi } from '../../thu-vien/api/chuan-hoa-loi.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'

export const trangThaiPhieu = { borrowed: 'Đang mượn', partially_returned: 'Đã trả một phần', returned: 'Đã trả toàn bộ', overdue: 'Quá hạn', cancelled: 'Đã hủy' }
export const maHopLe = ma => typeof ma === 'string' && /^[1-9]\d{0,19}$/.test(ma) && BigInt(ma) <= 18446744073709551615n
export const khoaMuonTra = ['muon-tra']
function kiemTra(dung, message = 'Phản hồi phiếu mượn không hợp lệ.') {
  if (!dung) throw Object.assign(new Error(message), { code: 'BORROW_RESPONSE_INVALID' })
}
function cauHinh(phien, signal, quyen) {
  if (!phien?.daDangNhap || !phien.tokenTruyCap || (quyen && !coQuyenTruyCap(phien.nguoiDung, { quyen: [quyen] }))) throw Object.assign(new Error('Không đủ quyền thao tác.'), { code: 'BORROW_FORBIDDEN' })
  return { headers: { Authorization: `Bearer ${phien.tokenTruyCap}` }, signal }
}
function phieuHopLe(phieu) {
  return phieu && maHopLe(phieu.borrow_id) && maHopLe(phieu.user_id) && Object.hasOwn(trangThaiPhieu, phieu.status) &&
    ['borrow_date', 'due_date', 'created_at'].every(k => typeof phieu[k] === 'string') && (phieu.note === null || typeof phieu.note === 'string')
}
function chiTietHopLe(phieu) {
  return phieuHopLe(phieu) && Array.isArray(phieu.details) && phieu.details.every(muc => maHopLe(muc.borrow_detail_id) && maHopLe(muc.copy_id) &&
    ['borrowed', 'returned', 'lost'].includes(muc.status) && ['good', 'damaged'].includes(muc.condition_before) &&
    (muc.condition_after === null || ['good', 'damaged'].includes(muc.condition_after)) && (muc.returned_at === null || typeof muc.returned_at === 'string'))
}
export function kiemTraPhieuMuon(duLieu) {
  const loi = {}
  if (!maHopLe(duLieu.user_id)) loi.user_id = 'Nhập mã độc giả là số nguyên dương hợp lệ.'
  if (!Array.isArray(duLieu.copy_ids) || !duLieu.copy_ids.length || duLieu.copy_ids.length > 100 || !duLieu.copy_ids.every(maHopLe) || new Set(duLieu.copy_ids).size !== duLieu.copy_ids.length) loi.copy_ids = 'Chọn từ 1 đến 100 bản sao khác nhau.'
  const ngay = duLieu.due_date
  const moc = typeof ngay === 'string' ? Date.parse(ngay) : NaN
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(ngay ?? '') || !Number.isFinite(moc) || new Date(moc).toISOString() !== ngay.replace('Z', '.000Z') || Number(ngay.slice(0, 4)) < 1000 || moc <= Date.now()) loi.due_date = 'Hạn trả phải tồn tại và ở tương lai.'
  if (duLieu.note != null && (typeof duLieu.note !== 'string' || !duLieu.note.isWellFormed() || new TextEncoder().encode(duLieu.note).length > 65535)) loi.note = 'Ghi chú tối đa 65535 byte UTF-8 hợp lệ.'
  return loi
}
export async function layDanhSachPhieu(thamSo, phien, { signal } = {}) {
  const r = await ketNoiHttp.get('/borrows', { ...cauHinh(phien, signal), params: thamSo })
  const p = r.data?.pagination
  kiemTra(r.data?.success === true && Array.isArray(r.data.data) && r.data.data.every(phieuHopLe) && p &&
    ['page', 'limit', 'total', 'totalPages'].every(k => Number.isSafeInteger(p[k])) && p.page >= 1 && p.limit >= 1 && p.limit <= 100 && p.total >= 0 && p.totalPages >= 0)
  return r.data
}
export async function layChiTietPhieu(ma, phien, { signal } = {}) {
  kiemTra(maHopLe(ma))
  const r = await ketNoiHttp.get(`/borrows/${ma}`, cauHinh(phien, signal))
  kiemTra(r.data?.success === true && chiTietHopLe(r.data.data) && r.data.data.borrow_id === ma)
  return r.data.data
}
export async function taoPhieuMuon(duLieu, phien, { signal } = {}) {
  const config = cauHinh(phien, signal, 'borrow_manage')
  const loi = kiemTraPhieuMuon(duLieu)
  if (Object.keys(loi).length) throw Object.assign(new Error('Kiểm tra thông tin phiếu.'), { code: 'BORROW_VALIDATION', loiTruong: loi })
  const r = await ketNoiHttp.post('/borrows', { user_id: duLieu.user_id, copy_ids: duLieu.copy_ids, due_date: duLieu.due_date, note: duLieu.note ?? null }, config)
  kiemTra(r.status === 201 && r.data?.success === true && chiTietHopLe(r.data.data))
  return r.data.data
}
export async function traSach(ma, duLieu, phien, { signal } = {}) {
  const config = cauHinh(phien, signal, 'return_process')
  kiemTra(maHopLe(ma))
  const hopLe = duLieu.return_all === true ? ['good', 'damaged'].includes(duLieu.condition_after) : Array.isArray(duLieu.items) && duLieu.items.length >= 1 && duLieu.items.length <= 100 &&
    duLieu.items.every(muc => maHopLe(muc.copy_id) && ['good', 'damaged'].includes(muc.condition_after)) && new Set(duLieu.items.map(m => m.copy_id)).size === duLieu.items.length
  if (!hopLe) throw Object.assign(new Error('Chọn bản sao và tình trạng trả hợp lệ.'), { code: 'BORROW_VALIDATION' })
  const body = duLieu.return_all === true ? { return_all: true, condition_after: duLieu.condition_after } : { items: duLieu.items.map(({ copy_id, condition_after }) => ({ copy_id, condition_after })) }
  const r = await ketNoiHttp.post(`/borrows/${ma}/return`, body, config)
  kiemTra(r.status === 200 && r.data?.success === true && chiTietHopLe(r.data.data) && r.data.data.borrow_id === ma)
  return r.data.data
}
export function loiMuonTra(loi, ghi = false) {
  const chuan = chuanHoaLoiApi(loi)
  const thongBao = { BORROWER_NOT_FOUND: 'Không tìm thấy độc giả. Hãy kiểm tra mã.', BORROWER_INACTIVE: 'Độc giả không ở trạng thái hoạt động.',
    COPY_NOT_FOUND: 'Không tìm thấy bản sao đã chọn.', COPY_NOT_BORROWABLE: 'Bản sao không còn sẵn sàng hoặc không ở tình trạng tốt.', COPY_HAS_OPEN_LOAN: 'Bản sao có lượt mượn chưa hoàn tất.',
    BORROW_NOT_FOUND: 'Không tìm thấy phiếu hoặc phiếu ngoài phạm vi truy cập.', ALREADY_RETURNED: 'Bản sao đã được trả. Hãy tải lại chi tiết.',
    BORROW_NOT_RETURNABLE: 'Phiếu đã hoàn tất hoặc bị hủy, không thể trả.', RETURN_STATE_CONFLICT: 'Trạng thái bản sao không nhất quán. Hãy tải lại và kiểm tra.',
    COPY_NOT_IN_BORROW: 'Bản sao không thuộc phiếu này.', INVALID_DUE_DATE: 'Hạn trả đã hết hiệu lực. Hãy chọn lại.',
    BORROW_RESPONSE_INVALID: 'Phản hồi phiếu không hợp lệ. Hãy tải lại.', BORROW_VALIDATION: 'Kiểm tra lại thông tin đã nhập.' }
  const chuaRo = ghi && (chuan.isNetworkError || chuan.isTimeout || chuan.status >= 500 || loi?.code === 'BORROW_RESPONSE_INVALID')
  return { message: chuaRo ? 'Chưa xác minh được kết quả. Đóng form và tải lại phiếu trước khi gửi tiếp.' :
    chuan.status === 403 || loi?.code === 'BORROW_FORBIDDEN' ? 'Bạn không có quyền thực hiện thao tác này. Phiên đăng nhập vẫn được giữ.' :
      thongBao[loi?.code] ?? thongBao[chuan.code] ?? chuan.message, chuaRo, isCancelled: chuan.isCancelled,
    loiTruong: loi?.loiTruong ?? Object.fromEntries(chuan.details.map(m => [m.field, m.message])) }
}
