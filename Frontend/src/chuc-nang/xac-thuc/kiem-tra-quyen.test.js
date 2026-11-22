import { describe, expect, it } from 'vitest'
import { coQuyenTruyCap, locDieuHuongTheoQuyen } from './kiem-tra-quyen.js'
import { dieuHuongNenTang } from '../../ung-dung/dinh-tuyen/cau-hinh-tuyen.js'

const nguoiDungThu = { user_id: '18446744073709551614', name: 'Người dùng kiểm thử', status: 'active', roles: ['reader'], permissions: ['book_view'] }

describe('FE-07 — kiểm tra quyền từ principal, không suy grant từ tên role', () => {
  it.each([['admin', 'book_delete'], ['librarian', 'report_view'], ['reader', 'book_view']])('allows %s with its explicit %s grant', (vaiTro, quyen) => {
    expect(coQuyenTruyCap({ ...nguoiDungThu, roles: [vaiTro], permissions: [quyen] }, { quyen: [quyen] })).toBe(true)
  })

  it('denies admin without the permission, including category_manage absent from older DB snapshots', () => {
    const admin = { ...nguoiDungThu, roles: ['admin'], permissions: ['book_view'] }
    expect(coQuyenTruyCap(admin, { quyen: ['book_delete'] })).toBe(false)
    expect(coQuyenTruyCap(admin, { quyen: ['category_manage'] })).toBe(false)
  })

  it('honors custom grants on a known role instead of duplicating seed role assignments', () => {
    expect(coQuyenTruyCap({ ...nguoiDungThu, permissions: ['report_view'] }, { quyen: ['report_view'] })).toBe(true)
  })

  it('requires all requested permissions and combines role and permission conditions with AND', () => {
    const staff = { ...nguoiDungThu, roles: ['reader', 'librarian'], permissions: ['book_view', 'report_view'] }
    expect(coQuyenTruyCap(staff, { vaiTro: ['admin', 'librarian'], quyen: ['book_view', 'report_view'] })).toBe(true)
    expect(coQuyenTruyCap(staff, { vaiTro: ['admin'], quyen: ['report_view'] })).toBe(false)
    expect(coQuyenTruyCap(staff, { quyen: ['report_view', 'book_delete'] })).toBe(false)
    expect(coQuyenTruyCap({ ...staff, permissions: [] }, { vaiTro: ['librarian'] })).toBe(true)
  })

  it.each([null, { ...nguoiDungThu, roles: undefined }, { ...nguoiDungThu, roles: [] },
    { ...nguoiDungThu, roles: ['custom'] }, { ...nguoiDungThu, roles: [null] },
    { ...nguoiDungThu, permissions: undefined }, { ...nguoiDungThu, permissions: 'book_view' },
    { ...nguoiDungThu, permissions: [null] }, { ...nguoiDungThu, status: 'inactive' },
    { ...nguoiDungThu, status: 'locked' }])('fails closed for incomplete or inactive principal %#', nguoiDung => {
    expect(coQuyenTruyCap(nguoiDung, { quyen: ['book_view'] })).toBe(false)
  })

  it.each([null, {}, [], 'admin', { permission: 'book_view' }, { quyen: [] }, { vaiTro: [] }, { quyen: Array(1) },
    { quyen: 'book_view' }, { vaiTro: ['superadmin'] }, { quyen: ['invented_permission'] }])('fails closed for malformed or unknown requirement %#', yeuCau => {
    expect(coQuyenTruyCap({ ...nguoiDungThu, permissions: ['book_view', 'invented_permission'] }, yeuCau)).toBe(false)
  })

  it('leaves shared authenticated pages usable even without role/permission assignments', () => {
    expect(coQuyenTruyCap({ ...nguoiDungThu, roles: [], permissions: [] })).toBe(true)
    expect(coQuyenTruyCap(null)).toBe(false)
  })
})

describe('FE-07 — menu thật hiện chỉ gồm trang dùng chung và công cụ', () => {
  it.each(['admin', 'librarian', 'reader'])('keeps implemented shared routes for %s without inventing unsupported menus', vaiTro => {
    const menu = locDieuHuongTheoQuyen(dieuHuongNenTang, { ...nguoiDungThu, roles: [vaiTro] }, true)
    expect(menu[0].items.map(muc => muc.to)).toEqual(vaiTro === 'reader'
      ? ['/app', '/app/sach', '/app/doc-gia', '/app/lich-su-muon', '/app/tai-khoan']
      : vaiTro === 'admin' ? ['/app', '/app/sach', '/app/tai-khoan', '/app/admin'] : ['/app', '/app/sach', '/app/tai-khoan'])
    expect(menu[1].items.map(muc => muc.to)).toEqual(['/app/layouts', '/app/workspace', '/app/api-check', '/', '/design-system'])
  })

  it('keeps public tools and removes the authenticated group for an anonymous visitor', () => {
    const menu = locDieuHuongTheoQuyen(dieuHuongNenTang, null, false)
    expect(menu.map(nhom => nhom.id)).toEqual(['tools'])
    expect(menu[0].items).toHaveLength(5)
  })

  it('filters permission-bound test items and removes empty groups without changing input', () => {
    // Chỉ fixture kiểm helper; không tạo các route này trong ứng dụng.
    const menuThu = [{ id: 'rieng', items: [
      { id: 'bao-cao', yeuCauTruyCap: { quyen: ['report_view'] } },
      { id: 'xoa', yeuCauTruyCap: { quyen: ['book_delete'] } },
    ] }]
    const banDau = JSON.stringify(menuThu)
    expect(locDieuHuongTheoQuyen(menuThu, nguoiDungThu, true)).toEqual([])
    expect(locDieuHuongTheoQuyen(menuThu, { ...nguoiDungThu, roles: ['librarian'], permissions: ['report_view'] }, true)[0].items.map(muc => muc.id)).toEqual(['bao-cao'])
    expect(locDieuHuongTheoQuyen(menuThu, { ...nguoiDungThu, roles: ['admin'], permissions: [] }, true)).toEqual([])
    expect(locDieuHuongTheoQuyen(menuThu, nguoiDungThu, false)).toEqual([])
    expect(JSON.stringify(menuThu)).toBe(banDau)
  })
})
