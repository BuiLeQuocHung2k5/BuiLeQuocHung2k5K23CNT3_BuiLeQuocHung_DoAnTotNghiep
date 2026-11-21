import { Route, Routes } from 'react-router'
import { lazy, Suspense } from 'react'
import TrangNenTang from "../../chuc-nang/nen-tang/TrangNenTang.jsx"
import TrangKhongTimThay from "../../trang/TrangKhongTimThay.jsx"
import VongTai from "../../thanh-phan/giao-dien/VongTai.jsx"
import BaoVeDangNhap from '../../chuc-nang/xac-thuc/BaoVeDangNhap.jsx'
import TrangDangNhap from '../../chuc-nang/xac-thuc/TrangDangNhap.jsx'
import TrangKhongCoQuyen from '../../trang/TrangKhongCoQuyen.jsx'

const TrangHeThongGiaoDien = lazy(() => import("../../chuc-nang/he-thong-giao-dien/TrangHeThongGiaoDien.jsx"))
const DinhTuyenKhung = lazy(() => import("../../chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx"))

export default function DinhTuyenUngDung() {
  return (
    <Routes>
      <Route path="/" element={<TrangNenTang />} />
      <Route path="/dang-nhap" element={<TrangDangNhap />} />
      <Route path="/403" element={<BaoVeDangNhap><TrangKhongCoQuyen /></BaoVeDangNhap>} />
      <Route path="/app/*" element={<BaoVeDangNhap><Suspense fallback={<div className="p-8"><VongTai label="Đang tải khung ứng dụng" /></div>}><DinhTuyenKhung /></Suspense></BaoVeDangNhap>} />
      <Route path="/design-system" element={<Suspense fallback={<div className="p-8"><VongTai label="Đang tải Design System" /></div>}><TrangHeThongGiaoDien /></Suspense>} />
      <Route path="*" element={<TrangKhongTimThay />} />
    </Routes>
  )
}
