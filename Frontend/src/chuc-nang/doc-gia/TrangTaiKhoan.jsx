import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import AnhDaiDien from '../xac-thuc/AnhDaiDien.jsx'
import { thongBaoLoiHoSo } from '../xac-thuc/dich-vu-xac-thuc.js'
import { The, DauThe, TieuDeThe, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import BieuTuong from '../../thanh-phan/giao-dien/BieuTuong.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import '../../kieu-dang/doc-gia.css'

const tenVaiTro = { admin: 'Quản trị viên', librarian: 'Thủ thư', reader: 'Bạn đọc' }
const trangThai = { active: 'Đang hoạt động', inactive: 'Ngừng hoạt động', locked: 'Bị khóa' }
const SO_DIEN_THOAI = /^(?:0[35789]\d{8}|02\d{9})$/
const DINH_DANG_ANH = ['image/jpeg', 'image/png', 'image/webp']
const SO_BYTE_TOI_DA = 2 * 1024 * 1024

export default function TrangTaiKhoan() {
  const { nguoiDung, capNhatSoDienThoai, capNhatAnhDaiDien } = useXacThuc()
  const oChonTep = useRef(null)
  const [soNhap, datSoNhap] = useState(null)
  const [anhMoi, datAnhMoi] = useState(null)
  const [loiSo, datLoiSo] = useState('')
  const [loiAnh, datLoiAnh] = useState('')
  const [thongBao, datThongBao] = useState(null)
  const [dangLuu, datDangLuu] = useState(null)
  const urlXemTruoc = anhMoi?.url

  useEffect(() => () => { if (urlXemTruoc) URL.revokeObjectURL(urlXemTruoc) }, [urlXemTruoc])

  const vaiTro = nguoiDung?.roles?.map(vaiTro => tenVaiTro[vaiTro] ?? vaiTro).join(', ')
  const giaTriSo = soNhap ?? nguoiDung?.phone ?? ''
  const soDienThoaiMoi = giaTriSo.trim() || null
  const daDoiSo = soDienThoaiMoi !== (nguoiDung?.phone || null)
  const cacTruong = [
    ['Mã tài khoản', nguoiDung?.user_id],
    ['Email', nguoiDung?.email],
    ['Trạng thái', trangThai[nguoiDung?.status] ?? nguoiDung?.status],
  ]

  async function luu(loai, tacVu, thongBaoThanhCong) {
    if (dangLuu) return
    datDangLuu(loai)
    datThongBao(null)
    try {
      await tacVu()
      datThongBao({ variant: 'success', message: thongBaoThanhCong })
    } catch (loi) {
      if (loi?.code !== 'ERR_CANCELED') datThongBao({ variant: 'error', message: thongBaoLoiHoSo(loi) })
    } finally {
      datDangLuu(null)
    }
  }

  function luuSoDienThoai(suKien) {
    suKien.preventDefault()
    if (!daDoiSo) return
    if (soDienThoaiMoi !== null && !SO_DIEN_THOAI.test(soDienThoaiMoi)) {
      datLoiSo('Nhập số điện thoại Việt Nam hợp lệ, bắt đầu bằng 0.')
      return
    }
    void luu('phone', async () => {
      await capNhatSoDienThoai(soDienThoaiMoi)
      datSoNhap(null)
    }, 'Đã cập nhật số điện thoại.')
  }

  function chonAnh(suKien) {
    const tep = suKien.target.files?.[0]
    suKien.target.value = ''
    if (!tep || dangLuu) return
    datLoiAnh('')
    datThongBao(null)
    if (!DINH_DANG_ANH.includes(tep.type) || tep.size === 0 || tep.size > SO_BYTE_TOI_DA) {
      datAnhMoi(null)
      datLoiAnh('Chọn ảnh JPEG, PNG hoặc WebP có dung lượng từ 1 byte đến 2 MB.')
      return
    }
    datAnhMoi({ tep, url: URL.createObjectURL(tep) })
  }

  function luuAnh() {
    if (!anhMoi || loiAnh) return
    void luu('avatar', async () => {
      await capNhatAnhDaiDien(anhMoi.tep)
      datAnhMoi(null)
    }, 'Đã cập nhật ảnh đại diện.')
  }

  return <div className="app-page reader-page">
    <div className="app-page-intro"><h1>Tài khoản của tôi</h1></div>
    {thongBao && <ThongBao variant={thongBao.variant} role={thongBao.variant === 'error' ? 'alert' : 'status'} title={thongBao.message} />}
    <The className="profile-intro">
      <NoiDungThe className="profile-identity">
        {anhMoi && !loiAnh
          ? <span className="profile-avatar profile-avatar--large"><img src={anhMoi.url} alt="Xem trước ảnh đại diện" onError={() => datLoiAnh('Không đọc được ảnh đã chọn. Hãy thử ảnh khác.')} /></span>
          : <AnhDaiDien avatar={nguoiDung?.avatar} lon />}
        <div className="profile-name">
          <TieuDeThe as="h2">{nguoiDung?.name}</TieuDeThe>
          <p>{vaiTro || 'Chưa có vai trò'}</p>
          <input ref={oChonTep} type="file" accept={DINH_DANG_ANH.join(',')} hidden onChange={chonAnh} aria-label="Chọn tệp ảnh đại diện" />
          <div className="profile-actions">
            <NutBam variant="outline" icon={<BieuTuong icon={Camera} size={17} />} onClick={() => oChonTep.current?.click()} disabled={Boolean(dangLuu)}>Thay ảnh đại diện</NutBam>
            {anhMoi && <>
              <NutBam onClick={luuAnh} loading={dangLuu === 'avatar'} disabled={Boolean(dangLuu) || Boolean(loiAnh)}>Lưu ảnh</NutBam>
              <NutBam variant="ghost" onClick={() => { datAnhMoi(null); datLoiAnh('') }} disabled={Boolean(dangLuu)}>Hủy chọn ảnh</NutBam>
            </>}
          </div>
          <p className="ui-helper">JPEG, PNG hoặc WebP. Tối đa 2 MB.</p>
          {loiAnh && <p className="ui-error" role="alert">{loiAnh}</p>}
        </div>
      </NoiDungThe>
    </The>
    <The>
      <DauThe><TieuDeThe as="h2">Thông tin cá nhân</TieuDeThe></DauThe>
      <NoiDungThe className="profile-details">
        <dl className="reader-profile">{cacTruong.map(([nhan, giaTri]) => <div key={nhan}><dt>{nhan}</dt><dd>{giaTri || 'Chưa cung cấp'}</dd></div>)}</dl>
        <form className="profile-phone" onSubmit={luuSoDienThoai}>
          <ONhap label="Số điện thoại" type="tel" inputMode="tel" autoComplete="tel-national" value={giaTriSo}
            onChange={suKien => { datSoNhap(suKien.target.value); datLoiSo('') }} error={loiSo || undefined}
            helperText="Nhập số Việt Nam bắt đầu bằng 0. Để trống nếu bạn muốn xóa số đã lưu." disabled={Boolean(dangLuu)} />
          <div className="profile-actions">
            <NutBam type="submit" disabled={!daDoiSo || Boolean(dangLuu)} loading={dangLuu === 'phone'}>Lưu thay đổi</NutBam>
            {daDoiSo && <NutBam variant="ghost" onClick={() => { datSoNhap(null); datLoiSo('') }} disabled={Boolean(dangLuu)}>Đặt lại</NutBam>}
          </div>
        </form>
      </NoiDungThe>
    </The>
  </div>
}
