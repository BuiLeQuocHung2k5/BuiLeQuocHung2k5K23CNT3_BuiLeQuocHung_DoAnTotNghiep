import { BookOpen, ExternalLink, MapPin, Phone } from 'lucide-react'
import BieuTuong from '../thanh-phan/giao-dien/BieuTuong.jsx'
import '../kieu-dang/chan-trang.css'

export default function ChanTrang() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-intro">
            <p className="site-footer-brand"><BieuTuong icon={BookOpen} size={21} />LibriFlow — Thư viện tri thức</p>
            <p>Không gian khám phá sách và theo dõi hành trình đọc của bạn.</p>
          </div>
          <div>
            <p className="site-footer-title">Liên hệ</p>
            <address>
              <span><BieuTuong icon={MapPin} size={16} />Hà Nội, Việt Nam</span>
              <a href="tel:0327048118"><BieuTuong icon={Phone} size={16} />Hotline 0327048118</a>
            </address>
          </div>
          <div>
            <p className="site-footer-title">Mạng xã hội</p>
            <ul className="site-footer-social">
              <li><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">Facebook <BieuTuong icon={ExternalLink} size={14} /></a></li>
              <li><a href="https://x.com/" target="_blank" rel="noopener noreferrer">X <BieuTuong icon={ExternalLink} size={14} /></a></li>
            </ul>
          </div>
        </div>
        <p className="site-footer-credit">© 2026 LibriFlow — Warm Wooden Library.</p>
      </div>
    </footer>
  )
}
