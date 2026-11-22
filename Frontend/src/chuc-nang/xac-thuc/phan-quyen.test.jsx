import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, BrowserRouter } from 'react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { BookOpen } from 'lucide-react'
import BaoVeDangNhap from './BaoVeDangNhap.jsx'
import { NguCanhXacThuc } from './useXacThuc.js'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'
import BoCungCapUngDung from '../../ung-dung/bo-cung-cap/BoCungCapUngDung.jsx'
import ThanhBen from '../../bo-cuc/ThanhBen.jsx'
import { dieuHuongNenTang } from '../../ung-dung/dinh-tuyen/cau-hinh-tuyen.js'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))

const nguoiDungThu = { user_id: '18446744073709551614', name: 'Người dùng kiểm thử', email: 'user@example.test', phone: null, avatar: null,
  created_at: '2026-11-21T00:00:00.000Z', updated_at: '2026-11-21T00:00:00.000Z', status: 'active', roles: ['reader'], permissions: ['book_view'] }
const noiDungDaMount = vi.fn()
const boVanChuyenGoc = ketNoiHttp.defaults.adapter

beforeEach(() => { noiDungDaMount.mockClear() })
afterEach(() => { ketNoiHttp.defaults.adapter = boVanChuyenGoc; vi.restoreAllMocks() })

function NoiDungBaoVe() {
  useEffect(() => { noiDungDaMount() }, [])
  return <h1>Nội dung được bảo vệ trong test</h1>
}

function hienThiGuard(nguoiDung, yeuCauTruyCap, duongDan = '/chi-trong-test') {
  return render(<NguCanhXacThuc.Provider value={{ nguoiDung, daDangNhap: Boolean(nguoiDung), dangXuat: vi.fn(), dangNhap: vi.fn() }}>
    <MemoryRouter initialEntries={[duongDan]}><Routes>
      {/* Route kiểm guard chỉ tồn tại trong test; không phải trang nghiệp vụ runtime. */}
      <Route path={duongDan.split('?')[0]} element={<BaoVeDangNhap yeuCauTruyCap={yeuCauTruyCap}><NoiDungBaoVe /></BaoVeDangNhap>} />
      <Route path="*" element={<DinhTuyenUngDung />} />
    </Routes></MemoryRouter>
  </NguCanhXacThuc.Provider>)
}

describe('FE-07 — guard, trang 403 và điều hướng qua principal mock đúng contract', () => {
  it.each([['admin', 'book_delete'], ['librarian', 'report_view'], ['reader', 'book_view']])('allows %s with %s without redirecting', async (vaiTro, quyen) => {
    hienThiGuard({ ...nguoiDungThu, roles: [vaiTro], permissions: [quyen] }, { quyen: [quyen] })
    expect(await screen.findByRole('heading', { name: 'Nội dung được bảo vệ trong test' })).toBeVisible()
    expect(noiDungDaMount).toHaveBeenCalledTimes(1)
  })

  it('blocks a direct URL/query role override, never mounts protected content and returns to the real shared app', async () => {
    hienThiGuard(nguoiDungThu, { quyen: ['report_view'] }, '/chi-trong-test?role=admin')
    expect(screen.getByRole('heading', { name: '403 — Bạn không có quyền truy cập trang này.' })).toBeVisible()
    expect(noiDungDaMount).not.toHaveBeenCalled()
    expect(document.title).toBe('403 · LibriFlow')
    await userEvent.click(screen.getByRole('button', { name: 'Về trang chính' }))
    expect(await screen.findByRole('heading', { name: 'Trang chủ thư viện' })).toBeVisible()
    expect(screen.getByText('Người dùng kiểm thử')).toBeVisible()
  })

  it('denies admin without an explicit permission', () => {
    hienThiGuard({ ...nguoiDungThu, roles: ['admin'], permissions: [] }, { quyen: ['book_delete'] })
    expect(screen.getByRole('heading', { name: /^403/ })).toBeVisible()
    expect(noiDungDaMount).not.toHaveBeenCalled()
  })

  it.each([{ ...nguoiDungThu, roles: [] }, { ...nguoiDungThu, roles: ['custom'] }, { ...nguoiDungThu, permissions: undefined }])('denies incomplete/unknown authorization data %#', nguoiDung => {
    hienThiGuard(nguoiDung, { quyen: ['book_view'] })
    expect(screen.getByRole('heading', { name: /^403/ })).toBeVisible()
    expect(noiDungDaMount).not.toHaveBeenCalled()
  })

  it('redirects anonymous permission-bound URLs to real login without mounting content', async () => {
    hienThiGuard(null, { quyen: ['report_view'] })
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(noiDungDaMount).not.toHaveBeenCalled()
  })

  it('does not bypass an explicit permission requirement on a public demo path', async () => {
    hienThiGuard(null, { quyen: ['report_view'] }, '/app/workspace')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(noiDungDaMount).not.toHaveBeenCalled()
  })

  it('keeps shared authenticated routes accessible when assignments are empty', () => {
    hienThiGuard({ ...nguoiDungThu, roles: [], permissions: [] }, undefined)
    expect(screen.getByRole('heading', { name: 'Nội dung được bảo vệ trong test' })).toBeVisible()
  })

  it('provides the /403 route without a redirect loop and requires login for anonymous access', async () => {
    const lanDau = render(<NguCanhXacThuc.Provider value={{ nguoiDung: nguoiDungThu, daDangNhap: true, dangXuat: vi.fn() }}><MemoryRouter initialEntries={['/403']}><DinhTuyenUngDung /></MemoryRouter></NguCanhXacThuc.Provider>)
    expect(screen.getByRole('heading', { name: /^403/ })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Về trang chính' }))
    expect(await screen.findByRole('heading', { name: 'Trang chủ thư viện' })).toBeVisible()
    lanDau.unmount()
    render(<NguCanhXacThuc.Provider value={{ nguoiDung: null, daDangNhap: false }}><MemoryRouter initialEntries={['/403']}><DinhTuyenUngDung /></MemoryRouter></NguCanhXacThuc.Provider>)
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
  })
})

describe('FE-07 — sidebar desktop lọc theo principal', () => {
  it.each(['admin', 'librarian', 'reader'])('shows real shared menus and separate tools for %s', vaiTro => {
    render(<NguCanhXacThuc.Provider value={{ nguoiDung: { ...nguoiDungThu, roles: [vaiTro] }, daDangNhap: true }}><MemoryRouter><ThanhBen groups={dieuHuongNenTang} /></MemoryRouter></NguCanhXacThuc.Provider>)
    const menu = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    expect(within(menu).getAllByRole('link')).toHaveLength(vaiTro === 'reader' ? 10 : vaiTro === 'admin' ? 9 : 8)
    expect(within(menu).getByText('Không gian ứng dụng')).toBeVisible()
    expect(within(menu).getByText('Công cụ phát triển')).toBeVisible()
    expect(within(menu).getByRole('link', { name: 'Quản lý sách' })).toHaveAttribute('href', '/app/sach')
  })

  it('filters permission-bound desktop links and updates them when grants change', () => {
    const menuThu = [{ id: 'thu', label: 'Menu kiểm thử', items: [
      { id: 'chung', label: 'Trang dùng chung', to: '/app', icon: BookOpen, canDangNhap: true },
      { id: 'bao-cao', label: 'Báo cáo kiểm thử', to: '/chi-trong-test', icon: BookOpen, yeuCauTruyCap: { quyen: ['report_view'] } },
    ] }]
    const hienThi = nguoiDung => <NguCanhXacThuc.Provider value={{ nguoiDung, daDangNhap: true }}><MemoryRouter>
      <ThanhBen groups={menuThu} />
    </MemoryRouter></NguCanhXacThuc.Provider>
    const { rerender } = render(hienThi(nguoiDungThu))
    expect(screen.getByRole('link', { name: 'Trang dùng chung' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Báo cáo kiểm thử' })).not.toBeInTheDocument()
    rerender(hienThi({ ...nguoiDungThu, permissions: ['book_view', 'report_view'] }))
    expect(screen.getByRole('link', { name: 'Báo cáo kiểm thử' })).toHaveAttribute('href', '/chi-trong-test')
    rerender(hienThi(nguoiDungThu))
    expect(screen.queryByRole('link', { name: 'Báo cáo kiểm thử' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trang dùng chung' })).toBeVisible()
  })
})

it('FE-07 regression: real provider keeps user on API 403, displays safe feedback, and still logs out (adapter mock)', async () => {
  window.history.replaceState({}, '', '/dang-nhap')
  const daGoi = []
  ketNoiHttp.defaults.adapter = async cauHinh => {
    daGoi.push(cauHinh.url)
    let data = { success: true, data: null }
    if (cauHinh.url === '/auth/login') data = { success: true, data: { accessToken: 'token-mock-fe07', tokenType: 'Bearer', expiresIn: 900 } }
    if (cauHinh.url === '/auth/me') data = { success: true, data: nguoiDungThu }
    if (cauHinh.url === '/health') throw new AxiosError('Mock forbidden', 'ERR_BAD_REQUEST', cauHinh, null, { status: 403, data: { success: false, error: { code: 'FORBIDDEN', message: 'private details' } }, config: cauHinh, headers: {} })
    return { data, status: 200, headers: {}, config: cauHinh }
  }
  render(<BoCungCapUngDung><BrowserRouter><DinhTuyenUngDung /></BrowserRouter></BoCungCapUngDung>)
  await userEvent.type(screen.getByLabelText(/^Email/), 'user@example.test')
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'mat khau test')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập', exact: true }))
  await screen.findByText('Người dùng kiểm thử')
  await userEvent.click(screen.getByRole('link', { name: 'Kiểm tra API công khai', exact: true }))
  await screen.findByRole('heading', { name: 'Kiểm tra API công khai', level: 1 })
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Health', exact: true }))
  expect(await screen.findByText('Không có quyền thực hiện yêu cầu.')).toBeVisible()
  expect(screen.getByText('Người dùng kiểm thử')).toBeVisible()
  expect(document.body).not.toHaveTextContent('private details')
  expect(window.location.pathname).toBe('/app/api-check')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
  expect(daGoi).toEqual(['/auth/login', '/auth/me', '/health', '/auth/logout'])
})
