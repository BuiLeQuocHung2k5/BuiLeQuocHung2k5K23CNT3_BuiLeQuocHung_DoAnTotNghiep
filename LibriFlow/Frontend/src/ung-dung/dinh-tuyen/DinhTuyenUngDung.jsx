import { Navigate, Outlet, Route, Routes } from 'react-router'
import { lazy, Suspense } from 'react'
import TrangNenTang from "../../chuc-nang/nen-tang/TrangNenTang.jsx"
import TrangKhongTimThay from "../../trang/TrangKhongTimThay.jsx"
import VongTai from "../../thanh-phan/giao-dien/VongTai.jsx"
import BaoVeDangNhap from '../../chuc-nang/xac-thuc/BaoVeDangNhap.jsx'
import TrangDangNhap from '../../chuc-nang/xac-thuc/TrangDangNhap.jsx'
import TrangKhongCoQuyen from '../../trang/TrangKhongCoQuyen.jsx'
import TrangDangKy from '../../chuc-nang/xac-thuc/TrangDangKy.jsx'
import { useXacThuc } from '../../chuc-nang/xac-thuc/useXacThuc.js'
import ChanTrang from '../../bo-cuc/ChanTrang.jsx'

const TrangHeThongGiaoDien = lazy(() => import("../../chuc-nang/he-thong-giao-dien/TrangHeThongGiaoDien.jsx"))
const DinhTuyenKhung = lazy(() => import("../../chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx"))

export default function DinhTuyenUngDung() {
  const { daDangNhap } = useXacThuc()
  return (
    <Routes>
      <Route path="/" element={<Navigate to={daDangNhap ? '/app' : '/dang-nhap'} replace />} />
      <Route path="/kiem-tra-nen-tang" element={<TrangNenTang />} />
      <Route element={<div className="auth-frame"><Outlet /><ChanTrang /></div>}>
        <Route path="/dang-nhap" element={<TrangDangNhap />} />
        <Route path="/dang-ky" element={<TrangDangKy />} />
      </Route>
      <Route path="/admin" element={<Navigate to="/app/admin" replace />} />
      <Route path="/403" element={<BaoVeDangNhap><TrangKhongCoQuyen /></BaoVeDangNhap>} />
      <Route path="/app/*" element={<BaoVeDangNhap><Suspense fallback={<div className="p-8"><VongTai label="Đang tải khung ứng dụng" /></div>}><DinhTuyenKhung /></Suspense></BaoVeDangNhap>} />
      <Route path="/design-system" element={<Suspense fallback={<div className="p-8"><VongTai label="Đang tải Design System" /></div>}><TrangHeThongGiaoDien /></Suspense>} />
      <Route path="*" element={<TrangKhongTimThay />} />
    </Routes>
  )
}
