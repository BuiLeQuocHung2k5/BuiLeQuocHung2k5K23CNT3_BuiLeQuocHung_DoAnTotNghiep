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
const TrangMuonTra = lazy(() => import('../muon-tra/TrangMuonTra.jsx'))
const TrangDocGia = lazy(() => import('../doc-gia/TrangDocGia.jsx'))
const TrangLichSuMuon = lazy(() => import('../doc-gia/TrangLichSuMuon.jsx'))
const TrangTaiKhoan = lazy(() => import('../doc-gia/TrangTaiKhoan.jsx'))
const TrangAdmin = lazy(() => import('../quan-tri/TrangAdmin.jsx'))
const TrangNguoiDung = lazy(() => import('../quan-tri/TrangNguoiDung.jsx'))
const TrangThongKe = lazy(() => import('../phan-tich/TrangThongKe.jsx'))
const TrangDuBao = lazy(() => import('../phan-tich/TrangDuBao.jsx'))

const cacTrang = { overview: TrangTongQuanUngDung, books: TrangQuanLySach, borrows: TrangMuonTra, reader: TrangDocGia, 'my-borrows': TrangLichSuMuon, account: TrangTaiKhoan, admin: TrangAdmin, users: TrangNguoiDung, statistics: TrangThongKe, forecasts: TrangDuBao, layouts: TrangXemThuBoCuc, workspace: TrangNoiDungMau, 'api-check': TrangKiemTraApi }

export default function DinhTuyenKhung() {
  return <Routes><Route element={<KhungUngDung />}>
    {cacTrangTrongKhung.map(trang => {
      const Trang = cacTrang[trang.id]
      return <Route key={trang.id} index={trang.path === ''} path={trang.path || undefined} element={<Trang title={trang.title} />} />
    })}
    <Route path="*" element={<TrangKhongTimThayTrongKhung />} />
  </Route></Routes>
}
