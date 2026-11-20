import { SquareDashed } from 'lucide-react'
import NhanTrangThai from "../../thanh-phan/giao-dien/NhanTrangThai.jsx"
import BieuTuong from "../../thanh-phan/giao-dien/BieuTuong.jsx"
import TrangThaiTrong from "../../thanh-phan/giao-dien/TrangThaiTrong.jsx"
import { The } from "../../thanh-phan/giao-dien/The.jsx"

export default function TrangNoiDungMau({ title }) {
  return <div className="app-page"><div className="app-page-intro"><p className="app-eyebrow">Placeholder / Outlet</p><h1>{title}</h1><p>Một route con tối thiểu để kiểm tra việc thay đổi nội dung trong layout.</p></div><The className="app-placeholder"><NhanTrangThai>Trang mẫu kỹ thuật</NhanTrangThai><TrangThaiTrong icon={<BieuTuong icon={SquareDashed} size={28} />} title="Nội dung sẽ được xây dựng sau" description="Đây chưa phải Catalog, Dashboard hoặc màn hình nghiệp vụ. Không có dữ liệu nào được tải hay lưu." /></The></div>
}
