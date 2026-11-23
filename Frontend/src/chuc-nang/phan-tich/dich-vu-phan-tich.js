import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { chuanHoaLoiApi } from '../../thu-vien/api/chuan-hoa-loi.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import { maHopLe } from '../muon-tra/dich-vu-muon-tra.js'

export const cacChiSo = [['books_total', 'Đầu sách'], ['copies_total', 'Bản sao (mọi trạng thái)'], ['users_total', 'Tài khoản (mọi vai trò)'], ['borrows_total', 'Tổng phiếu không hủy'], ['borrows_in_period', 'Phiếu mượn trong kỳ'], ['borrowed_copies_in_period', 'Bản sao được mượn trong kỳ'], ['returned_copies_in_period', 'Bản sao được trả trong kỳ']]
const soDem = giaTri => Number.isSafeInteger(giaTri) && giaTri >= 0
export function ngayHopLe(ngay) {
  return typeof ngay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ngay) && ngay >= '1000-01-01' && ngay <= '9999-12-30' && Number.isFinite(Date.parse(`${ngay}T00:00:00Z`)) && new Date(`${ngay}T00:00:00Z`).toISOString().slice(0, 10) === ngay
}
export function khoangNgayMacDinh() {
  const ngayCuoi = new Date()
  return { start_date: new Date(ngayCuoi.getTime() - 29 * 86400000).toISOString().slice(0, 10), end_date: ngayCuoi.toISOString().slice(0, 10), group_by: 'day', user_id: '' }
}
export function loiBoLoc(thamSo) {
  if (!ngayHopLe(thamSo.start_date) || !ngayHopLe(thamSo.end_date)) return 'Chọn ngày UTC hợp lệ từ năm 1000 đến 9999-12-30.'
  const soNgay = (Date.parse(thamSo.end_date) - Date.parse(thamSo.start_date)) / 86400000 + 1
  if (soNgay < 1 || soNgay > 366) return 'Khoảng ngày phải tăng dần và không quá 366 ngày.'
  if (!['day', 'week', 'month'].includes(thamSo.group_by)) return 'Chọn cách nhóm ngày, tuần hoặc tháng.'
  if (thamSo.user_id && !maHopLe(thamSo.user_id)) return 'Mã người dùng không hợp lệ.'
  return ''
}
function kiemTra(dung) {
  if (!dung) throw Object.assign(new Error('Phản hồi phân tích không hợp lệ.'), { code: 'ANALYTICS_RESPONSE_INVALID' })
}
function cauHinh(phien, quyen, signal) {
  if (!phien?.daDangNhap || !phien.tokenTruyCap || (quyen && !coQuyenTruyCap(phien.nguoiDung, { quyen: [quyen] }))) throw Object.assign(new Error('Không đủ quyền.'), { code: 'ANALYTICS_FORBIDDEN' })
  return { signal, headers: { Authorization: `Bearer ${phien.tokenTruyCap}` } }
}
function kyHopLe(ky) { return ky && ngayHopLe(ky.start_date) && ngayHopLe(ky.end_date) && ky.start_date <= ky.end_date && ky.timezone === 'UTC' }
export async function layTongQuanThongKe(phien, thamSo = {}, { signal } = {}) {
  const params = Object.fromEntries(['start_date', 'end_date'].filter(k => thamSo[k]).map(k => [k, thamSo[k]]))
  const phanHoi = await ketNoiHttp.get('/statistics/overview', { ...cauHinh(phien, 'report_view', signal), params })
  const noiDung = phanHoi.data
  kiemTra(noiDung?.success === true && cacChiSo.every(([khoa]) => soDem(noiDung.data?.[khoa])) && kyHopLe(noiDung.period))
  return noiDung
}
export async function layChuoiMuon(phien, thamSo, { signal } = {}) {
  const params = { start_date: thamSo.start_date, end_date: thamSo.end_date, group_by: thamSo.group_by, ...(thamSo.user_id ? { user_id: thamSo.user_id } : {}) }
  const phanHoi = await ketNoiHttp.get('/statistics/borrows', { ...cauHinh(phien, 'report_view', signal), params })
  const noiDung = phanHoi.data
  kiemTra(noiDung?.success === true && kyHopLe(noiDung.period) && noiDung.period.start_date === params.start_date && noiDung.period.end_date === params.end_date && noiDung.period.group_by === params.group_by && Array.isArray(noiDung.data) && noiDung.data.every((muc, i, arr) =>
    (params.group_by === 'month' ? /^\d{4}-\d{2}$/.test(muc.period_start) && ngayHopLe(`${muc.period_start}-01`) : ngayHopLe(muc.period_start)) &&
    (params.group_by !== 'day' || (muc.period_start >= params.start_date && muc.period_start <= params.end_date)) && soDem(muc.borrow_count) && soDem(muc.borrowed_copy_count) && (!i || arr[i - 1].period_start < muc.period_start)))
  return noiDung
}
export async function layDuBao(phien, ma, { signal } = {}) {
  const config = cauHinh(phien, ma ? 'forecast_view' : null, signal)
  kiemTra(!ma || maHopLe(ma))
  const phanHoi = await ketNoiHttp.get(ma ? `/forecasts/users/${ma}` : '/forecasts/me', config)
  const duLieu = phanHoi.data?.data
  kiemTra(phanHoi.data?.success === true && duLieu && duLieu.user_id === (ma || phien.nguoiDung.user_id) && ngayHopLe(duLieu.cutoff_date) && duLieu.target === 'borrow_receipts_per_user_per_day' && duLieu.model_version === 'borrow_daily_sma7_v1' && duLieu.timezone === 'UTC' && duLieu.horizon_days === 7 && duLieu.persisted === false && ['ready', 'insufficient_data'].includes(duLieu.status) && Array.isArray(duLieu.predictions))
  const danhGia = duLieu.evaluation
  kiemTra(danhGia && ['evaluated', 'insufficient_data'].includes(danhGia.status) && soDem(danhGia.sample_count) && Array.isArray(danhGia.folds) &&
    (danhGia.status === 'insufficient_data' ? danhGia.mae === null : Number.isFinite(danhGia.mae) && danhGia.mae >= 0 && danhGia.sample_count > 0))
  if (duLieu.status === 'ready') {
    kiemTra(Array.isArray(duLieu.history) && duLieu.history.length === 7 && duLieu.history.every((d,i) => ngayHopLe(d.day) && soDem(d.count) && Date.parse(d.day) === Date.parse(duLieu.cutoff_date)-(7-i)*86400000) && duLieu.history.reduce((n,d)=>n+d.count,0) === duLieu.training?.borrow_count)
    kiemTra(duLieu.training && ngayHopLe(duLieu.training.start_date) && ngayHopLe(duLieu.training.end_date) && Date.parse(duLieu.training.start_date) === Date.parse(duLieu.cutoff_date) - 7 * 86400000 && Date.parse(duLieu.training.end_date) === Date.parse(duLieu.cutoff_date) - 86400000 && duLieu.training.observed_days === 7 && soDem(duLieu.training.borrow_count) && duLieu.coverage?.status === 'verified' && ngayHopLe(duLieu.coverage.start_date) && ngayHopLe(duLieu.coverage.end_date) && duLieu.predictions.length === 7 && duLieu.predictions.every((muc, i) =>
      ngayHopLe(muc.forecast_date) && Date.parse(muc.forecast_date) === Date.parse(duLieu.cutoff_date) + (i + 1) * 86400000 && typeof muc.predicted_count === 'string' && /^\d+\.\d{2}$/.test(muc.predicted_count) && Number.isFinite(Number(muc.predicted_count)) && Number(muc.predicted_count) >= 0 && Number(muc.predicted_count) <= 9999999999))
  } else kiemTra(typeof duLieu.reason === 'string' && duLieu.predictions.length === 0)
  return duLieu
}
export function loiPhanTich(loi) {
  if (loi?.code === 'ANALYTICS_RESPONSE_INVALID') return 'Phản hồi số liệu không hợp lệ hoặc có giá trị bất thường. Không thể hiển thị; hãy tải lại hoặc liên hệ người quản lý.'
  if (loi?.code === 'ANALYTICS_FORBIDDEN') return 'Bạn không có quyền xem nội dung này.'
  return chuanHoaLoiApi(loi).message
}

export const cotDuBao = [{key:'forecast_date',header:'Ngày dự báo (UTC)'},{key:'predicted_count',header:'Số phiếu dự kiến/ngày'}]
