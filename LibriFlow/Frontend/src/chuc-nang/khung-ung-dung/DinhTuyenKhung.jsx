import { Route, Routes } from 'react-router'
import { lazy } from 'react'
import KhungUngDung from "../../bo-cuc/KhungUngDung.jsx"
import { cacTrangTrongKhung } from "../../ung-dung/dinh-tuyen/cau-hinh-tuyen.js"
import TrangTongQuanUngDung from "./TrangTongQuanUngDung.jsx"
import TrangXemThuBoCuc from "./TrangXemThuBoCuc.jsx"
import TrangNoiDungMau from "./TrangNoiDungMau.jsx"
import TrangKhongTimThayTrongKhung from "./TrangKhongTimThayTrongKhung.jsx"

const TrangKiemTraApi = lazy(() => import("../api-cong-khai/TrangKiemTraApi.jsx"))
const TrangQuanLySach = lazy(() => import('../sach/TrangQuanLySach.jsx'))

const cacTrang = { overview: TrangTongQuanUngDung, books: TrangQuanLySach, layouts: TrangXemThuBoCuc, workspace: TrangNoiDungMau, 'api-check': TrangKiemTraApi }

export default function DinhTuyenKhung() {
  return <Routes><Route element={<KhungUngDung />}>
    {cacTrangTrongKhung.map(trang => {
      const Trang = cacTrang[trang.id]
      return <Route key={trang.id} index={trang.path === ''} path={trang.path || undefined} element={<Trang title={trang.title} />} />
    })}
    <Route path="*" element={<TrangKhongTimThayTrongKhung />} />
  </Route></Routes>
}
