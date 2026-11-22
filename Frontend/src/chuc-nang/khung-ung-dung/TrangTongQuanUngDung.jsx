import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Bookmark } from 'lucide-react'
import BieuTuong from '../../thanh-phan/giao-dien/BieuTuong.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import TrangThaiTrong from '../../thanh-phan/giao-dien/TrangThaiTrong.jsx'
import AnhBiaSach from '../sach/AnhBiaSach.jsx'
import { khoaSach, layDanhSachSach, loiSachAnToan } from '../sach/dich-vu-sach.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { cacTrangTrongKhung } from '../../ung-dung/dinh-tuyen/cau-hinh-tuyen.js'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import { coQuyenTruyCap } from '../xac-thuc/kiem-tra-quyen.js'
import '../../kieu-dang/trang-chu.css'

const loiTat = {
  books: 'Tra cứu đầu sách và bản sao',
  borrows: 'Lập phiếu hoặc ghi nhận trả sách',
  reader: 'Xem các phiếu và hạn trả của tôi',
  admin: 'Mở tổng quan quản trị',
  'my-borrows': 'Theo dõi hành trình đọc của bạn',
  account: 'Thông tin tài khoản cá nhân',
  statistics: 'Khám phá hoạt động của thư viện',
  forecasts: 'Xem trước tần suất mượn sách',
}

const thamSoSach = { page: 1, limit: 12, search: '' }

export default function TrangTongQuanUngDung({ title }) {
  const { nguoiDung, daDangNhap } = useXacThuc()
  const sach = useQuery({ queryKey: khoaSach.danhSach(thamSoSach), queryFn: ({ signal }) => layDanhSachSach(thamSoSach, { signal }),
    enabled: daDangNhap && !moiTruong.error, staleTime: 30_000, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const cacTrang = cacTrangTrongKhung.filter(trang => loiTat[trang.id] && coQuyenTruyCap(nguoiDung, trang.yeuCauTruyCap))
  const cacSach = (sach.data?.data?.data ?? []).slice(-4).reverse()
  return <div className="app-page home-page">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-copy"><h1 className="home-eyebrow">{title ?? 'Trang chủ thư viện'}</h1><p className="home-greeting">Xin chào, {nguoiDung?.name ?? 'bạn đọc'}.</p>
        <h2 id="home-title">Mở một cuốn sách.<br /><em>Mở cả thế giới.</em></h2>
        <p>Một góc yên tĩnh, những câu chuyện mới và cả kho tri thức đang chờ bạn khám phá cùng LibriFlow.</p>
        <Link className="home-primary-link" to="/app/sach">Khám phá sách <BieuTuong icon={ArrowRight} size={18} /></Link>
      </div>
      <div className="home-art" aria-hidden="true"><div className="home-art-orbit" /><span className="home-art-star">✦</span><div className="home-art-book home-art-book-one"><BookOpen /><span>Những trang<br />tri thức</span><i>LIBRIFLOW</i></div><div className="home-art-book home-art-book-two"><Bookmark /><span>Mỗi ngày<br />một trang mới</span></div><div className="home-art-shelf" /></div>
    </section>
    <section className="home-discovery" aria-labelledby="home-books-title">
      <div className="home-section-heading"><div><p className="home-eyebrow">DÀNH CHO HÀNH TRÌNH ĐỌC CỦA BẠN</p><h2 id="home-books-title">Sách trong thư viện</h2></div><Link className="app-text-link" to="/app/sach">Xem tất cả <BieuTuong icon={ArrowRight} size={17} /></Link></div>
      {moiTruong.error ? <ThongBao variant="warning" title="Chưa thể tải sách">Dịch vụ sách chưa được kết nối. Vui lòng liên hệ thư viện.</ThongBao>
        : sach.isError ? <ThongBao variant="error" title="Chưa tải được sách" role="alert"><p>{loiSachAnToan(sach.error).message}</p><NutBam variant="outline" onClick={() => void sach.refetch()}>Thử tải sách</NutBam></ThongBao>
          : sach.isPending ? <div className="home-book-grid" role="status" aria-label="Đang tải sách trong thư viện">{[0, 1, 2, 3].map(so => <div className="home-book-skeleton" key={so}><span /><span /></div>)}</div>
            : !cacSach.length ? <TrangThaiTrong title="Những trang sách đang chờ được lấp đầy" description="Thư viện chưa có đầu sách để giới thiệu. Bạn có thể quay lại sau." />
              : <div className="home-book-grid">{cacSach.map(cuon => <article className="home-book-card" key={cuon.book_id}>
                <Link className="home-book-cover" to={`/app/sach?sach=${cuon.book_id}`} aria-label={`Xem chi tiết ${cuon.title}`}><AnhBiaSach sach={cuon} size="the" /></Link>
                <div className="home-book-info"><h3>{cuon.title}</h3><p>{cuon.author}</p><Link className="home-book-detail" to={`/app/sach?sach=${cuon.book_id}`}>Xem chi tiết <BieuTuong icon={ArrowRight} size={15} /></Link></div>
              </article>)}</div>}
    </section>
    <section aria-labelledby="home-shortcuts-title"><div className="home-section-heading"><div><p className="home-eyebrow">THƯ VIỆN TRONG TẦM TAY</p><h2 id="home-shortcuts-title">Bạn muốn làm gì hôm nay?</h2></div></div>
      <div className="home-shortcuts">{cacTrang.map(trang => <Link className="home-shortcut" key={trang.id} to={trang.to}>
        <span className="home-shortcut-icon"><BieuTuong icon={trang.icon} size={22} /></span><span><strong>{trang.title}</strong><span>{loiTat[trang.id]}</span></span><BieuTuong icon={ArrowRight} size={18} />
      </Link>)}</div>
    </section>
    <div className="home-reading-note" role="note"><BieuTuong icon={BookOpen} size={24} /><p>Một chút thời gian cho sách, một khoảng trời rộng hơn cho chính mình.</p><span>Hẹn bạn ở trang sách tiếp theo.</span></div>
  </div>
}
