import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import TrangMuonTra from './TrangMuonTra.jsx'
import AnhBiaSach from '../sach/AnhBiaSach.jsx'
import { NguCanhXacThuc } from '../xac-thuc/useXacThuc.js'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { taoTrinhTruyVan } from '../../thu-vien/trinh-truy-van.js'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'
import { kiemTraPhieuMuon } from './dich-vu-muon-tra.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))
vi.mock('sonner', async goc => ({ ...await goc(), toast: { success: vi.fn(), error: vi.fn() } }))
const goc = ketNoiHttp.defaults.adapter
const sach = { book_id: '42', title: 'Đồi gió hú', author: 'Emily Brontë', publisher: null, publication_year: null, category_id: null, series_id: null, description: null }
const banSao = { copy_id: '9007199254740993', book_id: '42', barcode: 'BIA-42', availability_status: 'available', condition_status: 'good' }
const chiTietMau = ma => ({ borrow_detail_id: ma, copy_id: ma, status: 'borrowed', condition_before: 'good', condition_after: null, returned_at: null })
let client, goi, phieu, loiDoc, loiGhi
const trang = data => ({ success: true, data, pagination: { page: 1, limit: 10, total: data.length, totalPages: data.length ? 1 : 0 } })
const phien = permissions => ({ daDangNhap: true, tokenTruyCap: 'mock-fe10-only', nguoiDung: { user_id: '5', name: 'Người kiểm thử', status: 'active', roles: ['admin'], permissions }, dangXuat: vi.fn() })
beforeEach(() => {
  client = taoTrinhTruyVan(); goi = []; loiDoc = null; loiGhi = null
  phieu = { borrow_id: '10', user_id: '30', borrow_date: '2026-11-21 10:00:00', due_date: '2035-01-01 10:00:00', status: 'borrowed', note: null, created_at: '2026-11-21 10:00:00', details: [chiTietMau('101'), chiTietMau('102')] }
  ketNoiHttp.defaults.adapter = async config => {
    goi.push(config)
    const tra = (data, status = 200) => ({ config, headers: {}, data: JSON.parse(JSON.stringify(data)), status })
    if ((config.method === 'get' && loiDoc) || (config.method === 'post' && loiGhi)) {
      const loi = config.method === 'get' ? loiDoc : loiGhi
      if (loi.status === 0) throw new AxiosError('Network test only', 'ERR_NETWORK', config)
      throw new AxiosError('Private SQL', 'ERR_BAD_REQUEST', config, null, tra({ success: false, error: { code: loi.code, message: 'Private SQL' } }, loi.status))
    }
    if (config.url === '/books') return tra(trang([sach]))
    if (config.url === '/books/42/copies') return tra(trang([banSao]))
    if (config.url === '/borrows' && config.method === 'get') return tra(trang(config.params.status === 'returned' ? [] : [phieu]))
    if (config.url === '/borrows/10') return tra({ success: true, data: phieu })
    if (config.url === '/borrows' && config.method === 'post') {
      const body = JSON.parse(config.data)
      phieu = { ...phieu, ...body, details: body.copy_ids.map(copy_id => ({ ...chiTietMau(copy_id), copy_id })) }
      return tra({ success: true, data: phieu }, 201)
    }
    if (config.url === '/borrows/10/return') {
      const body = JSON.parse(config.data)
      phieu.details = phieu.details.map(m => body.return_all || body.items.some(i => i.copy_id === m.copy_id) ? { ...m, status: 'returned', returned_at: '2026-11-21 11:00:00', condition_after: body.return_all ? body.condition_after : body.items.find(i => i.copy_id === m.copy_id).condition_after } : m)
      phieu.status = phieu.details.every(m => m.status === 'returned') ? 'returned' : 'partially_returned'
      return tra({ success: true, data: phieu })
    }
    throw Error('Unexpected mock endpoint')
  }
})
afterEach(() => { client.clear(); ketNoiHttp.defaults.adapter = goc; vi.restoreAllMocks() })
function hienThi(permissions = ['borrow_manage', 'return_process'], full = false) {
  return render(<QueryClientProvider client={client}><NguCanhXacThuc.Provider value={phien(permissions)}><MemoryRouter initialEntries={['/app/muon-tra']}>
    {full ? <DinhTuyenUngDung /> : <TrangMuonTra />}
  </MemoryRouter></NguCanhXacThuc.Provider></QueryClientProvider>)
}
async function moPhieu() { await userEvent.click(await screen.findByRole('button', { name: 'Xem phiếu #10' })); return screen.findByRole('region', { name: 'Chi tiết phiếu 10' }) }

it('matches both exact normalized title and author, supports sizes and falls back once on image errors', () => {
  const { rerender } = render(<AnhBiaSach sach={{ title: ' Don Quijote ', author: 'Miguel de Cervantes' }} />)
  expect(screen.getByRole('img')).toHaveAttribute('src', '/Anh/BiaSach/don-quijote.jpg')
  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByRole('img')).toHaveAttribute('src', '/Anh/BiaSach/bia-sach-mac-dinh.svg')
  rerender(<AnhBiaSach sach={sach} size="chi-tiet" />)
  expect(screen.getByRole('img')).toHaveAttribute('src', '/Anh/BiaSach/doi-gio-hu.jpg')
  expect(screen.getByRole('img')).toHaveClass('book-cover--chi-tiet')
  rerender(<AnhBiaSach sach={{ ...sach, author: 'Khác tác giả' }} size="the" />)
  expect(screen.getByRole('img')).toHaveAttribute('src', '/Anh/BiaSach/bia-sach-mac-dinh.svg')
  expect(screen.getByRole('img')).toHaveClass('book-cover--the')
})
it('renders real-contract rows, applies only supported filters, handles empty/error and retries safely', async () => {
  loiDoc = { status: 500, code: 'INTERNAL_ERROR' }; hienThi()
  expect(await screen.findByRole('alert')).not.toHaveTextContent('Private SQL')
  loiDoc = null; await userEvent.click(screen.getByRole('button', { name: 'Thử tải phiếu' }))
  expect(await screen.findByText('Độc giả #30')).toBeVisible()
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái phiếu'), 'returned')
  await userEvent.type(screen.getByLabelText('Lọc mã độc giả'), '30')
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
  expect(await screen.findByText('Chưa có phiếu phù hợp')).toBeVisible()
  expect(goi.at(-1).params).toEqual({ page: 1, limit: 10, status: 'returned', user_id: '30' })
})
it('reviews before creating, sends exact DTO with bigint strings/pinned bearer and refreshes confirmed data', async () => {
  hienThi(); await screen.findByText('Độc giả #30')
  await userEvent.click(screen.getByRole('button', { name: 'Lập phiếu mượn' }))
  await userEvent.type(screen.getByLabelText(/^Mã độc giả/), '30')
  fireEvent.change(screen.getByLabelText(/^Hạn trả/), { target: { value: '2035-01-02T12:00' } })
  await screen.findByRole('option', { name: /Đồi gió hú/ })
  await userEvent.selectOptions(screen.getByLabelText('Đầu sách'), '42')
  await userEvent.click(await screen.findByRole('button', { name: 'Chọn BIA-42' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xem lại phiếu' }))
  expect(screen.getByRole('region', { name: 'Xem lại phiếu mượn' })).toBeVisible()
  expect(goi.filter(m => m.method === 'post')).toHaveLength(0)
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận lập phiếu' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  const ghi = goi.find(m => m.method === 'post')
  expect(ghi.url).toBe('/borrows'); expect(ghi.headers.Authorization).toBe('Bearer mock-fe10-only')
  expect(JSON.parse(ghi.data)).toEqual({ user_id: '30', copy_ids: [banSao.copy_id], due_date: new Date('2035-01-02T12:00').toISOString().replace('.000Z', 'Z'), note: null })
  expect(toast.success).toHaveBeenCalledWith('Đã lập phiếu mượn.')
})
it('shows detail and confirms partial return with per-copy condition before writing', async () => {
  hienThi(); const detail = await moPhieu()
  expect(within(detail).getByText('2035-01-01 10:00:00')).toBeVisible()
  await userEvent.click(screen.getByRole('checkbox', { name: 'Trả bản sao 101' }))
  await userEvent.selectOptions(screen.getByLabelText('Tình trạng trả bản sao 101'), 'damaged')
  await userEvent.click(screen.getByRole('button', { name: 'Trả bản sao đã chọn (1)' }))
  expect(goi.filter(m => m.method === 'post')).toHaveLength(0)
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận trả sách' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(goi.find(m => m.method === 'post').data)).toEqual({ items: [{ copy_id: '101', condition_after: 'damaged' }] })
  expect(await within(screen.getByRole('table', { name: 'Danh sách phiếu mượn' })).findByText('Đã trả một phần')).toBeVisible()
})
it('confirms return-all using its dedicated contract and shows server conflict/403 without losing the session', async () => {
  hienThi(); await moPhieu()
  await userEvent.click(screen.getByRole('button', { name: 'Trả toàn bộ phiếu' }))
  loiGhi = { status: 409, code: 'ALREADY_RETURNED' }
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận trả sách' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('đã được trả')
  expect(phieu.status).toBe('borrowed')
  loiGhi = { status: 403, code: 'FORBIDDEN' }
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận trả sách' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Phiên đăng nhập vẫn được giữ')
  expect(document.body).not.toHaveTextContent('Private SQL')
  loiGhi = null; await userEvent.click(screen.getByRole('button', { name: 'Xác nhận trả sách' }))
  expect(await within(screen.getByRole('table', { name: 'Danh sách phiếu mượn' })).findByText('Đã trả toàn bộ')).toBeVisible()
  expect(JSON.parse(goi.filter(m => m.method === 'post').at(-1).data)).toEqual({ return_all: true, condition_after: 'good' })
})
it('protects the actual route/menu without an admin bypass and hides return controls without return_process', async () => {
  const first = hienThi([], true)
  expect(await screen.findByRole('heading', { name: /^403/ })).toBeVisible(); expect(goi).toHaveLength(0)
  first.unmount(); hienThi(['borrow_manage'], true)
  expect(await screen.findByRole('link', { name: 'Mượn / Trả sách' })).toHaveAttribute('href', '/app/muon-tra')
  await moPhieu()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Trả toàn bộ phiếu' })).not.toBeInTheDocument()
})
it('validates required borrower/copies/due date and blocks replay after an unknown network write outcome', async () => {
  expect(kiemTraPhieuMuon({ user_id: '', copy_ids: [], due_date: '2020-01-01T00:00:00Z' })).toHaveProperty('user_id')
  expect(kiemTraPhieuMuon({ user_id: '30', copy_ids: ['1', '1'], due_date: '2035-02-30T00:00:00Z' })).toMatchObject({ copy_ids: expect.any(String), due_date: expect.any(String) })
  hienThi(); await moPhieu(); await userEvent.click(screen.getByRole('button', { name: 'Trả toàn bộ phiếu' }))
  loiGhi = { status: 0 }; await userEvent.click(screen.getByRole('button', { name: 'Xác nhận trả sách' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa xác minh được kết quả')
  expect(screen.getByRole('button', { name: 'Xác nhận trả sách' })).toBeDisabled()
  expect(goi.filter(m => m.method === 'post')).toHaveLength(1)
  expect(phieu.status).toBe('borrowed')
})
