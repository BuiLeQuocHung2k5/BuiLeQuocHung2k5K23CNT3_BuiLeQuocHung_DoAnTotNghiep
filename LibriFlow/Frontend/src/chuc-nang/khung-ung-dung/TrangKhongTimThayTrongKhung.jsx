import { Link } from 'react-router'
import { ArrowLeft, Signpost } from 'lucide-react'
import BieuTuong from "../../thanh-phan/giao-dien/BieuTuong.jsx"
import TrangThaiTrong from "../../thanh-phan/giao-dien/TrangThaiTrong.jsx"
import { The } from "../../thanh-phan/giao-dien/The.jsx"
import { DUONG_DAN_UNG_DUNG } from "../../ung-dung/dinh-tuyen/cau-hinh-tuyen.js"

export default function TrangKhongTimThayTrongKhung() {
  return <div className="app-page"><div className="app-page-intro"><p className="app-eyebrow">404 / Không gian ứng dụng</p><h1>Không tìm thấy trang</h1><p>Đường dẫn này chưa được khai báo trong khung ứng dụng.</p></div><The><TrangThaiTrong icon={<BieuTuong icon={Signpost} size={28} />} title="Một lối rẽ chưa có nội dung" description="Bạn có thể quay về trang khởi đầu; điều hướng của ứng dụng vẫn ở đây." action={<Link className="app-text-link" to={DUONG_DAN_UNG_DUNG}><BieuTuong icon={ArrowLeft} size={16} />Về khung ứng dụng</Link>} /></The></div>
}
