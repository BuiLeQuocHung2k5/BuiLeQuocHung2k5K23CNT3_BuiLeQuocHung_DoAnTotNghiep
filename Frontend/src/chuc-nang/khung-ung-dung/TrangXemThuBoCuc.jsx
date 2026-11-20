import { useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import DanhSachChon from "../../thanh-phan/giao-dien/DanhSachChon.jsx"
import NhanTrangThai from "../../thanh-phan/giao-dien/NhanTrangThai.jsx"
import ThongBao from "../../thanh-phan/giao-dien/ThongBao.jsx"
import BieuTuong from "../../thanh-phan/giao-dien/BieuTuong.jsx"
import TrangThaiTrong from "../../thanh-phan/giao-dien/TrangThaiTrong.jsx"
import { The, DauThe, TieuDeThe, MoTaThe, NoiDungThe } from "../../thanh-phan/giao-dien/The.jsx"
import { layDieuHuongVaiTroXemThu, boCucVaiTroXemThu } from "../../ung-dung/dieu-huong/cau-hinh-bo-cuc-vai-tro.js"
import DieuHuongUngDung from "../../bo-cuc/DieuHuongUngDung.jsx"

export default function TrangXemThuBoCuc({ title }) {
  const [tenBanXemThu, datTenBanXemThu] = useState('')
  const banXemThu = boCucVaiTroXemThu[tenBanXemThu]
  return (
    <div className="app-page">
      <div className="app-page-intro"><p className="app-eyebrow">Công cụ kỹ thuật / Navigation preview</p><h1>{title}</h1><p>Thử cách nhóm điều hướng trong cùng một App Shell, trước khi tích hợp tài khoản.</p></div>
      <ThongBao title="Chỉ là bản xem trước, không phải phân quyền" variant="info">Lựa chọn bên dưới chỉ thay đổi danh sách minh họa. Không đăng nhập, đọc token hay cấp quyền; các mục nghiệp vụ chưa có route.</ThongBao>
      <div className="app-preview-grid">
        <The><DauThe><TieuDeThe as="h2">Chọn bố cục để xem thử</TieuDeThe><MoTaThe>Không lưu lựa chọn vào URL hoặc localStorage.</MoTaThe></DauThe><NoiDungThe><DanhSachChon label="Bố cục dự kiến" placeholder="Chọn một bản xem trước" value={tenBanXemThu} onChange={suKien => datTenBanXemThu(suKien.target.value)} options={Object.entries(boCucVaiTroXemThu).map(([giaTri, muc]) => ({ value: giaTri, label: muc.label }))} helperText="Tên vai trò đối chiếu ma trận FE-01; không suy quyền từ tên vai trò." /></NoiDungThe></The>
        <The><DauThe><TieuDeThe as="h2">Điều hướng minh họa</TieuDeThe><MoTaThe>{banXemThu ? banXemThu.description : 'Chưa chọn cấu hình hiển thị.'}</MoTaThe></DauThe><NoiDungThe>
          {banXemThu ? <><NhanTrangThai>Preview · {banXemThu.label}</NhanTrangThai><DieuHuongUngDung label="Bản xem trước điều hướng" groups={layDieuHuongVaiTroXemThu(tenBanXemThu)} /><p className="app-muted">Các mục chỉ là nhãn dự kiến. Chức năng và policy sẽ được xác định riêng ở nhiệm vụ phù hợp.</p></> : <TrangThaiTrong icon={<BieuTuong icon={LayoutTemplate} size={24} />} title="Chọn một bố cục" description="Xem thử cách tổ chức menu; không có phiên đăng nhập được tạo." />}
        </NoiDungThe></The>
      </div>
    </div>
  )
}
