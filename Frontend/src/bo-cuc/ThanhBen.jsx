import { Link } from 'react-router'
import BieuTuong from "../thanh-phan/giao-dien/BieuTuong.jsx"
import { thuongHieuUngDung, DUONG_DAN_UNG_DUNG } from "../ung-dung/dinh-tuyen/cau-hinh-tuyen.js"
import DieuHuongUngDung from "./DieuHuongUngDung.jsx"

function NoiDungThanhBen({ groups: cacNhom }) {
  return (
    <div className="app-sidebar-content">
<<<<<<< HEAD:Frontend/src/bo-cuc/ThanhBen.jsx
      <Link to={DUONG_DAN_UNG_DUNG} className="app-brand" aria-label="LibriFlow — trang chủ thư viện">
=======
      <Link to={DUONG_DAN_UNG_DUNG} className="app-brand" aria-label="LibriFlow — khung ứng dụng">
>>>>>>> 411c8e4b6c23e5c1bdeae8debb7d768ea7b913be:LibriFlow/Frontend/src/bo-cuc/ThanhBen.jsx
        <span className="app-brand-mark"><BieuTuong icon={thuongHieuUngDung.icon} size={25} /></span>
        <span><span className="app-brand-name">{thuongHieuUngDung.name}</span><span className="app-brand-caption">{thuongHieuUngDung.caption}</span></span>
      </Link>
      <DieuHuongUngDung groups={cacNhom} />
<<<<<<< HEAD:Frontend/src/bo-cuc/ThanhBen.jsx
=======
      <div className="app-sidebar-footnote"><NhanTrangThai>FE-04 · Layout</NhanTrangThai><p>Khung giao diện độc lập.<br />Chức năng sẽ được tích hợp sau.</p></div>
>>>>>>> 411c8e4b6c23e5c1bdeae8debb7d768ea7b913be:LibriFlow/Frontend/src/bo-cuc/ThanhBen.jsx
    </div>
  )
}

export default function ThanhBen({ groups: cacNhom }) {
  return <aside className="app-sidebar" aria-label="Điều hướng ứng dụng"><NoiDungThanhBen groups={cacNhom} /></aside>
}
