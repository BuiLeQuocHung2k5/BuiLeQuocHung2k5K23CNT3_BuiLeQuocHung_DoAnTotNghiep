import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import { layDanhSachPhieu, layChiTietPhieu, maHopLe } from '../muon-tra/dich-vu-muon-tra.js'

export function kiemTraDocGia(phien) {
  if (!phien?.daDangNhap || !maHopLe(phien.nguoiDung?.user_id) || !coQuyenTruyCap(phien.nguoiDung, { vaiTro: ['reader'] })) {
    throw Object.assign(new Error('Không có quyền xem dữ liệu độc giả.'), { code: 'BORROW_FORBIDDEN' })
  }
}
function kiemTraChuSoHuu(phieu, phien) {
  if (phieu.user_id !== phien.nguoiDung.user_id) throw Object.assign(new Error('Phản hồi không đúng chủ sở hữu.'), { code: 'BORROW_RESPONSE_INVALID' })
}
export async function layPhieuCaNhan(phien, { page = 1, limit = 10, status } = {}, { signal } = {}) {
  kiemTraDocGia(phien)
  const thamSo = { page, limit, ...(status ? { status } : {}) }
  // Reader thuần: Backend tự lấy owner từ JWT, cấm user_id query.
  // Có grant quản lý: bắt buộc WHERE user_id=self tại Backend, không tải toàn bộ để lọc ở UI.
  if (coQuyenTruyCap(phien.nguoiDung, { quyen: ['borrow_manage'] })) thamSo.user_id = phien.nguoiDung.user_id
  const ketQua = await layDanhSachPhieu(thamSo, phien, { signal })
  // Từ chối toàn bộ phản hồi sai scope; không lọc bỏ từng hàng rồi trình bày như kết quả hợp lệ.
  ketQua.data.forEach(phieu => kiemTraChuSoHuu(phieu, phien))
  return ketQua
}
export async function layChiTietCaNhan(ma, phien, { signal } = {}) {
  kiemTraDocGia(phien)
  const phieu = await layChiTietPhieu(ma, phien, { signal })
  kiemTraChuSoHuu(phieu, phien)
  return phieu
}
