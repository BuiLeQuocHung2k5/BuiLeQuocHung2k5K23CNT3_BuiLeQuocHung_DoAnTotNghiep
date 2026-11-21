import { Link } from 'react-router'
import BieuTuong from "../thanh-phan/giao-dien/BieuTuong.jsx"
import NhanTrangThai from "../thanh-phan/giao-dien/NhanTrangThai.jsx"
import { thuongHieuUngDung, DUONG_DAN_UNG_DUNG } from "../ung-dung/dinh-tuyen/cau-hinh-tuyen.js"
import DieuHuongUngDung from "./DieuHuongUngDung.jsx"

function NoiDungThanhBen({ groups: cacNhom }) {
  return (
    <div className="app-sidebar-content">
      <Link to={DUONG_DAN_UNG_DUNG} className="app-brand" aria-label="LibriFlow — khung ứng dụng">
        <span className="app-brand-mark"><BieuTuong icon={thuongHieuUngDung.icon} size={25} /></span>
        <span><span className="app-brand-name">{thuongHieuUngDung.name}</span><span className="app-brand-caption">{thuongHieuUngDung.caption}</span></span>
      </Link>
      <DieuHuongUngDung groups={cacNhom} />
      <div className="app-sidebar-footnote"><NhanTrangThai>FE-04 · Layout</NhanTrangThai><p>Khung giao diện độc lập.<br />Chức năng sẽ được tích hợp sau.</p></div>
    </div>
  )
}

export default function ThanhBen({ groups: cacNhom }) {
  return <aside className="app-sidebar" aria-label="Điều hướng ứng dụng"><NoiDungThanhBen groups={cacNhom} /></aside>
}
