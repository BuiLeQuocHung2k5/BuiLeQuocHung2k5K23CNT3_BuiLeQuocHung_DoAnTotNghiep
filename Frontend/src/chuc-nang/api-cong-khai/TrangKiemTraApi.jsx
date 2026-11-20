import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import NutBam from "../../thanh-phan/giao-dien/NutBam.jsx"
import ThongBao from "../../thanh-phan/giao-dien/ThongBao.jsx"
import NhanTrangThai from "../../thanh-phan/giao-dien/NhanTrangThai.jsx"
import VongTai from "../../thanh-phan/giao-dien/VongTai.jsx"
import TrangThaiTrong from "../../thanh-phan/giao-dien/TrangThaiTrong.jsx"
import { The, DauThe, TieuDeThe, MoTaThe, NoiDungThe } from "../../thanh-phan/giao-dien/The.jsx"
import { chuanHoaLoiApi } from "../../thu-vien/api/chuan-hoa-loi.js"
import { moiTruong } from "../../cau-hinh/moi-truong.js"
import { khoaTruyVanCongKhai, useSucKhoe, useSachCongKhai, useDanhMucCongKhai } from "./truy-van-cong-khai.js"

function KiemTraDichVu({ title, query: truyVan, queryKey, health: sucKhoe = false }) {
  const trinhKetNoi = useQueryClient()
  const [daHuy, datDaHuy] = useState(false)
  const noiDungPhanHoi = truyVan.data?.data
  const hopLe = sucKhoe ? noiDungPhanHoi?.success === true && typeof noiDungPhanHoi.message === 'string'
    : noiDungPhanHoi?.success === true && Array.isArray(noiDungPhanHoi.data) && noiDungPhanHoi.pagination &&
      ['page', 'limit', 'total', 'totalPages'].every(khoa => Number.isSafeInteger(noiDungPhanHoi.pagination[khoa]) && noiDungPhanHoi.pagination[khoa] >= 0)
  const loi = truyVan.error ? chuanHoaLoiApi(truyVan.error) : null
  return <The><DauThe><TieuDeThe as="h2">{title}</TieuDeThe><MoTaThe>GET công khai · không token · chỉ chạy khi bấm</MoTaThe></DauThe><NoiDungThe>
    <div className="ds-actions">
      <NutBam disabled={truyVan.fetchStatus !== 'idle' || Boolean(moiTruong.error)} onClick={() => { datDaHuy(false); void truyVan.refetch() }}>Kiểm tra {title}</NutBam>
      {truyVan.fetchStatus !== 'idle' && <NutBam variant="outline" onClick={() => { void trinhKetNoi.cancelQueries({ queryKey, exact: true }); datDaHuy(true) }}>Hủy {title}</NutBam>}
    </div>
    <div className="mt-4" aria-live="polite">
      {truyVan.fetchStatus === 'paused' ? <ThongBao title="Đang chờ kết nối mạng">Yêu cầu chưa được gửi; có thể hủy hoặc tiếp tục khi mạng trở lại.</ThongBao>
        : truyVan.isFetching ? <VongTai label={`Đang kiểm tra ${title}`} /> : daHuy ? <ThongBao title="Đã hủy yêu cầu">Không phải lỗi dịch vụ; có thể bấm kiểm tra lại.</ThongBao>
        : loi ? <ThongBao variant="error" title={loi.message}><span>HTTP: {loi.status ?? 'không có'} · Mã: {loi.code}</span></ThongBao>
          : truyVan.isSuccess ? !hopLe ? <ThongBao variant="error" title="Phản hồi không đúng contract">Kiểm tra URL/prefix và định dạng dịch vụ; không dùng response này làm dữ liệu thành công.</ThongBao>
            : <><NhanTrangThai variant="success">HTTP {truyVan.data.status}</NhanTrangThai>{sucKhoe ? <p className="mt-3">Health envelope hợp lệ. Không chứng minh DB hoặc auth đã sẵn sàng.</p>
              : noiDungPhanHoi.data.length === 0 ? <TrangThaiTrong title="Danh sách đang trống" description="API trả thành công với data rỗng; không tạo dữ liệu thay thế." />
                : <p className="mt-3">Nhận {noiDungPhanHoi.data.length} mục · trang {noiDungPhanHoi.pagination.page} · tổng {noiDungPhanHoi.pagination.total}. Không hiển thị nội dung danh mục tại công cụ này.</p>}</>
            : <p className="ui-helper">Chưa gửi yêu cầu trong phiên kiểm tra này; cache có thể được dùng lại khi quay về trang.</p>}
    </div>
  </NoiDungThe></The>
}

export default function TrangKiemTraApi({ title }) {
  const sucKhoe = useSucKhoe(), sach = useSachCongKhai(), danhMuc = useDanhMucCongKhai()
  return <div className="app-page"><div className="app-page-intro"><p className="app-eyebrow">FE-05 / Public API Integration</p><h1>{title}</h1><p>Công cụ kỹ thuật để kiểm tra transport, query lifecycle và trạng thái dữ liệu. Không phải Book Catalog.</p></div>
    {moiTruong.error && <ThongBao variant="warning" title="Cần cấu hình API origin">{moiTruong.error}</ThongBao>}
    <KiemTraDichVu title="Health" query={sucKhoe} queryKey={khoaTruyVanCongKhai.health()} health />
    <KiemTraDichVu title="Books" query={sach} queryKey={khoaTruyVanCongKhai.books()} />
    <KiemTraDichVu title="Categories" query={danhMuc} queryKey={khoaTruyVanCongKhai.categories()} />
  </div>
}
