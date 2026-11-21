import { useState } from 'react'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import VungNhap from '../../thanh-phan/giao-dien/VungNhap.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import { useDanhMucCongKhai } from '../api-cong-khai/truy-van-cong-khai.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { kiemTraBieuMauSach } from './dich-vu-sach.js'

export default function BieuMauSach({ sach, dangGui, duQuyen, loiServer, onSave: luu, onCancel: huy }) {
  const [giaTri, datGiaTri] = useState(() => ({ title: sach?.title ?? '', author: sach?.author ?? '', publisher: sach?.publisher ?? null,
    category_id: sach?.category_id ?? null, series_id: sach?.series_id ?? null, description: sach?.description ?? null, publication_year: sach?.publication_year ?? null }))
  const [loi, datLoi] = useState({})
  const [tuKhoa, datTuKhoa] = useState('')
  const [tim, datTim] = useState('')
  const [loiTraCuu, datLoiTraCuu] = useState('')
  const danhMuc = useDanhMucCongKhai({ page: 1, limit: 100, search: tim }, { enabled: !moiTruong.error })
  const cacDanhMuc = Array.isArray(danhMuc.data?.data?.data) ? danhMuc.data.data.data.filter(muc => muc && typeof muc.category_id === 'string' && typeof muc.name === 'string') : []
  const cacLuaChon = [{ value: 'none', label: 'Chưa phân loại' }, ...cacDanhMuc.map(muc => ({ value: muc.category_id, label: muc.name }))]
  if (giaTri.category_id && !cacDanhMuc.some(muc => muc.category_id === giaTri.category_id)) cacLuaChon.push({ value: giaTri.category_id, label: `Thể loại #${giaTri.category_id} (đã gán)` })
  const loiCuaTruong = khoa => loi[khoa] ?? loiServer?.loiTruong[khoa]
  const dangKhoa = dangGui || !duQuyen || loiServer?.chuaRo
  function doiTruong(khoa, giaTriMoi) { datGiaTri(cu => ({ ...cu, [khoa]: giaTriMoi })); datLoi(cu => ({ ...cu, [khoa]: undefined })) }
  function timTheLoai() {
    if (!tuKhoa.isWellFormed() || [...tuKhoa.trim()].length > 255) { datLoiTraCuu('Từ khóa tối đa 255 ký tự Unicode hợp lệ.'); return }
    datLoiTraCuu(''); datTim(tuKhoa.trim())
  }
  function gui(suKien) {
    suKien.preventDefault()
    if (dangKhoa) return
    const ketQua = kiemTraBieuMauSach(giaTri)
    datLoi(ketQua.loi)
    if (!Object.keys(ketQua.loi).length) void luu(ketQua.duLieu)
  }
  return <form className="book-form" onSubmit={gui} noValidate aria-label={sach ? 'Sửa sách' : 'Thêm sách'} aria-busy={dangGui}>
    {!duQuyen && <ThongBao variant="warning" title="Không đủ quyền">Bạn không có quyền lưu thay đổi này.</ThongBao>}
    <div className="book-form-grid">
      <ONhap label="Tên sách" required value={giaTri.title} onChange={suKien => doiTruong('title', suKien.target.value)} error={loiCuaTruong('title')} disabled={dangKhoa} />
      <ONhap label="Tác giả" required value={giaTri.author} onChange={suKien => doiTruong('author', suKien.target.value)} error={loiCuaTruong('author')} disabled={dangKhoa} />
      <ONhap label="Nhà xuất bản" value={giaTri.publisher ?? ''} onChange={suKien => doiTruong('publisher', suKien.target.value)} error={loiCuaTruong('publisher')} disabled={dangKhoa} />
      <ONhap label="Năm xuất bản" type="number" min={0} max={65535} step={1} value={giaTri.publication_year ?? ''} onChange={suKien => doiTruong('publication_year', suKien.target.value)} error={loiCuaTruong('publication_year')} disabled={dangKhoa} />
      <div className="book-category-picker">
        <div className="book-category-search"><ONhap label="Tìm thể loại" value={tuKhoa} onChange={suKien => datTuKhoa(suKien.target.value)} disabled={dangKhoa} error={loiTraCuu}
          onKeyDown={suKien => { if (suKien.key === 'Enter') { suKien.preventDefault(); if (!dangKhoa) timTheLoai() } }} />
          <NutBam variant="outline" disabled={dangKhoa} onClick={timTheLoai}>Tìm thể loại</NutBam></div>
        <DanhSachChon label="Thể loại" value={giaTri.category_id ?? 'none'} options={cacLuaChon} disabled={dangKhoa} error={loiCuaTruong('category_id')}
          onChange={suKien => doiTruong('category_id', suKien.target.value === 'none' ? null : suKien.target.value)} helperText="Hiển thị tối đa 100 kết quả; tìm tên để thu hẹp lựa chọn. Thể loại đã gán vẫn được giữ khi không có trong kết quả." />
        {(danhMuc.isError || (danhMuc.isSuccess && !Array.isArray(danhMuc.data?.data?.data))) && <ThongBao variant="warning" title="Chưa tải được thể loại">Bạn vẫn có thể giữ thể loại hiện tại hoặc chọn chưa phân loại. <NutBam variant="ghost" onClick={() => void danhMuc.refetch()} disabled={dangGui}>Thử tải thể loại</NutBam></ThongBao>}
        {danhMuc.isFetching && <p role="status" className="ui-helper">Đang tìm thể loại…</p>}
        {danhMuc.fetchStatus === 'paused' && <p role="status" className="ui-helper">Đang chờ kết nối để tải thể loại.</p>}
      </div>
      <ONhap label="Mã bộ sách" inputMode="numeric" value={giaTri.series_id ?? ''} onChange={suKien => doiTruong('series_id', suKien.target.value)} error={loiCuaTruong('series_id')} disabled={dangKhoa} helperText="Không bắt buộc. Chỉ nhập mã bộ sách đã có nếu bạn biết; để trống nếu không sử dụng." />
      <div className="book-form-wide"><VungNhap label="Mô tả" value={giaTri.description ?? ''} onChange={suKien => doiTruong('description', suKien.target.value)} error={loiCuaTruong('description')} disabled={dangKhoa} /></div>
    </div>
    <div className="book-form-actions"><NutBam variant="outline" onClick={huy} disabled={dangGui}>{loiServer?.chuaRo ? 'Đóng và tải lại' : 'Hủy'}</NutBam><NutBam type="submit" loading={dangGui} disabled={dangKhoa}>{sach ? 'Lưu thay đổi' : 'Thêm sách'}</NutBam></div>
  </form>
}
