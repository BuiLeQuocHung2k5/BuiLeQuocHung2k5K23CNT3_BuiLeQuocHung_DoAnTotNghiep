import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { NguCanhXacThuc } from '../xac-thuc/useXacThuc.js'
import { taoTrinhTruyVan } from '../../thu-vien/trinh-truy-van.js'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'
import { AxiosError } from 'axios'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))

const boVanChuyenGoc = ketNoiHttp.defaults.adapter
const nguoiDungThu = { user_id: '5', name: 'Admin kiểm thử', email: 'admin@example.test', status: 'active', roles: ['admin'], permissions: ['user_manage', 'borrow_manage'], password: 'khong-hien-password', password_hash: 'khong-hien-hash' }
let trinhTruyVan, guiYeuCau
beforeEach(() => {
  trinhTruyVan = taoTrinhTruyVan()
  guiYeuCau = vi.fn(async () => { throw Error('Admin informational pages must not call unsupported APIs') })
  ketNoiHttp.defaults.adapter = guiYeuCau
})
afterEach(() => { trinhTruyVan.clear(); ketNoiHttp.defaults.adapter = boVanChuyenGoc; vi.restoreAllMocks() })
function DiaChiKiemThu() {
  return <span data-testid="route-path" hidden>{useLocation().pathname}</span>
}

function hienThi(path = '/app/admin', nguoiDung = nguoiDungThu) {
  return render(<QueryClientProvider client={trinhTruyVan}><NguCanhXacThuc.Provider value={{ nguoiDung, daDangNhap: Boolean(nguoiDung), tokenTruyCap: 'token-test-fe12', dangXuat: vi.fn() }}>
    <MemoryRouter initialEntries={[path]}><DiaChiKiemThu /><DinhTuyenUngDung /></MemoryRouter>
  </NguCanhXacThuc.Provider></QueryClientProvider>)
}

it.each([
  ['admin', nguoiDungThu, '/app/admin', 'Xin chào, Admin kiểm thử'],
  ['guest', null, '/dang-nhap', 'Đăng nhập'],
  ['reader', { ...nguoiDungThu, roles: ['reader'], permissions: ['book_view'] }, '/app/admin', /^403/],
])('routes /admin through the existing guard for %s', async (_, nguoiDung, dichDen, tieuDe) => {
  hienThi('/admin', nguoiDung)
  expect(await screen.findByRole('heading', { name: tieuDe }, { timeout: 3000 })).toBeVisible()
  expect(screen.getByTestId('route-path')).toHaveTextContent(dichDen)
  expect(guiYeuCau).not.toHaveBeenCalled()
})

it('shows real admin identity and authorized shortcuts; user management clearly reports unsupported operations without fake lists or API calls', async () => {
  hienThi()
  expect(await screen.findByRole('heading', { name: 'Xin chào, Admin kiểm thử' }, { timeout: 3000 })).toBeVisible()
  const loiTat = screen.getByLabelText('Lối tắt quản trị')
  expect(within(loiTat).getByRole('link', { name: 'Mở quản lý sách' })).toHaveAttribute('href', '/app/sach')
  expect(within(loiTat).getByRole('link', { name: 'Mở quản lý mượn/trả' })).toHaveAttribute('href', '/app/muon-tra')
  expect(screen.queryByRole('link', { name: /thống kê/i })).not.toBeInTheDocument()
  await userEvent.click(within(loiTat).getByRole('link', { name: 'Xem tình trạng hỗ trợ quản lý người dùng' }))
  expect(await screen.findByRole('heading', { name: 'Quản lý người dùng', level: 1 })).toBeVisible()
  expect(screen.getByText('Dịch vụ quản lý người dùng chưa được hỗ trợ')).toBeVisible()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /thêm|tạo|sửa|xóa|kích hoạt|vô hiệu hóa/i })).not.toBeInTheDocument()
  for (const value of ['khong-hien-password', 'khong-hien-hash', 'token-test-fe12']) expect(document.body).not.toHaveTextContent(value)
  expect(guiYeuCau).not.toHaveBeenCalled()
})
it('never grants user or borrowing management just from the admin role', async () => {
  hienThi('/app/admin', { ...nguoiDungThu, permissions: [] })
  await screen.findByRole('heading', { name: 'Xin chào, Admin kiểm thử' })
  expect(screen.queryByRole('link', { name: 'Quản lý người dùng' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Xem tình trạng hỗ trợ quản lý người dùng' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Mở quản lý mượn/trả' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Mở quản lý sách' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Xem hồ sơ của tôi' })).toBeVisible()
  expect(guiYeuCau).not.toHaveBeenCalled()
})
it('protects URLs and menus for anonymous/reader users, and requires user_manage independently of admin role', async () => {
  const lanMot = hienThi('/app/nguoi-dung', null)
  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
  lanMot.unmount()
  const lanHai = hienThi('/app/admin', { ...nguoiDungThu, roles: ['reader'], permissions: ['book_view'] })
  expect(await screen.findByRole('heading', { name: /^403/ })).toBeVisible()
  lanHai.unmount()
  const lanBa = hienThi('/app/nguoi-dung', { ...nguoiDungThu, permissions: [] })
  expect(await screen.findByRole('heading', { name: /^403/ })).toBeVisible()
  lanBa.unmount()
  hienThi('/app/nguoi-dung', { ...nguoiDungThu, roles: ['librarian'], permissions: ['user_manage'] })
  expect(await screen.findByRole('heading', { name: 'Quản lý người dùng', level: 1 })).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Tổng quan Admin' })).not.toBeInTheDocument()
  expect(guiYeuCau).not.toHaveBeenCalled()
})

it('reads only aggregate counts with report_view and handles API 403 safely without using statistics as a user list', async () => {
  let loiDoc = false
  const docTongQuan = vi.fn(async config => {
    const tra = (data, status = 200) => ({ config, headers: {}, status, data })
    if (loiDoc) throw new AxiosError('private SQL', 'ERR_BAD_REQUEST', config, null, tra({ success: false, error: { code: 'FORBIDDEN', message: 'private SQL' } }, 403))
    return tra({ success: true, data: { books_total: 18, copies_total: 42, users_total: 0, borrows_total: 0, borrows_in_period: 0, borrowed_copies_in_period: 0, returned_copies_in_period: 0 }, period: { start_date: '2026-11-01', end_date: '2026-11-21', timezone: 'UTC' } })
  })
  ketNoiHttp.defaults.adapter = docTongQuan
  hienThi('/app/admin', { ...nguoiDungThu, permissions: ['report_view'] })
  const tongQuan = await screen.findByRole('region', { name: 'Tổng quan thư viện' })
  expect(await within(tongQuan).findByText('42')).toBeVisible()
  expect(within(tongQuan).getByText('0')).toBeVisible()
  expect(docTongQuan.mock.calls[0][0].url).toBe('/statistics/overview')
  expect(docTongQuan.mock.calls[0][0].headers.Authorization).toBe('Bearer token-test-fe12')
  loiDoc = true; await userEvent.click(screen.getByRole('button', { name: 'Tải lại tổng quan' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không có quyền')
  expect(screen.getByRole('heading', { name: 'Xin chào, Admin kiểm thử' })).toBeVisible()
  expect(document.body).not.toHaveTextContent('private SQL')
  expect(docTongQuan.mock.calls.every(([config]) => config.url === '/statistics/overview')).toBe(true)
})
