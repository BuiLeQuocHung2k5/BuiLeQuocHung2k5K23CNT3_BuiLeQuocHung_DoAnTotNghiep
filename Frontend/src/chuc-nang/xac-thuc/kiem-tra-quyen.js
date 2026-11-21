// Tên hỗ trợ đối chiếu Backend/sql/seeds/initial-permissions.sql; không phải bảng gán quyền theo role.
const CAC_VAI_TRO = ['admin', 'librarian', 'reader']
const CAC_QUYEN = ['book_view', 'book_create', 'book_update', 'book_delete', 'copy_manage', 'borrow_manage',
  'return_process', 'fine_manage', 'user_manage', 'report_view', 'forecast_view', 'category_manage']

export function coQuyenTruyCap(nguoiDung, yeuCau) {
  if (!nguoiDung) return false
  // Không gắn yêu cầu quyền vào các trang chỉ cần đăng nhập.
  if (yeuCau === undefined) return true
  if (!yeuCau || typeof yeuCau !== 'object' || Array.isArray(yeuCau) ||
    Object.keys(yeuCau).some(khoa => !['vaiTro', 'quyen'].includes(khoa))) return false
  const { vaiTro, quyen } = yeuCau
  if (vaiTro === undefined && quyen === undefined) return false
  if (nguoiDung.status !== 'active' || !Array.isArray(nguoiDung.roles) || ![...nguoiDung.roles].every(muc => typeof muc === 'string') ||
    !nguoiDung.roles.some(muc => CAC_VAI_TRO.includes(muc)) || !Array.isArray(nguoiDung.permissions) ||
    ![...nguoiDung.permissions].every(muc => typeof muc === 'string')) return false
  // Một role trong allowlist; mọi permission được yêu cầu. Khi có cả hai thì phải đạt cả hai.
  if (vaiTro !== undefined && (!Array.isArray(vaiTro) || !vaiTro.length || ![...vaiTro].every(muc => CAC_VAI_TRO.includes(muc)) ||
    !vaiTro.some(muc => nguoiDung.roles.includes(muc)))) return false
  if (quyen !== undefined && (!Array.isArray(quyen) || !quyen.length || ![...quyen].every(muc => CAC_QUYEN.includes(muc)) ||
    !quyen.every(muc => nguoiDung.permissions.includes(muc)))) return false
  return true
}

export function locDieuHuongTheoQuyen(cacNhom, nguoiDung, daDangNhap) {
  return cacNhom.map(nhom => ({ ...nhom, items: nhom.items.filter(muc => {
    if (muc.yeuCauTruyCap !== undefined) return daDangNhap && coQuyenTruyCap(nguoiDung, muc.yeuCauTruyCap)
    return !muc.canDangNhap || daDangNhap
  }) })).filter(nhom => nhom.items.length > 0)
}
