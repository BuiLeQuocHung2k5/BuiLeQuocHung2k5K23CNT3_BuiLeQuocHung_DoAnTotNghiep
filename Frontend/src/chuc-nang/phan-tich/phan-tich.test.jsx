import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AxiosError } from 'axios'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'
import { NguCanhXacThuc } from '../xac-thuc/useXacThuc.js'
import { taoTrinhTruyVan } from '../../thu-vien/trinh-truy-van.js'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))
const goc = ketNoiHttp.defaults.adapter
let client, goi, trangThaiDuBao, loiDoc, rong, saiTong
const tong = { books_total: 18, copies_total: 42, users_total: 3, borrows_total: 10, borrows_in_period: 2, borrowed_copies_in_period: 5, returned_copies_in_period: 1 }
function duBaoMau(user_id) {
  return { user_id, cutoff_date: '2026-11-21', status: trangThaiDuBao === 'insufficient_data' ? 'insufficient_data' : 'ready', reason: 'COVERAGE_UNVERIFIED', target: 'borrow_receipts_per_user_per_day', model_version: 'borrow_daily_sma7_v1', timezone: 'UTC', horizon_days: 7, persisted: false,
    training: { start_date: '2026-11-14', end_date: '2026-11-20', observed_days: 7, borrow_count: 5 }, coverage: { status: 'verified', start_date: '2026-11-01', end_date: '2026-11-20' },
    history: [2,0,3,0,0,0,0].map((count,i)=>({day:"2026-11-"+(14+i),count})),
    predictions: trangThaiDuBao === 'insufficient_data' ? [] : Array.from({ length: 7 }, (_, i) => ({ forecast_date: `2026-11-${22 + i}`, predicted_count: trangThaiDuBao === 'negative' && i === 0 ? '-1.00' : '0.71' })),
    evaluation: { status: 'insufficient_data', sample_count: 0, mae: null, folds: [] } }
}
beforeEach(() => {
  client = taoTrinhTruyVan(); goi = []; trangThaiDuBao = 'ready'; loiDoc = false; rong = false; saiTong = false
  ketNoiHttp.defaults.adapter = async config => {
    goi.push(config)
    const tra = (data, status = 200) => ({ config, status, headers: {}, data: JSON.parse(JSON.stringify(data)) })
    if (loiDoc) throw new AxiosError('private SQL', 'ERR_BAD_REQUEST', config, null, tra({ success: false, error: { code: 'FORBIDDEN', message: 'private SQL' } }, 403))
    const p = config.params ?? {}, period = { start_date: p.start_date ?? '2026-11-01', end_date: p.end_date ?? '2026-11-21', timezone: 'UTC' }
    if (config.url === '/statistics/overview') return tra({ success: true, data: saiTong ? {} : tong, period })
    if (config.url === '/statistics/borrows') {
      const data = rong ? [] : p.group_by === 'month' ? [{ period_start: p.start_date.slice(0, 7), borrow_count: 2, borrowed_copy_count: 5 }] :
        p.user_id ? [{ period_start: '2026-11-14', borrow_count: 2, borrowed_copy_count: 2 }, { period_start: '2026-11-16', borrow_count: 3, borrowed_copy_count: 3 }] : [{ period_start: p.start_date, borrow_count: 2, borrowed_copy_count: 5 }]
      return tra({ success: true, data, period: { ...period, group_by: p.group_by } })
    }
    if (config.url === '/admin/users' || config.url === '/forecasts/lookup') return tra({data:[{user_id:'42',name:'Độc giả thử',roles:['reader']}]})
    if (config.url.endsWith('/generate')) return tra({data:{created:true}})
    if (config.url.endsWith('/history')) return tra({data:[{cutoff_date:'2026-11-21',created_at:'2026-11-21T09:00:00Z'}]})
    if (config.url.endsWith('/history/2026-11-21')) return tra({data:duBaoMau('42').predictions})
    if (config.url.startsWith('/forecasts/')) return tra({ success: true, data: duBaoMau(config.url === '/forecasts/me' ? '5' : config.url.split('/').at(-1)) })
    throw Error('Unexpected analytics endpoint')
  }
})
afterEach(() => { client.clear(); ketNoiHttp.defaults.adapter = goc; vi.restoreAllMocks() })
function hienThi(path, permissions = ['report_view', 'forecast_view']) {
  return render(<QueryClientProvider client={client}><NguCanhXacThuc.Provider value={{ daDangNhap: true, tokenTruyCap: 'mock-fe13-only', nguoiDung: { user_id: '5', name: 'Admin kiểm thử', roles: ['admin'], permissions, status: 'active' }, dangXuat: vi.fn() }}>
    <MemoryRouter initialEntries={[path]}><DinhTuyenUngDung /></MemoryRouter>
  </NguCanhXacThuc.Provider></QueryClientProvider>)
}
it('renders actual statistics and distinct receipt/copy units, applying supported dates/group/user filters without filtering inventory by user', async () => {
  hienThi('/app/thong-ke')
  const bang = await screen.findByRole('table', { name: 'Số liệu biểu đồ mượn' }, { timeout: 3000 })
  expect(within(bang).getByRole('cell', { name: '2' })).toBeVisible()
  expect(within(bang).getByRole('cell', { name: '5' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Các số tổng' })).toHaveTextContent('Tài khoản (mọi vai trò)')
  fireEvent.change(screen.getByLabelText('Từ ngày (UTC)'), { target: { value: '2026-11-01' } })
  fireEvent.change(screen.getByLabelText('Đến ngày (UTC)'), { target: { value: '2026-11-30' } })
  await userEvent.selectOptions(screen.getByLabelText('Nhóm theo'), 'month')
  await userEvent.type(screen.getByLabelText('Mã người dùng (chỉ chuỗi mượn)'), '9007199254740993')
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
  expect(await screen.findByRole('cell', { name: '2026-11' })).toBeVisible()
  expect(goi.filter(c => c.url === '/statistics/overview').at(-1).params).toEqual({ start_date: '2026-11-01', end_date: '2026-11-30' })
  expect(goi.filter(c => c.url === '/statistics/borrows').at(-1).params).toEqual({ start_date: '2026-11-01', end_date: '2026-11-30', group_by: 'month', user_id: '9007199254740993' })
})
it('shows server predictions and authorized history as separate series, without filling or connecting missing days', async () => {
  const { container } = hienThi('/app/du-bao')
  const forecast = await screen.findByRole('table', { name: 'Kết quả dự báo từ Backend' }, { timeout: 3000 })
  expect(within(forecast).getAllByRole('row')).toHaveLength(8)
  expect(within(forecast).getAllByRole('cell', { name: '0.71' })).toHaveLength(7)
  expect(container.querySelectorAll('.forecast-history-point')).toHaveLength(7)
  expect(container.querySelector('.forecast-history').getAttribute('d').match(/L/g)).toHaveLength(6)
  expect(container.querySelector('.forecast-prediction').getAttribute('d').match(/L/g)).toHaveLength(6)
  expect(screen.getByText(/Chưa đủ dữ liệu đánh giá MAE/)).toBeVisible()
  expect(goi.some(c => c.url === '/statistics/borrows')).toBe(false)
  expect(goi.every(c => c.method === 'get')).toBe(true)
})
it('shows insufficient_data as an explanation instead of invented zero predictions or a generation action', async () => {
  trangThaiDuBao = 'insufficient_data'; hienThi('/app/du-bao', ['forecast_view'])
  expect(await screen.findByText('Chưa đủ điều kiện dự báo', {}, { timeout: 3000 })).toBeVisible()
  expect(screen.queryByRole('table', { name: 'Kết quả dự báo từ Backend' })).not.toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /tạo|lưu/i })).not.toBeInTheDocument()
  expect(goi.map(c => c.url)).toEqual(['/forecasts/me'])
})
it('rejects negative forecasts without clamping; retries valid data and switches target only through the exact GET contract', async () => {
  trangThaiDuBao = 'negative'; hienThi('/app/du-bao', ['forecast_view'])
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('giá trị bất thường')
  expect(screen.queryByRole('table', { name: 'Kết quả dự báo từ Backend' })).not.toBeInTheDocument()
  trangThaiDuBao = 'ready'; await userEvent.click(screen.getByRole('button', { name: 'Thử tải dự báo' }))
  await screen.findByRole('table', { name: 'Kết quả dự báo từ Backend' })
  expect(goi.some(c => c.url.startsWith('/statistics/'))).toBe(false)
  await userEvent.type(screen.getByLabelText('Mã người dùng dự báo'), '42')
  await userEvent.click(screen.getByRole('button', { name: 'Xem dự báo' }))
  expect(await screen.findByRole('heading', { name: 'Người dùng #42' })).toBeVisible()
  expect(goi.at(-1).url).toBe('/forecasts/users/42'); expect(goi.at(-1).params).toBeUndefined()
})
it('does not turn missing statistics into zero; handles empty series and rejects invalid filter ranges before requesting', async () => {
  saiTong = true; hienThi('/app/thong-ke')
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Phản hồi số liệu không hợp lệ')
  expect(screen.queryByRole('region', { name: 'Các số tổng' })).not.toBeInTheDocument()
  saiTong = false; rong = true; await userEvent.click(screen.getByRole('button', { name: 'Thử tải thống kê' }))
  expect(await screen.findByText('Không có kỳ phát sinh')).toBeVisible()
  const soLan = goi.length
  fireEvent.change(screen.getByLabelText('Từ ngày (UTC)'), { target: { value: '2020-01-01' } })
  fireEvent.change(screen.getByLabelText('Đến ngày (UTC)'), { target: { value: '2026-11-21' } })
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
  expect(screen.getByRole('alert')).toHaveTextContent('366 ngày'); expect(goi).toHaveLength(soLan)
})
it('requires each real permission, preserves the admin session on 403, and adds only authorized admin shortcuts', async () => {
  const first = hienThi('/app/du-bao', ['report_view'])
  expect(await screen.findByRole('table', { name: 'Kết quả dự báo từ Backend' })).toBeVisible(); expect(screen.queryByLabelText('Mã người dùng dự báo')).toBeNull()
  first.unmount(); goi = []
  const second = hienThi('/app/thong-ke', [])
  expect(await screen.findByRole('heading', { name: /^403/ })).toBeVisible(); expect(goi).toHaveLength(0)
  second.unmount()
  const third = hienThi('/app/admin')
  expect(await screen.findByRole('link', { name: 'Thống kê chi tiết' })).toHaveAttribute('href', '/app/thong-ke')
  expect(screen.getByRole('link', { name: 'Xem dự báo tần suất' })).toHaveAttribute('href', '/app/du-bao')
  third.unmount(); client.clear(); loiDoc = true; hienThi('/app/thong-ke')
  expect(await screen.findByRole('alert')).toHaveTextContent('Không có quyền')
  expect(screen.getByText('Admin kiểm thử')).toBeVisible(); expect(document.body).not.toHaveTextContent('private SQL')
})

it.each([[['forecast_view'],'/forecasts/lookup'],[['forecast_view','user_manage'],'/admin/users']])('selects a target with allowed lookup and reads the saved run',async (permissions,url)=>{
  hienThi('/app/du-bao',permissions)
  await userEvent.type(screen.getByLabelText('Tên hoặc email người dùng'),'doc')
  await userEvent.click(screen.getByRole('button',{name:'Tìm người dùng'}))
  await userEvent.click(await screen.findByRole('button',{name:/Độc giả thử · #42/}))
  await screen.findByRole('heading',{name:'Người dùng #42'})
  expect(goi.some(c=>c.url===url && c.params.search==='doc')).toBe(true)
  if(permissions.includes('user_manage')) await userEvent.click(screen.getByRole('button',{name:'Lưu dự báo'}))
  else {
    expect(screen.queryByRole('button',{name:'Lưu dự báo'})).toBeNull()
    await userEvent.click(screen.getByRole('button',{name:'Xem lịch sử'}))
  }
  await userEvent.click(await screen.findByRole('button',{name:/Ngày cắt 2026-11-21/}))
  const bang=await screen.findByRole('table',{name:'Dự báo đã lưu ngày 2026-11-21'})
  expect(within(bang).getAllByRole('row')).toHaveLength(8)
})
