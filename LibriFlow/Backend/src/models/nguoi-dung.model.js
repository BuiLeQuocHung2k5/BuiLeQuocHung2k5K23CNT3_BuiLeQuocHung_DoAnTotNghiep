import { LoiHttp } from '../utils/loi-http.js'
import { taoMauTimKiem, thucHienGiaoDich, truyVanPhanTrang } from '../utils/truy-van-danh-muc.js'
import { taoMoHinhXacThuc } from './xac-thuc.model.js'

const tuChoi = () => new LoiHttp(403, 'FORBIDDEN', 'Không đủ quyền quản lý tài khoản này.')
const cacCot = `SELECT u.user_id,u.name,u.email,u.phone,u.status,u.created_at,
  (SELECT GROUP_CONCAT(r.name ORDER BY r.name) FROM NguoiDung_VaiTro ur JOIN VaiTro r USING(role_id) WHERE ur.user_id=u.user_id) roles
  FROM NguoiDung u`
const chuanHoa = r => ({ ...r, user_id: String(r.user_id), roles: r.roles ? r.roles.split(',') : [] })

async function vaiTroDuocCap(db, actor) {
  const [rows] = await db.query(`SELECT r.name role,p.name perm FROM VaiTro r
    LEFT JOIN VaiTro_QuyenHan rp USING(role_id) LEFT JOIN QuyenHan p USING(permission_id)`)
  return ['reader','librarian','admin'].filter(role => rows.some(r => r.role === role) &&
    (role !== 'admin' || actor.roles.includes('admin')) &&
    rows.every(r => r.role !== role || !r.perm || actor.permissions.includes(r.perm)))
}
export function taoMoHinhNguoiDung(db) {
  const auth = taoMoHinhXacThuc(db)
  async function chiTiet(id, cx = db) {
    const [rows] = await cx.execute(cacCot+' WHERE u.user_id=?',[id])
    if (!rows.length) throw new LoiHttp(404,'USER_NOT_FOUND','Không tìm thấy tài khoản.')
    return chuanHoa(rows[0])
  }
  return {
    chiTiet,
    async danhSach(loc, actor) {
      const dk = [], args = []
      if (loc.search) { dk.push("(u.name LIKE ? ESCAPE '=' OR u.email LIKE ? ESCAPE '=')"); args.push(taoMauTimKiem(loc.search),taoMauTimKiem(loc.search)) }
      if (loc.status) { dk.push('u.status=?'); args.push(loc.status) }
      if (loc.role) { dk.push('EXISTS (SELECT 1 FROM NguoiDung_VaiTro ur JOIN VaiTro r USING(role_id) WHERE ur.user_id=u.user_id AND r.name=?)'); args.push(loc.role) }
      const where = dk.length ? ' WHERE '+dk.join(' AND ') : ''
      const { items,total } = await truyVanPhanTrang(db,'SELECT COUNT(*) total FROM NguoiDung u'+where,cacCot+where+' ORDER BY u.user_id DESC LIMIT ? OFFSET ?',args,loc,chuanHoa)
      return { data: items, assignable_roles: await vaiTroDuocCap(db,actor), pagination: { page: loc.page, limit: loc.limit, total, totalPages: Math.ceil(total/loc.limit) } }
    },
    async luu(actorId, id, data, hash) {
      try {
        return await thucHienGiaoDich(db, async cx => {
          // Tuần tự hóa thay đổi quản trị. Đọc lại quyền sau khi lấy khóa để tránh dùng quyền vừa bị thu hồi.
          await cx.execute("SELECT permission_id FROM QuyenHan WHERE name='user_manage' FOR UPDATE")
          const actor = await auth.layNguoiDungXacThuc(actorId,cx)
          if (actor?.status !== 'active' || !actor.permissions.includes('user_manage')) throw tuChoi()
          const roles = await vaiTroDuocCap(cx,actor)
          if (data.role && !roles.includes(data.role)) throw tuChoi()
          if (id === null) {
            const [r] = await cx.execute('INSERT INTO NguoiDung(name,email,phone,password,status) VALUES(?,?,?,?,?)',[data.name,data.email,data.phone,hash,data.status])
            id = String(r.insertId)
          } else {
            const cu = await chiTiet(id,cx)
            if (!cu.roles.every(r => roles.includes(r))) throw tuChoi()
            // Người thực hiện luôn giữ quyền quản trị hoạt động. Chỉ admin có quyền mới được sửa admin khác.
            if (id === String(actorId) && (data.role !== undefined || (data.status && data.status !== 'active'))) {
              throw new LoiHttp(409,'SELF_ACCESS_CHANGE','Không thể tự thay đổi vai trò hoặc vô hiệu hóa tài khoản đang sử dụng.')
            }
            const cot = ['name','email','phone','status'].filter(k => Object.hasOwn(data,k))
            if (cot.length) await cx.execute('UPDATE NguoiDung SET '+cot.map(k=>k+'=?').join(',')+' WHERE user_id=?',[...cot.map(k=>data[k]),id])
            if (data.role) await cx.execute('DELETE FROM NguoiDung_VaiTro WHERE user_id=?',[id])
          }
          if (data.role) {
            const [r] = await cx.execute('INSERT INTO NguoiDung_VaiTro(user_id,role_id) SELECT ?,role_id FROM VaiTro WHERE name=?',[id,data.role])
            if (r.affectedRows !== 1) throw tuChoi()
          }
          return chiTiet(id,cx)
        })
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') throw new LoiHttp(409,'EMAIL_ALREADY_EXISTS','Email đã được sử dụng.')
        throw e
      }
    }
  }
}
