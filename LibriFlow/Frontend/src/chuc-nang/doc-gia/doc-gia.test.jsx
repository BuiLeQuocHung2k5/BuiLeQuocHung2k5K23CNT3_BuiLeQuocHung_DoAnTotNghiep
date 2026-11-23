import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { AxiosError } from 'axios'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'
import { NguCanhXacThuc } from '../xac-thuc/useXacThuc.js'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { taoTrinhTruyVan } from '../../thu-vien/trinh-truy-van.js'
import { layPhieuCaNhan } from './du-lieu-doc-gia.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))
const goc = ketNoiHttp.defaults.adapter
const nguoiDung = { user_id: '9007199254740993', name: 'Độc giả kiểm thử', email: 'reader@example.test', phone: null, status: 'active', roles: ['reader'], permissions: ['book_view'], password: 'khong-render-password', password_hash: 'khong-render-hash' }
const phien = (permissions = ['book_view']) => ({ daDangNhap: true, tokenTruyCap: 'token-test-fe11', nguoiDung: { ...nguoiDung, permissions }, dangXuat: vi.fn() })
let client, goi, saiChuSoHuu, saiChiTiet, loiDoc
const phieu = { borrow_id: '10', user_id: nguoiDung.user_id, borrow_date: '2026-11-21 10:00:00', due_date: '2035-01-01 10:00:00', created_at: '2026-11-21 10:00:00', note: null, status: 'borrowed', details: [{ borrow_detail_id: '100', copy_id: '30', status: 'borrowed', returned_at: null, condition_before: 'good', condition_after: null }] }
beforeEach(() => {
  client = taoTrinhTruyVan(); goi = []; saiChuSoHuu = false; saiChiTiet = false; loiDoc = false
  ketNoiHttp.defaults.adapter = async config => {
    goi.push(config)
    const tra = (data, status = 200) => ({ config, headers: {}, status, data: JSON.parse(JSON.stringify(data)) })
    if (loiDoc) throw new AxiosError('private SQL', 'ERR_BAD_REQUEST', config, null, tra({ success: false, error: { code: 'FORBIDDEN', message: 'private SQL' } }, 403))
    if (config.url === '/borrows/10') return tra({ success: true, data: { ...phieu, user_id: saiChiTiet ? '999' : phieu.user_id, note: saiChiTiet ? 'private-other-user' : null } })
    if (config.url === '/borrows') {
      const data = config.params.status && config.params.status !== 'borrowed' ? [] : [{ ...phieu, user_id: saiChuSoHuu ? '999' : phieu.user_id }]
      return tra({ success: true, data, pagination: { page: config.params.page, limit: config.params.limit, total: data.length, totalPages: data.length ? 1 : 0 } })
    }
    throw Error('Unexpected API in reader test')
  }
})
afterEach(() => { client.clear(); ketNoiHttp.defaults.adapter = goc; vi.restoreAllMocks() })
function hienThi(path = '/app/doc-gia', principal = phien()) {
  return render(<QueryClientProvider client={client}><NguCanhXacThuc.Provider value={principal}><MemoryRouter initialEntries={[path]}><DinhTuyenUngDung /></MemoryRouter></NguCanhXacThuc.Provider></QueryClientProvider>)
}

it('navigates from reader home to personal history/detail and account, with read-only controls and no secrets', async () => {
  hienThi()
  expect(await screen.findByRole('heading', { name: 'Xin chào, Độc giả kiểm thử' }, { timeout: 3000 })).toBeVisible()
  const summary = await screen.findByText('Phiếu còn sách chưa trả')
  expect(within(summary.closest('.ui-card')).getByText('1')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Mượn / Trả sách' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('link', { name: 'Sách đang mượn và lịch sử' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xem phiếu #10' }))
  const detail = await screen.findByRole('region', { name: 'Chi tiết phiếu 10' })
  expect(within(detail).getByText('#30')).toBeVisible()
  expect(within(detail).queryByRole('checkbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Trả toàn bộ phiếu' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Đóng phiếu' }))
  await userEvent.click(screen.getByRole('link', { name: 'Tài khoản', exact: true }))
  expect(await screen.findByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible()
  expect(screen.getByText('reader@example.test')).toBeVisible()
  for (const value of ['khong-render-password', 'khong-render-hash', 'token-test-fe11']) expect(document.body).not.toHaveTextContent(value)
  expect(goi.every(c => c.method === 'get')).toBe(true)
})
it('uses JWT ownership for a reader and server-side self filter for reader with management grants, never a supplied foreign user_id', async () => {
  await layPhieuCaNhan(phien(), { page: 1, limit: 10, user_id: '999' })
  expect(goi.at(-1).params).toEqual({ page: 1, limit: 10 })
  await layPhieuCaNhan(phien(['book_view', 'borrow_manage']), { user_id: '999', status: 'borrowed' })
  expect(goi.at(-1).params).toEqual({ page: 1, limit: 10, status: 'borrowed', user_id: nguoiDung.user_id })
  expect(goi.at(-1).headers.Authorization).toBe('Bearer token-test-fe11')
})
it('rejects entire list/detail responses from another owner instead of filtering or displaying them', async () => {
  saiChuSoHuu = true; hienThi('/app/lich-su-muon')
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Phản hồi phiếu không hợp lệ')
  expect(screen.queryByRole('button', { name: 'Xem phiếu #10' })).not.toBeInTheDocument()
  saiChuSoHuu = false; await userEvent.click(screen.getByRole('button', { name: 'Thử tải lịch sử' }))
  saiChiTiet = true; await userEvent.click(await screen.findByRole('button', { name: 'Xem phiếu #10' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Phản hồi phiếu không hợp lệ')
  expect(document.body).not.toHaveTextContent('private-other-user')
  expect(screen.queryByRole('region', { name: 'Chi tiết phiếu 10' })).not.toBeInTheDocument()
})
it('filters only by supported status, handles empty and 403 safely while retaining the reader account', async () => {
  hienThi('/app/lich-su-muon')
  await screen.findByRole('button', { name: 'Xem phiếu #10' })
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái phiếu cá nhân'), 'returned')
  expect(await screen.findByText('Chưa có phiếu mượn phù hợp')).toBeVisible()
  expect(goi.at(-1).params).toEqual({ page: 1, limit: 10, status: 'returned' })
  loiDoc = true; await userEvent.click(screen.getByRole('button', { name: 'Tải lại lịch sử' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Phiên đăng nhập vẫn được giữ')
  expect(screen.getByText('Độc giả kiểm thử')).toBeVisible()
  expect(document.body).not.toHaveTextContent('private SQL')
})
it('guards reader routes for other roles/anonymous users while preserving staff management and shared account links', async () => {
  const staff = { ...phien(['borrow_manage']), nguoiDung: { ...nguoiDung, roles: ['librarian'], permissions: ['borrow_manage'] } }
  const first = hienThi('/app/doc-gia', staff)
  expect(await screen.findByRole('heading', { name: /^403/ })).toBeVisible(); expect(goi).toHaveLength(0)
  first.unmount()
  const second = hienThi('/app/tai-khoan', staff)
  await screen.findByRole('heading', { name: 'Tài khoản của tôi' })
  expect(screen.getByRole('link', { name: 'Mượn / Trả sách' })).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Góc độc giả' })).not.toBeInTheDocument()
  second.unmount(); hienThi('/app/lich-su-muon', { nguoiDung: null, daDangNhap: false })
  expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
})
