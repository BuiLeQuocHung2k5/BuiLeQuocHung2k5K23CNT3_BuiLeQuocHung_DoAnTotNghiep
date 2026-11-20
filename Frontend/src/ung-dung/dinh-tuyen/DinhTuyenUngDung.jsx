import { Route, Routes } from 'react-router'
import { lazy, Suspense } from 'react'
import TrangNenTang from "../../chuc-nang/nen-tang/TrangNenTang.jsx"
import TrangKhongTimThay from "../../trang/TrangKhongTimThay.jsx"
import VongTai from "../../thanh-phan/giao-dien/VongTai.jsx"

const TrangHeThongGiaoDien = lazy(() => import("../../chuc-nang/he-thong-giao-dien/TrangHeThongGiaoDien.jsx"))
const DinhTuyenKhung = lazy(() => import("../../chuc-nang/khung-ung-dung/DinhTuyenKhung.jsx"))

export default function DinhTuyenUngDung() {
  return (
    <Routes>
      <Route path="/" element={<TrangNenTang />} />
      <Route path="/app/*" element={<Suspense fallback={<div className="p-8"><VongTai label="Đang tải khung ứng dụng" /></div>}><DinhTuyenKhung /></Suspense>} />
      <Route path="/design-system" element={<Suspense fallback={<div className="p-8"><VongTai label="Đang tải Design System" /></div>}><TrangHeThongGiaoDien /></Suspense>} />
      <Route path="*" element={<TrangKhongTimThay />} />
    </Routes>
  )
}
