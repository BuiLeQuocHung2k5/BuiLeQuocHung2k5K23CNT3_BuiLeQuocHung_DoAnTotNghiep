import { Link, matchPath, useLocation } from 'react-router'
import BieuTuong from "../thanh-phan/giao-dien/BieuTuong.jsx"
import NhanTrangThai from "../thanh-phan/giao-dien/NhanTrangThai.jsx"

export default function DieuHuongUngDung({ groups: cacNhom, label = 'Điều hướng chính', onNavigate: xuLyChuyenTrang }) {
  const { pathname: duongDan } = useLocation()
  return (
    <nav className="app-navigation" aria-label={label}>
      {cacNhom.map(nhom => <div className="app-nav-group" key={nhom.id}>
        <p className="app-nav-heading">{nhom.label}</p>
        <ul>
          {nhom.items.map(muc => {
            const dangChon = muc.to && matchPath({ path: muc.to, end: muc.end ?? true }, duongDan)
            return <li key={muc.id}>
            {muc.to ? <Link
              to={muc.to}
              aria-current={dangChon ? 'page' : undefined}
              className={`app-nav-link${dangChon ? ' is-active' : ''}`}
              onClick={xuLyChuyenTrang}
            ><BieuTuong icon={muc.icon} size={19} /><span>{muc.label}</span></Link> : (
              <span className="app-nav-planned" aria-disabled="true">
                <BieuTuong icon={muc.icon} size={18} /><span>{muc.label}</span><NhanTrangThai>Chưa triển khai</NhanTrangThai>
              </span>
            )}
          </li>})}
        </ul>
      </div>)}
    </nav>
  )
}
