import { Link } from 'react-router'
import { ChevronRight, UserRound } from 'lucide-react'
import BieuTuong from "../thanh-phan/giao-dien/BieuTuong.jsx"
import DieuHuongDiDong from "./DieuHuongDiDong.jsx"
import { DUONG_DAN_UNG_DUNG } from "../ung-dung/dinh-tuyen/cau-hinh-tuyen.js"

export default function DauTrang({ pageTitle: tieuDeTrang, groups: cacNhom, isDesktop: laDesktop, routeKey: khoaTuyen, mainRef: thamChieuNoiDung }) {
  return (
    <header className="app-header">
      {!laDesktop && <DieuHuongDiDong key={khoaTuyen} groups={cacNhom} mainRef={thamChieuNoiDung} />}
      <nav className="app-breadcrumb" aria-label="Đường dẫn trang"><ol>
        <li><Link to={DUONG_DAN_UNG_DUNG}>Ứng dụng</Link></li>
        <li aria-hidden="true"><BieuTuong icon={ChevronRight} size={14} /></li>
        <li><span aria-current="page">{tieuDeTrang}</span></li>
      </ol></nav>
      <div className="app-account-slot" aria-label="Khu vực tài khoản chưa tích hợp"><BieuTuong icon={UserRound} size={18} /><span>Tài khoản chưa tích hợp</span></div>
    </header>
  )
}
