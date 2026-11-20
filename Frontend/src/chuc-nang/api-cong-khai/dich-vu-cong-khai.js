import { ketNoiHttp } from "../../thu-vien/api/ket-noi-http.js"

// Dùng cùng canonical params cho request và cache key, không âm thầm bỏ unknown fields.
export function chuanHoaThamSoDanhSach(dauVao = {}) {
  if (Object.keys(dauVao).some(khoa => !['page', 'limit', 'search'].includes(khoa))) throw new TypeError('Unsupported public list parameter')
  const trang = dauVao.page ?? 1, gioiHan = dauVao.limit ?? 10, tuKhoa = dauVao.search ?? ''
  if (!Number.isSafeInteger(trang) || trang < 1 || !Number.isSafeInteger(gioiHan) || gioiHan < 1 || gioiHan > 100 || !Number.isSafeInteger((trang - 1) * gioiHan)) throw new TypeError('Invalid pagination')
  if (typeof tuKhoa !== 'string' || !tuKhoa.isWellFormed() || [...tuKhoa.trim()].length > 255) throw new TypeError('Invalid search')
  return { page: trang, limit: gioiHan, search: tuKhoa.trim() }
}

export function laySachCongKhai(thamSo, { signal: tinHieu } = {}) {
  return ketNoiHttp.get('/books', { params: chuanHoaThamSoDanhSach(thamSo), signal: tinHieu })
}

export function layDanhMucCongKhai(thamSo, { signal: tinHieu } = {}) {
  return ketNoiHttp.get('/categories', { params: chuanHoaThamSoDanhSach(thamSo), signal: tinHieu })
}
