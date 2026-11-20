import { useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import NutBam from "../thanh-phan/giao-dien/NutBam.jsx"
import HopThoai from "../thanh-phan/giao-dien/HopThoai.jsx"
import BieuTuong from "../thanh-phan/giao-dien/BieuTuong.jsx"
import { NoiDungThanhBen } from "./ThanhBen.jsx"

export default function DieuHuongDiDong({ groups: cacNhom, mainRef: thamChieuNoiDung }) {
  const [dangMo, datTrangThaiMo] = useState(false)
  const thamChieuNutMo = useRef(null)
  const lyDoDong = useRef('dismiss')

  function xuLyDoiTrangThaiMo(trangThaiMoMoi) {
    if (trangThaiMoMoi) lyDoDong.current = 'dismiss'
    datTrangThaiMo(trangThaiMoMoi)
  }

  function xuLyChuyenTrang(suKien) {
    if (suKien.defaultPrevented || suKien.metaKey || suKien.ctrlKey || suKien.shiftKey || suKien.altKey || suKien.button !== 0) return
    lyDoDong.current = 'navigation'
    datTrangThaiMo(false)
  }

  return (
    <HopThoai
      open={dangMo} onOpenChange={xuLyDoiTrangThaiMo}
      trigger={<NutBam ref={thamChieuNutMo} variant="outline" className="app-menu-toggle" aria-label="Mở điều hướng" aria-expanded={dangMo} icon={<BieuTuong icon={Menu} size={20} />}><span>Menu</span></NutBam>}
      title="Điều hướng LibriFlow"
      description="Chọn một trang kỹ thuật. Các chức năng nghiệp vụ chưa được tích hợp."
      className="app-navigation-drawer"
      onCloseAutoFocus={suKien => {
        // Navigation/remount/resize không trả focus về nút đã bị tháo khỏi DOM.
        if (lyDoDong.current === 'navigation' || !thamChieuNutMo.current?.isConnected) {
          suKien.preventDefault()
          if (thamChieuNoiDung.current?.isConnected) {
            thamChieuNoiDung.current.focus()
          } else {
            const noiDungTiepTheo = document.querySelector('main')
            if (noiDungTiepTheo && !noiDungTiepTheo.hasAttribute('tabindex')) noiDungTiepTheo.setAttribute('tabindex', '-1')
            noiDungTiepTheo?.focus()
          }
        }
      }}
    >
      <NoiDungThanhBen groups={cacNhom} onNavigate={xuLyChuyenTrang} />
    </HopThoai>
  )
}
