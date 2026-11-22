import { render, screen, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { taoTrinhTruyVan } from '../../thu-vien/trinh-truy-van.js'
import { NguCanhXacThuc } from '../xac-thuc/useXacThuc.js'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000', error: null } }))
const goc = ketNoiHttp.defaults.adapter
const sach = { book_id: '9007199254740993', title: 'Don Quijote', author: 'Miguel de Cervantes', isbn: null,
  category_id: null, series_id: null, publisher: null, publication_year: null, description: 'Một hành trình đọc.' }
let client, loiDoc, rong, hoanTat, doiPhanHoi, cacYeuCau
beforeEach(() => {
  client = taoTrinhTruyVan(); loiDoc = false; rong = false; hoanTat = null; doiPhanHoi = false; cacYeuCau = []
  ketNoiHttp.defaults.adapter = async config => {
    cacYeuCau.push(config)
    const tra = data => ({ config, status: 200, headers: {}, data })
    if (config.url === '/books' && loiDoc) throw new AxiosError('private SQL', 'ERR_BAD_RESPONSE', config, null, { status: 500, data: { error: { code: 'INTERNAL_ERROR', message: 'private SQL' } } })
    if (config.url === `/books/${sach.book_id}`) return tra({ success: true, data: sach })
    const items = config.url === '/books' && !rong ? [sach] : []
    const response = tra({ success: true, data: items, pagination: { page: 1, limit: config.params?.limit ?? 10, total: items.length, totalPages: items.length ? 1 : 0 } })
    if (doiPhanHoi && config.url === '/books') return new Promise(resolve => { hoanTat = () => resolve(response) })
    return response
  }
})
afterEach(() => { client.clear(); ketNoiHttp.defaults.adapter = goc })
function hienThi(roles = ['reader'], permissions = ['book_view']) {
  render(<QueryClientProvider client={client}><NguCanhXacThuc.Provider value={{ daDangNhap: true, tokenTruyCap: 'home-test-token', nguoiDung: { user_id: '9', name: 'Bạn đọc mới', status: 'active', roles, permissions }, dangXuat: vi.fn() }}><MemoryRouter initialEntries={['/app']}><DinhTuyenUngDung /></MemoryRouter></NguCanhXacThuc.Provider></QueryClientProvider>)
}
it('shows API books and reader shortcuts, then opens the existing detail/copies flow by exact ID', async () => {
  hienThi()
  const bia = await screen.findByRole('link', { name: 'Xem chi tiết Don Quijote' })
  expect(screen.getByText('Xin chào, Bạn đọc mới.')).toBeVisible()
  expect(within(screen.getByRole('main')).getByRole('link', { name: 'Khám phá sách' })).toHaveAttribute('href', '/app/sach')
  expect(bia).toHaveAttribute('href', `/app/sach?sach=${sach.book_id}`)
  expect(screen.getByRole('img', { name: 'Bìa sách Don Quijote' })).toHaveAttribute('src', '/Anh/BiaSach/don-quijote.jpg')
  expect(screen.queryByRole('link', { name: /Lập phiếu|Mở tổng quan quản trị|Xem trước tần suất/ })).not.toBeInTheDocument()
  expect(screen.queryByText('Công cụ phát triển')).not.toBeInTheDocument()
  expect(cacYeuCau[0].params).toEqual({ page: 1, limit: 12, search: '' })
  await userEvent.click(bia)
  const chiTiet = await screen.findByRole('dialog', { name: 'Chi tiết sách' })
  expect(await within(chiTiet).findByText('Một hành trình đọc.')).toBeVisible()
  await within(chiTiet).findByText('Chưa có bản sao')
  expect(cacYeuCau.some(config => config.url === `/books/${sach.book_id}/copies`)).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(screen.getByRole('table', { name: 'Danh sách sách' })).toBeVisible()
})
it('does not invent management/statistics grants for Admin and renders a real empty library', async () => {
  rong = true; hienThi(['admin'], [])
  expect(await screen.findByText('Những trang sách đang chờ được lấp đầy')).toBeVisible()
  const main = screen.getByRole('main')
  expect(within(main).getByRole('link', { name: /Mở tổng quan quản trị/ })).toHaveAttribute('href', '/app/admin')
  expect(within(main).queryByRole('link', { name: /Lập phiếu|Khám phá hoạt động|Xem trước tần suất/ })).not.toBeInTheDocument()
  expect(within(main).queryByRole('article')).not.toBeInTheDocument()
})
it('shows safe errors and loads books only after explicit retry', async () => {
  loiDoc = true; hienThi()
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được sách')
  expect(document.body).not.toHaveTextContent('private SQL')
  expect(cacYeuCau).toHaveLength(1)
  loiDoc = false
  await userEvent.click(screen.getByRole('button', { name: 'Thử tải sách' }))
  expect(await screen.findByRole('heading', { name: 'Don Quijote' })).toBeVisible()
})
it('keeps a loading state until API data arrives, without runtime fallback books', async () => {
  doiPhanHoi = true; hienThi()
  expect(await screen.findByRole('status', { name: 'Đang tải sách trong thư viện' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Don Quijote' })).not.toBeInTheDocument()
  await waitFor(() => expect(hoanTat).toBeTypeOf('function'))
  await act(async () => { hoanTat() })
  expect(await screen.findByRole('heading', { name: 'Don Quijote' })).toBeVisible()
})
