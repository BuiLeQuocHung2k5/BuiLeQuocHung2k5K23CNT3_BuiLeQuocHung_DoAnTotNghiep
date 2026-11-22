import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { yeuCauQuyen } from '../middlewares/xac-thuc.js'
import { LoiHttp } from '../utils/loi-http.js'
import { kiemTraMa, kiemTraTruyVanSach } from '../utils/kiem-tra-sach.js'
import { kiemTraDoiTuong, kiemTraVanBan, kiemTraEmail, kiemTraMatKhau } from '../utils/kiem-tra-xac-thuc.js'
import { taoMoHinhNguoiDung } from '../models/nguoi-dung.model.js'

export const vaiTro = ['admin', 'librarian', 'reader']
const trangThai = ['active', 'inactive', 'locked']
function enumHopLe(khoa, value, tap) {
  if (!tap.includes(value)) throw new LoiHttp(400, 'VALIDATION_ERROR', 'Giá trị không hợp lệ.', [{ field: khoa }])
  return value
}
function noiDung(body, taoMoi) {
  kiemTraDoiTuong(body, ['name', 'email', 'phone', 'role', 'status', ...(taoMoi ? ['password'] : [])])
  if (!Object.keys(body).length) throw new LoiHttp(400, 'VALIDATION_ERROR', 'Thiếu trường cập nhật.')
  const data = {}
  if (taoMoi || 'name' in body) data.name = kiemTraVanBan(body.name, 'name', 100)
  if (taoMoi || 'email' in body) data.email = kiemTraEmail(body.email)
  if (taoMoi || 'phone' in body) data.phone = kiemTraVanBan(body.phone, 'phone', 20, false) || null
  if (taoMoi || 'role' in body) data.role = enumHopLe('role', body.role, vaiTro)
  if (taoMoi || 'status' in body) data.status = enumHopLe('status', body.status === undefined ? 'active' : body.status, trangThai)
  return data
}
export function taoTuyenNguoiDung(db, xacThuc) {
  const router = Router(), model = taoMoHinhNguoiDung(db)
  router.use(xacThuc, yeuCauQuyen('user_manage'))
  router.get('/', async (req, res) => {
    const { role, status, ...query } = req.query
    const loc = kiemTraTruyVanSach(query)
    if (role !== undefined) loc.role = enumHopLe('role', role, vaiTro)
    if (status !== undefined) loc.status = enumHopLe('status', status, trangThai)
    res.json({ success: true, ...await model.danhSach(loc, req.auth) })
  })
  router.get('/:id', async (req, res) => res.json({ success: true, data: await model.chiTiet(kiemTraMa(req.params.id)) }))
  router.post('/', async (req, res) => {
    const data = noiDung(req.body, true)
    const hash = await bcrypt.hash(kiemTraMatKhau(req.body.password, true), 12)
    res.status(201).json({ success: true, data: await model.luu(req.auth.user_id, null, data, hash) })
  })
  router.patch('/:id', async (req, res) => {
    const data = await model.luu(req.auth.user_id, kiemTraMa(req.params.id), noiDung(req.body, false))
    res.json({ success: true, data })
  })
  return router
}
