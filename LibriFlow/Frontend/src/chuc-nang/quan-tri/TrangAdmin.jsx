import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import { The, DauThe, TieuDeThe, MoTaThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import NhanTrangThai from '../../thanh-phan/giao-dien/NhanTrangThai.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import { layTongQuanThongKe } from '../phan-tich/dich-vu-phan-tich.js'
import { chuanHoaLoiApi } from '../../thu-vien/api/chuan-hoa-loi.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'

const cacTongSo = [['books_total', 'Đầu sách'], ['copies_total', 'Bản sao sách'], ['users_total', 'Tài khoản trong hệ thống']]

export default function TrangAdmin() {
  const { nguoiDung, tokenTruyCap, daDangNhap } = useXacThuc()
  const quanLyNguoiDung = coQuyenTruyCap(nguoiDung, { quyen: ['user_manage'] })
  const quanLyMuonTra = coQuyenTruyCap(nguoiDung, { quyen: ['borrow_manage'] })
  const xemTongQuan = coQuyenTruyCap(nguoiDung, { quyen: ['report_view'] })
  const xemDuBao = coQuyenTruyCap(nguoiDung, { quyen: ['forecast_view'] })
  const tongQuan = useQuery({ queryKey: ['admin', nguoiDung?.user_id, 'tong-quan'], enabled: daDangNhap && xemTongQuan && !moiTruong.error,
    queryFn: async ({ signal }) => {
      const phanHoi = await layTongQuanThongKe({ nguoiDung, tokenTruyCap, daDangNhap }, {}, { signal })
      return phanHoi.data
    }, retry: false, staleTime: 0, refetchOnWindowFocus: false })
  return <div className="app-page">
    <div className="app-page-intro"><p className="app-eyebrow">KHU VỰC QUẢN TRỊ</p><h1>Xin chào, {nguoiDung?.name}</h1><p>Truy cập các chức năng thư viện được cấp quyền cho tài khoản hiện tại.</p></div>
    <The><DauThe><TieuDeThe as="h2">Tài khoản đang sử dụng</TieuDeThe></DauThe><NoiDungThe><p>{nguoiDung?.name}</p><p>{nguoiDung?.email}</p>
      <NhanTrangThai>{nguoiDung?.status === 'active' ? 'Đang hoạt động' : 'Tài khoản cần kiểm tra'}</NhanTrangThai>
      <p><Link className="app-text-link" to="/app/tai-khoan">Xem hồ sơ của tôi</Link></p></NoiDungThe></The>
    {xemTongQuan && <section aria-label="Tổng quan thư viện">
      {moiTruong.error ? <ThongBao variant="warning" title="Chưa kết nối dịch vụ tổng quan">Chưa thể tải số liệu thư viện.</ThongBao> : tongQuan.isError ? <ThongBao variant="error" role="alert" title="Chưa tải được tổng quan">{chuanHoaLoiApi(tongQuan.error).message}</ThongBao> : tongQuan.isPending ? <p role="status">Đang tải tổng quan…</p> : tongQuan.data &&
        <div className="app-overview-grid">{cacTongSo.map(([khoa, nhan]) => <The key={khoa}><DauThe><TieuDeThe as="h2">{nhan}</TieuDeThe></DauThe><NoiDungThe><strong>{tongQuan.data[khoa]}</strong></NoiDungThe></The>)}</div>}
      <NutBam variant="ghost" disabled={Boolean(moiTruong.error) || tongQuan.isFetching} onClick={() => void tongQuan.refetch()}>Tải lại tổng quan</NutBam>
      <Link className="app-text-link" to="/app/thong-ke">Thống kê chi tiết</Link>
    </section>}
    <div className="app-overview-grid" aria-label="Lối tắt quản trị">
      {xemDuBao && <The><DauThe><TieuDeThe as="h2">Dự báo tần suất</TieuDeThe></DauThe><NoiDungThe><p className="app-muted">Xem mức ước lượng phiếu mượn theo ngày khi dữ liệu đủ điều kiện.</p><Link className="app-text-link" to="/app/du-bao">Xem dự báo tần suất</Link></NoiDungThe></The>}
      {quanLyNguoiDung && <The><DauThe><TieuDeThe as="h2">Quản lý người dùng</TieuDeThe></DauThe><NoiDungThe><p className="app-muted">Tra cứu, thêm tài khoản và quản lý quyền truy cập thư viện.</p><Link className="app-text-link" to="/app/nguoi-dung">Mở quản lý người dùng</Link></NoiDungThe></The>}
      <The><DauThe><TieuDeThe as="h2">Danh mục sách</TieuDeThe><MoTaThe>Tra cứu đầu sách, ảnh bìa và bản sao.</MoTaThe></DauThe><NoiDungThe><p className="app-muted">Các thao tác thêm, sửa, xóa tiếp tục yêu cầu quyền tương ứng.</p><Link className="app-text-link" to="/app/sach">Mở quản lý sách</Link></NoiDungThe></The>
      {quanLyMuonTra && <The><DauThe><TieuDeThe as="h2">Mượn / Trả sách</TieuDeThe><MoTaThe>Theo dõi phiếu mượn và tình trạng trả sách.</MoTaThe></DauThe><NoiDungThe><p className="app-muted">Ghi nhận trả sách cần được cấp thêm quyền trả.</p><Link className="app-text-link" to="/app/muon-tra">Mở quản lý mượn/trả</Link></NoiDungThe></The>}
    </div>
  </div>
}
