import { render, screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import TrangQuanLySach from './TrangQuanLySach.jsx'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'
import App from '../../ung-dung/App.jsx'
import { NguCanhXacThuc } from '../xac-thuc/useXacThuc.js'
import { taoTrinhTruyVan } from '../../thu-vien/trinh-truy-van.js'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))
vi.mock('sonner', async nhapGoc => ({ ...await nhapGoc(), toast: { success: vi.fn(), error: vi.fn() } }))
const ma = '18446744073709551610'
const banGoc = { book_id: ma, title: 'Những trang sách xanh', author: 'Tác giả thử', category_id: '42', series_id: '9007199254740993', publisher: null, description: null, publication_year: 0 }
const quyenGhi = ['book_create', 'book_update', 'book_delete']
const userThu = { user_id: '9007199254740995', name: 'Người dùng FE08', email: 'user@example.test', status: 'active', roles: ['admin'], permissions: quyenGhi }
const adapterGoc = ketNoiHttp.defaults.adapter
let cacSach, daGoi, xuLy, cacClient
function tra(cauHinh, data, status = 200) { return { config: cauHinh, headers: {}, status, data: JSON.parse(JSON.stringify(data)) } }
function loiHttp(cauHinh, status, code) { throw new AxiosError('Mock HTTP error', 'ERR_BAD_REQUEST', cauHinh, null, tra(cauHinh, { success: false, error: { code, message: 'private SQL details' } }, status)) }
function xuLyMacDinh(cauHinh) {
  if (/^\/books\/\d+\/copies$/.test(cauHinh.url)) return tra(cauHinh, { success: true, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })
  if (cauHinh.url === '/auth/login') return tra(cauHinh, { success: true, data: { accessToken: 'token-mock-fe08', tokenType: 'Bearer', expiresIn: 900 } })
  if (cauHinh.url === '/auth/me') return tra(cauHinh, { success: true, data: userThu })
  if (cauHinh.url === '/auth/logout') return tra(cauHinh, { success: true, data: null })
  if (cauHinh.url === '/categories') return tra(cauHinh, { success: true, data: [{ category_id: '42', name: 'Văn học', description: null }], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } })
  if (cauHinh.url === '/books' && cauHinh.method === 'get') {
    const { page, limit, search } = cauHinh.params
    const ds = cacSach.filter(sach => [sach.title, sach.author, sach.publisher ?? ''].some(chuoi => chuoi.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => BigInt(a.book_id) > BigInt(b.book_id) ? -1 : BigInt(a.book_id) < BigInt(b.book_id) ? 1 : 0)
    return tra(cauHinh, { success: true, data: ds.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: ds.length, totalPages: Math.ceil(ds.length / limit) } })
  }
  if (cauHinh.url === '/books' && cauHinh.method === 'post') {
    const moi = { book_id: '18446744073709551611', ...JSON.parse(cauHinh.data) }
    cacSach.unshift(moi)
    return tra(cauHinh, { success: true, data: moi }, 201)
  }
  const id = cauHinh.url.match(/^\/books\/(\d+)$/)?.[1]
  const sach = cacSach.find(muc => muc.book_id === id)
  if (!sach) return loiHttp(cauHinh, 404, 'BOOK_NOT_FOUND')
  if (cauHinh.method === 'get') return tra(cauHinh, { success: true, data: sach })
  if (cauHinh.method === 'put') { Object.assign(sach, JSON.parse(cauHinh.data)); return tra(cauHinh, { success: true, data: sach }) }
  if (cauHinh.method === 'delete') { cacSach = cacSach.filter(muc => muc.book_id !== id); return tra(cauHinh, { success: true, data: null }) }
  return loiHttp(cauHinh, 404, 'ROUTE_NOT_FOUND')
}
beforeEach(() => {
  cacSach = [{ ...banGoc }]; daGoi = []; cacClient = []; xuLy = xuLyMacDinh
  moiTruong.error = null; onlineManager.setOnline(true)
  toast.success.mockClear(); toast.error.mockClear()
  ketNoiHttp.defaults.adapter = vi.fn(async cauHinh => { daGoi.push(cauHinh); return xuLy(cauHinh) })
})
afterEach(() => { cacClient.forEach(client => client.clear()); onlineManager.setOnline(true); ketNoiHttp.defaults.adapter = adapterGoc; vi.restoreAllMocks() })

function hienThi({ permissions = quyenGhi, role = 'admin', route = false, daDangNhap = true } = {}) {
  const client = taoTrinhTruyVan(); cacClient.push(client)
  const taoGiaoDien = cacQuyen => <QueryClientProvider client={client}><NguCanhXacThuc.Provider value={{ nguoiDung: { ...userThu, roles: [role], permissions: cacQuyen }, tokenTruyCap: 'token-mock-fe08', daDangNhap, dangXuat: vi.fn() }}><MemoryRouter initialEntries={['/app/sach']}>{route ? <DinhTuyenUngDung /> : <TrangQuanLySach />}</MemoryRouter></NguCanhXacThuc.Provider></QueryClientProvider>
  const ketQua = render(taoGiaoDien(permissions))
  return { ...ketQua, doiQuyen: cacQuyen => ketQua.rerender(taoGiaoDien(cacQuyen)) }
}
async function choDanhSach() { await screen.findByRole('button', { name: banGoc.title, exact: true }) }
async function moThem() { await userEvent.click(screen.getByRole('button', { name: 'Thêm sách', exact: true })); return screen.findByRole('dialog', { name: 'Thêm sách' }) }
async function dienSach(hopThoai) {
  await userEvent.type(within(hopThoai).getByLabelText(/^Tên sách/), 'Sách mới')
  await userEvent.type(within(hopThoai).getByLabelText(/^Tác giả/), 'Tác giả mới')
}

it('renders the real authenticated route and lets a reader without book_view read public catalog APIs', async () => {
  hienThi({ permissions: [], role: 'reader', route: true })
  expect(await screen.findByRole('heading', { name: 'Quản lý sách' })).toBeVisible()
  await choDanhSach()
  expect(screen.getByRole('table', { name: 'Danh sách sách' })).toBeVisible()
  expect(screen.getByText('Văn học')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Thêm sách' })).not.toBeInTheDocument()
  expect(daGoi.every(muc => muc.method === 'get')).toBe(true)
})
it('redirects an anonymous /app/sach request before mounting or calling the catalog', async () => {
  hienThi({ route: true, daDangNhap: false })
  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
  expect(daGoi).toHaveLength(0)
})
it('shows a skeleton before a delayed list and then an actual empty state', async () => {
  let hoanTat
  xuLy = cauHinh => cauHinh.url === '/books' ? new Promise(resolve => { hoanTat = () => resolve(tra(cauHinh, { success: true, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })) }) : xuLyMacDinh(cauHinh)
  hienThi()
  expect(screen.getByText('Đang tải bảng')).toBeInTheDocument()
  await waitFor(() => expect(hoanTat).toBeTypeOf('function'))
  await act(async () => { hoanTat() })
  expect(await screen.findByText('Chưa có sách')).toBeVisible()
})
it('shows safe API errors and retries only on user action', async () => {
  xuLy = cauHinh => cauHinh.url === '/books' ? loiHttp(cauHinh, 500, 'INTERNAL_ERROR') : xuLyMacDinh(cauHinh)
  hienThi()
  expect(await screen.findByRole('alert')).toHaveTextContent('Dịch vụ tạm thời chưa sẵn sàng.')
  expect(document.body).not.toHaveTextContent('private SQL details')
  expect(daGoi.filter(muc => muc.url === '/books')).toHaveLength(1)
  xuLy = xuLyMacDinh
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  await choDanhSach()
})
it('submits search once, clears it and supports only Backend page-size/pagination params', async () => {
  hienThi(); await choDanhSach()
  await userEvent.type(screen.getByLabelText('Tìm kiếm sách'), ' Không có ')
  await userEvent.click(screen.getByRole('button', { name: 'Tìm kiếm', exact: true }))
  expect(await screen.findByText('Không tìm thấy sách phù hợp')).toBeVisible()
  expect(daGoi.filter(muc => muc.url === '/books').at(-1).params).toEqual({ page: 1, limit: 10, search: 'Không có' })
  await userEvent.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' })); await choDanhSach()
  await userEvent.selectOptions(screen.getByLabelText('Số sách mỗi trang'), '20')
  await waitFor(() => expect(daGoi.filter(muc => muc.url === '/books').at(-1).params.limit).toBe(20))
  expect(screen.queryByLabelText('Lọc theo thể loại')).not.toBeInTheDocument()
})
it('loads a fresh detail by exact BIGINT ID and handles not found', async () => {
  hienThi(); await choDanhSach()
  await userEvent.click(screen.getByRole('button', { name: `Xem chi tiết ${banGoc.title}` }))
  const hopThoai = screen.getByRole('dialog')
  expect(await within(hopThoai).findByText(ma, { exact: true })).toBeVisible()
  expect(within(hopThoai).getByText('Chưa có mô tả.')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }))
  xuLy = cauHinh => cauHinh.url === `/books/${ma}` ? loiHttp(cauHinh, 404, 'BOOK_NOT_FOUND') : xuLyMacDinh(cauHinh)
  await userEvent.click(screen.getByRole('button', { name: `Xem chi tiết ${banGoc.title}` }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy sách')
})
it.each([['admin', []], ['reader', ['book_view']], ['librarian', ['book_update']]])('renders actions by actual grants for %s', async (role, permissions) => {
  hienThi({ role, permissions }); await choDanhSach()
  expect(screen.queryByRole('button', { name: 'Thêm sách', exact: true })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: `Xóa ${banGoc.title}` })).not.toBeInTheDocument()
  expect(Boolean(screen.queryByRole('button', { name: `Sửa ${banGoc.title}` }))).toBe(permissions.includes('book_update'))
})
it('validates a create form before transport and refreshes the real list envelope after success', async () => {
  hienThi(); await choDanhSach(); const hopThoai = await moThem()
  await userEvent.click(within(hopThoai).getByRole('button', { name: 'Thêm sách' }))
  expect(within(hopThoai).getAllByText(/không để trống/)).toHaveLength(2)
  expect(daGoi.filter(muc => muc.method === 'post')).toHaveLength(0)
  await dienSach(hopThoai)
  await userEvent.selectOptions(within(hopThoai).getByLabelText('Thể loại'), '42')
  await userEvent.click(within(hopThoai).getByRole('button', { name: 'Thêm sách' }))
  expect(await screen.findByRole('button', { name: 'Sách mới', exact: true })).toBeVisible()
  expect(toast.success).toHaveBeenCalledWith('Đã thêm sách.')
  const body = JSON.parse(daGoi.find(muc => muc.method === 'post').data)
  expect(body).toEqual({ isbn: null, title: 'Sách mới', author: 'Tác giả mới', publisher: null, category_id: '42', series_id: null, description: null, publication_year: null })
})
it('lookup Enter does not submit the book and an existing category outside search results is preserved', async () => {
  hienThi(); await choDanhSach()
  await userEvent.click(screen.getByRole('button', { name: `Sửa ${banGoc.title}` }))
  const hopThoai = screen.getByRole('dialog')
  await within(hopThoai).findByRole('form', { name: 'Sửa sách' })
  xuLy = cauHinh => cauHinh.url === '/categories' && cauHinh.params.search ? tra(cauHinh, { success: true, data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }) : xuLyMacDinh(cauHinh)
  await userEvent.type(within(hopThoai).getByLabelText('Tìm thể loại'), 'khác{Enter}')
  await waitFor(() => expect(daGoi.some(muc => muc.url === '/categories' && muc.params.search === 'khác')).toBe(true))
  expect(daGoi.filter(muc => muc.method === 'put')).toHaveLength(0)
  expect(within(hopThoai).getByLabelText('Thể loại')).toHaveValue('42')
})
it('PUT preserves nulls, year zero and large reference IDs, without timestamps or book_id', async () => {
  hienThi(); await choDanhSach()
  await userEvent.click(screen.getByRole('button', { name: `Sửa ${banGoc.title}` }))
  const hopThoai = screen.getByRole('dialog'); const ten = await within(hopThoai).findByLabelText(/^Tên sách/)
  await userEvent.clear(ten); await userEvent.type(ten, 'Đã sửa')
  await userEvent.click(within(hopThoai).getByRole('button', { name: 'Lưu thay đổi' }))
  expect(await screen.findByRole('button', { name: 'Đã sửa', exact: true })).toBeVisible()
  expect(JSON.parse(daGoi.find(muc => muc.method === 'put').data)).toEqual({ isbn: null, title: 'Đã sửa', author: banGoc.author, publisher: null, category_id: '42', series_id: banGoc.series_id, description: null, publication_year: 0 })
})
it('does not send DELETE before confirmation, permits cancellation and refreshes after confirmed deletion', async () => {
  hienThi(); await choDanhSach()
  await userEvent.click(screen.getByRole('button', { name: `Xóa ${banGoc.title}` }))
  expect(screen.getByRole('dialog')).toHaveTextContent('không thể hoàn tác')
  expect(daGoi.filter(muc => muc.method === 'delete')).toHaveLength(0)
  await userEvent.click(screen.getByRole('button', { name: 'Hủy' }))
  expect(daGoi.filter(muc => muc.method === 'delete')).toHaveLength(0)
  await userEvent.click(screen.getByRole('button', { name: `Xóa ${banGoc.title}` }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
  expect(await screen.findByText('Chưa có sách')).toBeVisible()
  expect(daGoi.filter(muc => muc.method === 'delete')).toHaveLength(1)
})
it('handles referenced deletion conflict without hiding the record or losing the session', async () => {
  xuLy = cauHinh => cauHinh.method === 'delete' ? loiHttp(cauHinh, 409, 'BOOK_HAS_COPIES') : xuLyMacDinh(cauHinh)
  hienThi(); await choDanhSach()
  await userEvent.click(screen.getByRole('button', { name: `Xóa ${banGoc.title}` })); await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('bản sao')
  expect(cacSach).toHaveLength(1)
})
it('blocks resubmission after a lost DELETE response until the operator checks the list', async () => {
  xuLy = cauHinh => {
    if (cauHinh.method === 'delete') { cacSach = []; throw new AxiosError('Network Error', 'ERR_NETWORK', cauHinh) }
    return xuLyMacDinh(cauHinh)
  }
  hienThi(); await choDanhSach()
  await userEvent.click(screen.getByRole('button', { name: `Xóa ${banGoc.title}` })); await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa xác minh')
  expect(screen.getByRole('button', { name: 'Xác nhận xóa' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Đóng và tải lại' }))
  expect(await screen.findByText('Chưa có sách')).toBeVisible()
  expect(daGoi.filter(muc => muc.method === 'delete')).toHaveLength(1)
})
it('removes write ability if grants disappear while the editor is open', async () => {
  const trang = hienThi(); await choDanhSach(); const hopThoai = await moThem(); await dienSach(hopThoai)
  trang.doiQuyen([])
  expect(within(hopThoai).getByRole('button', { name: 'Thêm sách' })).toBeDisabled()
  expect(daGoi.filter(muc => muc.method === 'post')).toHaveLength(0)
})
it('keeps a loading write single-shot and aborts its wait on page unmount', async () => {
  let hoanTat
  xuLy = cauHinh => cauHinh.method === 'post' ? new Promise(resolve => { hoanTat = () => resolve(xuLyMacDinh(cauHinh)) }) : xuLyMacDinh(cauHinh)
  const trang = hienThi(); await choDanhSach(); const hopThoai = await moThem(); await dienSach(hopThoai)
  await userEvent.click(within(hopThoai).getByRole('button', { name: 'Thêm sách' }))
  expect(within(hopThoai).getByRole('button', { name: /Thêm sách/ })).toBeDisabled()
  expect(daGoi.filter(muc => muc.method === 'post')).toHaveLength(1)
  const ghi = daGoi.find(muc => muc.method === 'post'); trang.unmount()
  expect(ghi.signal.aborted).toBe(true)
  await act(async () => { hoanTat() })
  expect(toast.success).not.toHaveBeenCalled()
})
it('does not claim an empty database when API configuration is missing', () => {
  moiTruong.error = 'Missing origin'; hienThi()
  expect(screen.getByText('Chưa cấu hình dịch vụ sách')).toBeVisible()
  expect(screen.queryByText('Chưa có sách')).not.toBeInTheDocument()
  expect(daGoi).toHaveLength(0)
})

it('returns to the preceding page after deleting the last row of the last page', async () => {
  cacSach = Array.from({ length: 11 }, (_, i) => ({ ...banGoc, book_id: String(i + 1), title: `Sách ${i + 1}` }))
  hienThi(); await screen.findByRole('button', { name: 'Sách 11', exact: true })
  await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  await screen.findByRole('button', { name: 'Sách 1', exact: true })
  await userEvent.click(screen.getByRole('button', { name: 'Xóa Sách 1', exact: true }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
  expect(await screen.findByText('Trang 1 / 1')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Sách 11', exact: true })).toBeVisible()
  expect(daGoi.filter(muc => muc.method === 'delete')).toHaveLength(1)
})

it('shows sanitized server validation on the matching form field without losing input', async () => {
  xuLy = cauHinh => {
    if (cauHinh.method === 'post') throw new AxiosError('Mock validation', 'ERR_BAD_REQUEST', cauHinh, null,
      tra(cauHinh, { success: false, error: { code: 'VALIDATION_ERROR', message: 'private SQL', details: [{ field: 'title', message: 'private SQL' }] } }, 400))
    return xuLyMacDinh(cauHinh)
  }
  hienThi(); await choDanhSach(); const hopThoai = await moThem(); await dienSach(hopThoai)
  await userEvent.click(within(hopThoai).getByRole('button', { name: 'Thêm sách' }))
  expect(await within(hopThoai).findByText('Kiểm tra giá trị của trường này.')).toBeVisible()
  expect(within(hopThoai).getByLabelText(/^Tên sách/)).toHaveValue('Sách mới')
  expect(document.body).not.toHaveTextContent('private SQL')
})

async function dangNhapTrongApp() {
  window.history.replaceState({}, '', '/dang-nhap'); render(<App />)
  await userEvent.type(screen.getByLabelText(/^Email/), 'user@example.test'); await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'mat khau thu')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập', exact: true })); await screen.findByText('Người dùng FE08')
  await userEvent.click(screen.getByRole('link', { name: 'Quản lý sách', exact: true }))
}
it('FE06/07 real provider regression: protected 401 exits the books route and asks for login', async () => {
  xuLy = cauHinh => cauHinh.url === '/books' ? loiHttp(cauHinh, 401, 'TOKEN_EXPIRED') : xuLyMacDinh(cauHinh)
  await dangNhapTrongApp()
  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
  expect(window.location.pathname).toBe('/dang-nhap')
})
it('FE06/07 real provider regression: write 403 shows safe feedback and keeps the session', async () => {
  xuLy = cauHinh => cauHinh.method === 'post' && cauHinh.url === '/books' ? loiHttp(cauHinh, 403, 'FORBIDDEN') : xuLyMacDinh(cauHinh)
  await dangNhapTrongApp(); await choDanhSach(); const hopThoai = await moThem(); await dienSach(hopThoai)
  await userEvent.click(within(hopThoai).getByRole('button', { name: 'Thêm sách' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Phiên đăng nhập vẫn được giữ')
  await userEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }))
  expect(screen.getByText('Người dùng FE08')).toBeVisible()
  expect(window.location.pathname).toBe('/app/sach')
  expect(document.body).not.toHaveTextContent('private SQL details')
})
