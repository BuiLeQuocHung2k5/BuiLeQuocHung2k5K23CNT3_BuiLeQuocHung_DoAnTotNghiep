import { Navigate, useLocation } from 'react-router'
import { useXacThuc } from './useXacThuc.js'
import { cacTrangTrongKhung } from '../../ung-dung/dinh-tuyen/cau-hinh-tuyen.js'
import { coQuyenTruyCap } from './kiem-tra-quyen.js'
import TrangKhongCoQuyen from '../../trang/TrangKhongCoQuyen.jsx'

export default function BaoVeDangNhap({ children, yeuCauTruyCap }) {
  const { daDangNhap, nguoiDung } = useXacThuc()
  const { pathname } = useLocation()
  const trang = cacTrangTrongKhung.find(muc => muc.to === pathname.replace(/\/+$/, ''))
  const yeuCau = yeuCauTruyCap === undefined ? trang?.yeuCauTruyCap : yeuCauTruyCap
  // Yêu cầu quyền luôn ưu tiên hơn ngoại lệ demo; cấu hình sai cũng không được bypass.
  if (!daDangNhap) return trang?.congKhaiKyThuat && yeuCau === undefined ? children : <Navigate to="/dang-nhap" replace />
  if (yeuCau !== undefined && !coQuyenTruyCap(nguoiDung, yeuCau)) return <TrangKhongCoQuyen />
  return children
}
