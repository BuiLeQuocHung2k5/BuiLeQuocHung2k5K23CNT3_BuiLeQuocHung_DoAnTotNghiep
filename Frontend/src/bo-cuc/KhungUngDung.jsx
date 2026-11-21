import { useEffect, useRef } from 'react'
import { matchPath, Outlet, useLocation } from 'react-router'
import { dieuHuongNenTang, cacTrangTrongKhung } from "../ung-dung/dinh-tuyen/cau-hinh-tuyen.js"
import ThanhBen from "./ThanhBen.jsx"
import DauTrang from "./DauTrang.jsx"

export default function KhungUngDung({ navigationGroups: cacNhomDieuHuong = dieuHuongNenTang }) {
  const viTri = useLocation()
  const thamChieuNoiDung = useRef(null)
  const duongDanTruoc = useRef(viTri.pathname)
  const trang = cacTrangTrongKhung.find(muc => matchPath({ path: muc.to, end: true }, viTri.pathname))
  const title = trang?.title ?? 'Không tìm thấy trang'

  useEffect(() => {
    const tieuDeTruoc = document.title
    return () => { document.title = tieuDeTruoc }
  }, [])

  useEffect(() => {
    document.title = `${title} · LibriFlow`
    if (duongDanTruoc.current !== viTri.pathname) thamChieuNoiDung.current?.focus()
    duongDanTruoc.current = viTri.pathname
  }, [viTri.pathname, title])

  return (
    <div className="app-shell">
      <a href="#app-main-content" className="app-skip-link" onClick={() => thamChieuNoiDung.current?.focus()}>Đến nội dung chính</a>
      <ThanhBen groups={cacNhomDieuHuong} />
      <div className="app-shell-body">
        <DauTrang pageTitle={title} />
        <main id="app-main-content" className="app-main" tabIndex={-1} ref={thamChieuNoiDung}>
          <div className="app-content"><Outlet /></div>
        </main>
        <footer className="app-footer"><span>LibriFlow · Warm Wooden Library</span><span>FE-04 / Khung giao diện</span></footer>
      </div>
    </div>
  )
}
