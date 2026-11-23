import { useState } from 'react'
import '../../kieu-dang/anh-bia-sach.css'

const thuMuc = `${import.meta.env.BASE_URL}Anh/BiaSach/`
const macDinh = `${thuMuc}bia-sach-mac-dinh.svg`
const chuanHoa = chuoi => typeof chuoi === 'string' ? chuoi.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().trim().replace(/\s+/g, ' ') : ''
// Chưa có ID thực tế được bàn giao. Ghép chính xác cả tên và tác giả, không dựa thứ tự API.
const anhTheoTacPham = new Map([
  ['don quijote|miguel de cervantes', 'don-quijote.jpg'],
  ['doi gio hu|emily bronte', 'doi-gio-hu.jpg'],
])

export default function AnhBiaSach({ sach, size = 'danh-sach' }) {
  const nguon = thuMuc + (anhTheoTacPham.get(`${chuanHoa(sach?.title)}|${chuanHoa(sach?.author)}`) ?? 'bia-sach-mac-dinh.svg')
  const [nguonLoi, datNguonLoi] = useState(null)
  return <img className={`book-cover book-cover--${size}`} src={nguonLoi === nguon ? macDinh : nguon}
    alt={`Bìa sách ${sach?.title ?? 'chưa có ảnh'}`} loading="lazy" onError={() => datNguonLoi(nguon)} />
}
