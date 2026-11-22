import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import QuanLyBanSao from './QuanLyBanSao.jsx'
import { kiemTraBieuMauBanSao, ghiBanSao } from './dich-vu-ban-sao.js'
import { NguCanhXacThuc } from '../xac-thuc/useXacThuc.js'
import { taoTrinhTruyVan } from '../../thu-vien/trinh-truy-van.js'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000', error: null } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const goc = ketNoiHttp.defaults.adapter
const maSach = '18446744073709551610'
const mau = { copy_id: '9007199254740993', book_id: maSach, barcode: 'LIB-001', isbn: null, condition_status: 'good', availability_status: 'available' }
let client, cacBanSao, goi, loiGhi, loiDoc
const phien = permissions => ({ daDangNhap: true, tokenTruyCap: 'token-test', nguoiDung: { status: 'active', roles: ['admin'], permissions } })
beforeEach(() => {
  client = taoTrinhTruyVan(); cacBanSao = [{ ...mau }]; goi = []; loiGhi = null; loiDoc = false
  ketNoiHttp.defaults.adapter = async config => {
    goi.push(config)
    const tra = (data, status = 200) => ({ config, status, data, headers: {} })
    if ((config.method !== 'get' && loiGhi) || (config.method === 'get' && loiDoc)) throw new AxiosError('private SQL', 'ERR_BAD_REQUEST', config, null, tra({ success: false, error: { code: config.method === 'get' ? 'INTERNAL_ERROR' : loiGhi.code, message: 'private SQL' } }, config.method === 'get' ? 500 : loiGhi.status))
    if (config.method === 'get') return tra({ success: true, data: cacBanSao, pagination: { page: config.params.page, limit: 10, total: cacBanSao.length, totalPages: 1 } })
    if (config.method === 'delete') { cacBanSao = []; return tra({ success: true, data: null }) }
    const data = { ...mau, ...JSON.parse(config.data) }; cacBanSao = [data]
    return tra({ success: true, data }, config.method === 'post' ? 201 : 200)
  }
})
afterEach(() => { client.clear(); ketNoiHttp.defaults.adapter = goc; vi.restoreAllMocks() })
function hienThi(permissions = ['copy_manage']) {
  const noiDung = quyen => <QueryClientProvider client={client}><NguCanhXacThuc.Provider value={phien(quyen)}><QuanLyBanSao maSach={maSach} onBusyChange={vi.fn()} /></NguCanhXacThuc.Provider></QueryClientProvider>
  const ketQua = render(noiDung(permissions))
  return { doiQuyen: quyen => ketQua.rerender(noiDung(quyen)) }
}
it('reads copies using the exact book ID; admin without grants only sees public fields and circulation stays read-only', async () => {
  cacBanSao.push({ ...mau, copy_id: '2', barcode: 'LIB-002', availability_status: 'borrowed' })
  hienThi([])
  expect(await screen.findByText('LIB-001')).toBeVisible()
  expect(screen.getByText('Đang mượn')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Thêm bản sao' })).not.toBeInTheDocument()
  expect(goi[0].url).toBe(`/books/${maSach}/copies`)
  expect(goi[0].params).toEqual({ page: 1, limit: 10 })
  expect(screen.queryByText('Ghi chú nội bộ')).not.toBeInTheDocument()
})
it('validates, creates a copy with pinned bearer and refreshes the list', async () => {
  hienThi(); await screen.findByText('LIB-001')
  await userEvent.click(screen.getByRole('button', { name: 'Thêm bản sao' }))
  const form = screen.getByRole('form', { name: 'Thêm bản sao' })
  await userEvent.click(within(form).getByRole('button', { name: 'Thêm bản sao' }))
  expect(goi.filter(muc => muc.method === 'post')).toHaveLength(0)
  await userEvent.type(screen.getByLabelText(/^Mã vạch/), 'LIB-NEW')
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái bản sao'), 'maintenance')
  await userEvent.click(within(form).getByRole('button', { name: 'Thêm bản sao' }))
  expect(await screen.findByText('LIB-NEW')).toBeVisible()
  const ghi = goi.find(muc => muc.method === 'post')
  expect(ghi.url).toBe('/book-copies'); expect(ghi.headers.Authorization).toBe('Bearer token-test')
  expect(JSON.parse(ghi.data)).toEqual({ book_id: maSach, barcode: 'LIB-NEW', isbn: null, condition_status: 'good', availability_status: 'maintenance', note: null })
})
it('requires explicit note replacement on edit and disables saving if permission disappears', async () => {
  const trang = hienThi(); await screen.findByText('LIB-001')
  await userEvent.click(screen.getByRole('button', { name: 'Sửa bản sao LIB-001' }))
  expect(screen.getByRole('button', { name: 'Lưu bản sao' })).toBeDisabled()
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.selectOptions(screen.getByLabelText('Tình trạng bản sao'), 'damaged')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu bản sao' }))
  await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument())
  expect(JSON.parse(goi.find(muc => muc.method === 'put').data)).toMatchObject({ book_id: maSach, condition_status: 'damaged', note: null })
  await userEvent.click(screen.getByRole('button', { name: 'Sửa bản sao LIB-001' }))
  await userEvent.click(screen.getByRole('checkbox')); trang.doiQuyen([])
  expect(screen.getByRole('button', { name: 'Lưu bản sao' })).toBeDisabled()
})
it('confirms deletion, handles history conflicts/403 without discarding the form, then refreshes to empty', async () => {
  hienThi(); await screen.findByText('LIB-001')
  await userEvent.click(screen.getByRole('button', { name: 'Xóa bản sao LIB-001' }))
  expect(goi.filter(muc => muc.method === 'delete')).toHaveLength(0)
  loiGhi = { status: 409, code: 'COPY_HAS_LOAN_HISTORY' }
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa bản sao' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('lịch sử mượn')
  loiGhi = { status: 403, code: 'FORBIDDEN' }
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa bản sao' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Phiên đăng nhập vẫn được giữ')
  expect(document.body).not.toHaveTextContent('private SQL')
  loiGhi = null
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa bản sao' }))
  expect(await screen.findByText('Chưa có bản sao')).toBeVisible()
})
it('retries read errors explicitly and blocks replay after an uncertain write', async () => {
  loiDoc = true; hienThi()
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được bản sao')
  loiDoc = false; await userEvent.click(screen.getByRole('button', { name: 'Thử tải bản sao' })); await screen.findByText('LIB-001')
  await userEvent.click(screen.getByRole('button', { name: 'Xóa bản sao LIB-001' }))
  loiGhi = { status: 500, code: 'INTERNAL_ERROR' }
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa bản sao' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa xác minh')
  expect(screen.getByRole('button', { name: 'Xác nhận xóa bản sao' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Đóng và tải lại' }))
  expect(screen.queryByRole('button', { name: 'Xác nhận xóa bản sao' })).not.toBeInTheDocument()
})
it('enforces backend field limits and copy_manage before transport', async () => {
  const giaTri = { ...mau, barcode: 'a'.repeat(51), isbn: 'a'.repeat(21), availability_status: 'lost', note: '\ud800' }
  expect(Object.keys(kiemTraBieuMauBanSao(giaTri).loi)).toEqual(expect.arrayContaining(['barcode', 'isbn', 'availability_status', 'note']))
  await expect(ghiBanSao('xoa', mau.copy_id, null, phien([]))).rejects.toMatchObject({ code: 'COPY_ACTION_FORBIDDEN' })
  expect(goi).toHaveLength(0)
})
