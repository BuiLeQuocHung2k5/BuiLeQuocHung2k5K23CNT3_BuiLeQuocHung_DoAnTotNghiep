import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { chuanHoaLoiApi } from '../../thu-vien/api/chuan-hoa-loi.js'
import { useXacThuc } from '../xac-thuc/useXacThuc.js'
import ONhapMatKhau from '../xac-thuc/ONhapMatKhau.jsx'
import { The, NoiDungThe } from '../../thanh-phan/giao-dien/The.jsx'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import HopThoai from '../../thanh-phan/giao-dien/HopThoai.jsx'
import NhanTrangThai from '../../thanh-phan/giao-dien/NhanTrangThai.jsx'
import ThongBao from '../../thanh-phan/giao-dien/ThongBao.jsx'
import '../../kieu-dang/sach.css'

const api = '/admin/users'
const vaiTro = { admin: 'Admin', librarian: 'Thủ thư', reader: 'Độc giả' }
const trangThai = { active: 'Đang hoạt động', inactive: 'Đã vô hiệu hóa', locked: 'Đã khóa' }
const luaChon = (map, keys = Object.keys(map)) => keys.map(value => ({ value, label: map[value] ?? value }))
const tatCa = { value: '', label: 'Tất cả' }
const tenVaiTro = roles => roles.map(r => vaiTro[r] ?? r).join(', ') || 'Chưa gán'
const nhan = status => <NhanTrangThai variant={status === 'active' ? 'success' : 'neutral'}>{trangThai[status]}</NhanTrangThai>
const locDau = { search: '', role: '', status: '' }
const thongBaoLoi = e => {
  const loi = chuanHoaLoiApi(e)
  return ({ EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng.', SELF_ACCESS_CHANGE: 'Bạn cần giữ quyền quản trị của tài khoản đang sử dụng.' })[loi.code] ?? loi.message
}

function MauTaiKhoan({ cu, roles, tuSua, luu, ban }) {
  const [data, dat] = useState({ name: cu?.name ?? '', email: cu?.email ?? '', phone: cu?.phone ?? '',
    role: cu ? (cu.roles.length === 1 ? cu.roles[0] : '') : roles[0], status: cu?.status ?? 'active', password: '' })
  const [xacNhan, datXacNhan] = useState(false)
  const [loi, datLoi] = useState('')
  function doi(k) { return e => { dat({ ...data, [k]: e.target.value }); datXacNhan(false); datLoi('') } }
  function gui(e) {
    e.preventDefault()
    if (!data.name.trim()) { datLoi('Nhập họ tên tài khoản.'); return }
    if (!cu && ([...data.password].length < 4 || [...data.password].length > 12)) {
      datLoi('Mật khẩu khởi tạo cần từ 4 đến 12 ký tự.'); return
    }
    const body = {}
    for (const k of ['name','email','phone']) {
      const value = data[k].trim() || null
      if (!cu || value !== cu[k]) body[k] = value
    }
    if (!cu || cu.status !== data.status) body.status = data.status
    if (data.role && (!cu || cu.roles.length !== 1 || cu.roles[0] !== data.role)) body.role = data.role
    if (!cu) body.password = data.password
    if (cu && (body.role || body.status) && !xacNhan) { datXacNhan(true); return }
    if (!Object.keys(body).length) { datLoi('Thông tin chưa thay đổi.'); return }
    void luu(body)
  }
  return <form className="book-form" onSubmit={gui}><fieldset disabled={ban} className="book-form-grid">
    <ONhap label="Họ tên" value={data.name} onChange={doi('name')} maxLength={100} required />
    <ONhap label="Email" type="email" value={data.email} onChange={doi('email')} maxLength={150} required />
    <ONhap label="Số điện thoại" type="tel" value={data.phone} onChange={doi('phone')} maxLength={20} />
    {!cu && <ONhapMatKhau label="Mật khẩu khởi tạo" autoComplete="new-password" helperText="Từ 4 đến 12 ký tự." value={data.password} onChange={doi('password')} required />}
    <DanhSachChon label="Vai trò tài khoản" disabled={tuSua} value={data.role} onChange={doi('role')} placeholder={cu ? 'Giữ vai trò hiện có: '+tenVaiTro(cu.roles) : 'Chọn vai trò'} options={luaChon(vaiTro, roles)} />
    <DanhSachChon label="Trạng thái tài khoản" disabled={tuSua} value={data.status} onChange={doi('status')} options={luaChon(trangThai)} />
    </fieldset>{loi && <p role="alert">{loi}</p>}
    {xacNhan && <ThongBao variant="warning" title="Xác nhận thay đổi quyền truy cập">Sau khi lưu, {cu.name} sẽ có vai trò {vaiTro[data.role] ?? tenVaiTro(cu.roles)} và trạng thái {trangThai[data.status]}.</ThongBao>}
    <NutBam type="submit" loading={ban}>{xacNhan ? 'Xác nhận lưu' : 'Lưu tài khoản'}</NutBam></form>
}

export default function TrangNguoiDung() {
  const { tokenTruyCap, nguoiDung, lamMoiHoSo } = useXacThuc()
  const client = useQueryClient()
  const [loc, datLoc] = useState(locDau), [params, datParams] = useState({ page: 1, limit: 10 })
  const [modal, datModal] = useState(null), [ban, datBan] = useState(false), [loi, datLoi] = useState('')
  const dangGui = useRef(null)
  useEffect(() => () => dangGui.current?.abort(), [tokenTruyCap])
  const headers = { Authorization: 'Bearer '+tokenTruyCap }
  const khoa = ['quan-tri-nguoi-dung', nguoiDung.user_id]
  const ds = useQuery({ queryKey: [...khoa, 'list', params], queryFn: async ({ signal }) => (await ketNoiHttp.get(api,{ headers, params, signal })).data, retry: false })
  const id = modal?.id
  const ct = useQuery({ queryKey: [...khoa, 'detail', id], enabled: !!id, queryFn: async ({ signal }) => (await ketNoiHttp.get(api+'/'+id,{ headers, signal })).data.data, retry: false })
  const roles = ds.data?.assignable_roles ?? []
  const phanTrang = ds.data?.pagination
  function mo(mode, id) { datLoi(''); datModal({ mode, id }) }
  function dong() { if (!dangGui.current) datModal(null) }
  function doi(k) { return e => datLoc({ ...loc,[k]: e.target.value }) }
  async function luu(body) {
    if (dangGui.current) return
    const boDieuKhien = new AbortController()
    dangGui.current = boDieuKhien
    const config = { headers, signal: boDieuKhien.signal }
    datBan(true); datLoi('')
    try {
      const r = id ? await ketNoiHttp.patch(api+'/'+id,body,config) : await ketNoiHttp.post(api,body,config)
      if (boDieuKhien.signal.aborted) return
      if (id) client.setQueryData([...khoa,'detail',id],r.data.data)
      await client.invalidateQueries({ queryKey: [...khoa,'list'] })
      await client.invalidateQueries({ queryKey: ['admin'] })
      if (boDieuKhien.signal.aborted) return
      if (id === nguoiDung.user_id) await lamMoiHoSo().catch(() => toast.warning('Đã lưu. Vui lòng mở lại phiên để cập nhật tên trên Header.'))
      datModal(null); toast.success(id ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản.')
    } catch (e) { if (!boDieuKhien.signal.aborted) datLoi(thongBaoLoi(e)) }
    finally { dangGui.current = null; datBan(false) }
  }
  const cot = [{key:'user_id',header:'Mã'}, {key:'name',header:'Họ tên'}, {key:'email',header:'Email'}, {key:'phone',header:'Điện thoại', render:v=>v || '—'},
    {key:'roles',header:'Vai trò',render:tenVaiTro}, {key:'status',header:'Trạng thái',render:nhan}, {key:'actions',header:'Thao tác',render:(_,u)=>{
      const sua = u.roles.every(r=>roles.includes(r))
      return <div className="book-row-actions"><NutBam size="sm" variant="ghost" onClick={()=>mo('xem',u.user_id)}>Chi tiết</NutBam>
        {sua && <NutBam size="sm" variant="outline" onClick={()=>mo('sua',u.user_id)}>Sửa</NutBam>}
        {sua && u.user_id !== nguoiDung.user_id && <NutBam size="sm" variant="outline" onClick={()=>mo('trang-thai',u.user_id)}>{u.status==='active'?'Vô hiệu hóa':'Kích hoạt'}</NutBam>}</div>
    }}]
  const u = ct.data
  return <div className="app-page"><div className="book-heading"><h1>Quản lý người dùng</h1>{roles.length>0 && <NutBam onClick={()=>mo('them')}>Thêm người dùng</NutBam>}</div>
    <The><NoiDungThe><form className="book-form-grid" onSubmit={e=>{e.preventDefault();datParams({page:1,limit:10,...Object.fromEntries(Object.entries(loc).filter(([,v])=>v.trim()))})}}>
      <ONhap label="Tìm họ tên hoặc email" maxLength={255} value={loc.search} onChange={doi('search')} />
      <DanhSachChon label="Lọc vai trò" options={[tatCa,...luaChon(vaiTro)]} value={loc.role} onChange={doi('role')} />
      <DanhSachChon label="Lọc trạng thái" options={[tatCa,...luaChon(trangThai)]} value={loc.status} onChange={doi('status')} />
      <NutBam type="submit">Áp dụng bộ lọc</NutBam></form></NoiDungThe></The>
    {ds.isError ? <ThongBao variant="error" title="Chưa tải được tài khoản">{thongBaoLoi(ds.error)} <NutBam onClick={()=>ds.refetch()}>Thử lại</NutBam></ThongBao> :
    <The><Bang caption="Danh sách tài khoản" columns={cot} rows={ds.data?.data} rowKey="user_id" loading={ds.isPending} emptyTitle="Không tìm thấy tài khoản" /></The>}
    {phanTrang && <div className="book-pagination"><span>{phanTrang.total} tài khoản · Trang {params.page}/{Math.max(1,phanTrang.totalPages)}</span>
      <NutBam disabled={params.page<=1} onClick={()=>datParams({...params,page:params.page-1})}>Trang trước</NutBam><NutBam disabled={params.page>=phanTrang.totalPages} onClick={()=>datParams({...params,page:params.page+1})}>Trang sau</NutBam></div>}
    {modal && <HopThoai className="book-dialog" open onOpenChange={v=>{if(!v)dong()}} title={{them:'Thêm người dùng',sua:'Chỉnh sửa tài khoản',xem:'Chi tiết tài khoản','trang-thai':'Xác nhận đổi trạng thái'}[modal.mode]}>
      {loi && <ThongBao variant="error" role="alert" title="Chưa lưu được tài khoản">{loi}</ThongBao>}
      {modal.mode==='them' ? <MauTaiKhoan roles={roles} luu={luu} ban={ban}/> : ct.isError ? <NutBam onClick={()=>ct.refetch()}>Thử tải lại chi tiết</NutBam> : !u ? <p role="status">Đang tải tài khoản…</p> :
      modal.mode==='sua' ? <MauTaiKhoan cu={u} roles={roles} tuSua={id===nguoiDung.user_id} luu={luu} ban={ban}/> :
      modal.mode==='trang-thai' ? <><p>{u.status==='active'?'Vô hiệu hóa':'Kích hoạt'} tài khoản {u.name} ({u.email})?</p><NutBam loading={ban} onClick={()=>luu({status:u.status==='active'?'inactive':'active'})}>Xác nhận thay đổi</NutBam></> :
      <div className="book-detail"><dl>{[['Mã tài khoản',u.user_id],['Họ tên',u.name],['Email',u.email],['Điện thoại',u.phone || '—'],['Vai trò',tenVaiTro(u.roles)],['Trạng thái',nhan(u.status)],['Ngày tạo',new Date(u.created_at).toLocaleDateString('vi-VN')]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>}
    </HopThoai>}</div>
}
