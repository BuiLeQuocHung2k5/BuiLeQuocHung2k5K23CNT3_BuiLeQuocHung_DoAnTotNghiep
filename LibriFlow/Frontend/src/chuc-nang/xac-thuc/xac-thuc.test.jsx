import { useEffect, StrictMode } from 'react'
import { BrowserRouter } from 'react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import App from '../../ung-dung/App.jsx'
import BoCungCapUngDung from '../../ung-dung/bo-cung-cap/BoCungCapUngDung.jsx'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import { useXacThuc } from './useXacThuc.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))

const boVanChuyenGoc = ketNoiHttp.defaults.adapter
const nguoiDungThu = { user_id: '18446744073709551614', name: 'Bạn đọc kiểm thử', email: 'reader@example.test',
  status: 'active', roles: ['reader', 'librarian'], permissions: ['report_view'] }
let xuLyYeuCau, xacThuc, trinhTruyVan, cacYeuCau

function phanHoi(cauHinh, data, status = 200) {
  const ketQua = { config: cauHinh, status, data, headers: {} }
  if (status >= 400) throw new AxiosError('Mock HTTP error', 'ERR_BAD_REQUEST', cauHinh, null, ketQua)
  return ketQua
}

beforeEach(() => {
  moiTruong.error = null
  xacThuc = null
  trinhTruyVan = null
  cacYeuCau = []
  window.history.replaceState({}, '', '/dang-nhap')
  xuLyYeuCau = cauHinh => {
    if (cauHinh.url === '/auth/login') return phanHoi(cauHinh, { success: true, data: { accessToken: 'token-mock-a', tokenType: 'Bearer', expiresIn: 900 } })
    if (cauHinh.url === '/auth/me') return phanHoi(cauHinh, { success: true, data: nguoiDungThu })
    if (cauHinh.url === '/auth/logout') return phanHoi(cauHinh, { success: true, data: null })
    return phanHoi(cauHinh, { success: true, data: [] })
  }
  ketNoiHttp.defaults.adapter = vi.fn(async cauHinh => {
    cacYeuCau.push(cauHinh)
    return xuLyYeuCau(cauHinh)
  })
})

afterEach(() => {
  ketNoiHttp.defaults.adapter = boVanChuyenGoc
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function QuanSatPhien() {
  const phien = useXacThuc()
  const truyVan = useQueryClient()
  useEffect(() => { xacThuc = phien; trinhTruyVan = truyVan }, [phien, truyVan])
  return null
}

function hienThi() {
  return render(<StrictMode><BoCungCapUngDung><BrowserRouter><QuanSatPhien /><DinhTuyenUngDung /></BrowserRouter></BoCungCapUngDung></StrictMode>)
}

async function dienVaGui() {
  const nguoiThaoTac = userEvent.setup()
  await nguoiThaoTac.type(screen.getByLabelText(/^Email/), ' READER@example.test ')
  await nguoiThaoTac.type(screen.getByLabelText(/^Mật khẩu/), ' mat khau thu ')
  await nguoiThaoTac.click(screen.getByRole('button', { name: 'Đăng nhập', exact: true }))
}

async function dangNhapThanhCong() {
  await dienVaGui()
  await screen.findByText('Bạn đọc kiểm thử')
  await waitFor(() => expect(window.location.pathname).toBe('/app'))
}

describe('FE-06 — UI và phiên qua Axios adapter mock, không Backend/MySQL thật', () => {
  it('renders the real login route without any startup request', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText(/^Mật khẩu/)).toHaveAttribute('type', 'password')
    expect(document.title).toBe('Đăng nhập · LibriFlow')
    expect(cacYeuCau).toHaveLength(0)
  })

  it('validates required fields in Vietnamese before transport', async () => {
    hienThi()
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập', exact: true }))
    expect(screen.getByText('Nhập địa chỉ email hợp lệ.')).toBeVisible()
    expect(screen.getByText('Nhập mật khẩu của bạn.')).toBeVisible()
    expect(cacYeuCau).toHaveLength(0)
  })

  it('uses only email/password, preserves password whitespace, verifies me and shows live roles', async () => {
    const docLuuTru = vi.spyOn(Storage.prototype, 'getItem')
    const ghiLuuTru = vi.spyOn(Storage.prototype, 'setItem')
    hienThi()
    await dangNhapThanhCong()
    expect(cacYeuCau.map(muc => [muc.method, muc.url])).toEqual([['post', '/auth/login'], ['get', '/auth/me']])
    expect(JSON.parse(cacYeuCau[0].data)).toEqual({ email: 'reader@example.test', password: ' mat khau thu ' })
    expect(cacYeuCau[0].headers.has('Authorization')).toBe(false)
    expect(cacYeuCau[1].headers.get('Authorization')).toBe('Bearer token-mock-a')
    expect(cacYeuCau[1].withCredentials).toBe(false)
    expect(screen.getByText('Bạn đọc, Thủ thư')).toBeVisible()
    expect(xacThuc.nguoiDung.user_id).toBe(nguoiDungThu.user_id)
    expect(docLuuTru).not.toHaveBeenCalled()
    expect(ghiLuuTru).not.toHaveBeenCalled()
    expect(document.body).not.toHaveTextContent('token-mock-a')
    expect(window.location.href).not.toContain('token-mock-a')
    expect(trinhTruyVan.getQueryCache().getAll()).toHaveLength(0)
  })

  it.each(['/app', '/app/', '/app/unknown', '/app/api-check/unknown'])('redirects anonymous %s to login', async duongDan => {
    window.history.replaceState({}, '', duongDan)
    hienThi()
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(window.location.pathname).toBe('/dang-nhap')
    expect(cacYeuCau).toHaveLength(0)
  })

  it.each([['/app/layouts', 'Bố cục theo vai trò'], ['/app/workspace', 'Khu vực nội dung'], ['/app/api-check', 'Kiểm tra API công khai']])('preserves the anonymous technical route %s', async (duongDan, tieuDe) => {
    window.history.replaceState({}, '', duongDan)
    hienThi()
    expect(await screen.findByRole('heading', { name: tieuDe, level: 1 })).toBeVisible()
    expect(screen.getByText('Chế độ xem thử')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument()
    expect(cacYeuCau).toHaveLength(0)
  })

  it.each([[401, 'INVALID_CREDENTIALS', /Email hoặc mật khẩu/], [403, 'ACCOUNT_INACTIVE', /bị khóa/], [429, 'TOO_MANY_ATTEMPTS', /quá nhiều lần/], [503, 'JWT_NOT_CONFIGURED', /tạm thời chưa sẵn sàng/]])('shows safe login feedback for %s without retries or a principal', async (status, code, thongBao) => {
    xuLyYeuCau = cauHinh => phanHoi(cauHinh, { success: false, error: { code, message: '<script>private backend detail</script>' } }, status)
    hienThi()
    await dienVaGui()
    expect(await screen.findByRole('alert')).toHaveTextContent(thongBao)
    expect(document.body).not.toHaveTextContent('private backend detail')
    expect(xacThuc.daDangNhap).toBe(false)
    expect(xacThuc.tokenTruyCap).toBeNull()
    expect(cacYeuCau).toHaveLength(1)
    expect(screen.getByLabelText(/^Mật khẩu/)).toHaveValue('')
  })

  it('does not commit a token or profile if me fails after login', async () => {
    const xuLyGoc = xuLyYeuCau
    xuLyYeuCau = cauHinh => cauHinh.url === '/auth/me' ? phanHoi(cauHinh, { success: false, error: { code: 'INVALID_TOKEN' } }, 401) : xuLyGoc(cauHinh)
    hienThi()
    await dienVaGui()
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(xacThuc.daDangNhap).toBe(false)
    expect(xacThuc.nguoiDung).toBeNull()
    expect(xacThuc.tokenTruyCap).toBeNull()
    expect(window.location.pathname).toBe('/dang-nhap')
  })

  it('rejects an unexpected login envelope instead of accepting a fake session', async () => {
    xuLyYeuCau = cauHinh => phanHoi(cauHinh, '<html>wrong origin</html>')
    hienThi()
    await dienVaGui()
    expect(await screen.findByRole('alert')).toHaveTextContent(/chưa đúng định dạng/)
    expect(xacThuc.daDangNhap).toBe(false)
    expect(cacYeuCau).toHaveLength(1)
  })

  it('shows loading, disables duplicate submission and waits for me before entering app', async () => {
    let hoanTat
    const xuLyGoc = xuLyYeuCau
    xuLyYeuCau = cauHinh => cauHinh.url === '/auth/me' ? new Promise(resolve => { hoanTat = () => resolve(xuLyGoc(cauHinh)) }) : xuLyGoc(cauHinh)
    hienThi()
    await dienVaGui()
    expect(screen.getByRole('button', { name: /Đang đăng nhập/ })).toBeDisabled()
    expect(screen.getByLabelText(/^Mật khẩu/)).toBeDisabled()
    expect(xacThuc.daDangNhap).toBe(false)
    expect(window.location.pathname).toBe('/dang-nhap')
    await act(async () => { hoanTat() })
    await screen.findByText('Bạn đọc kiểm thử')
  })

  it.each([false, true])('clears token/profile/caches immediately on logout even with network failure=%s', async loiMang => {
    const xuLyGoc = xuLyYeuCau
    xuLyYeuCau = cauHinh => {
      if (loiMang && cauHinh.url === '/auth/logout') throw new AxiosError('Network Error', 'ERR_NETWORK', cauHinh)
      return xuLyGoc(cauHinh)
    }
    hienThi()
    await dangNhapThanhCong()
    trinhTruyVan.setQueryData(['du-lieu-rieng', nguoiDungThu.user_id], { private: true })
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(xacThuc.tokenTruyCap).toBeNull()
    expect(xacThuc.nguoiDung).toBeNull()
    expect(trinhTruyVan.getQueryCache().getAll()).toHaveLength(0)
    expect(cacYeuCau.at(-1).url).toBe('/auth/logout')
    expect(cacYeuCau.at(-1).headers.get('Authorization')).toBe('Bearer token-mock-a')
  })

  it('attaches Bearer to current API requests and clears only the current session on protected 401', async () => {
    hienThi()
    await dangNhapThanhCong()
    xuLyYeuCau = cauHinh => phanHoi(cauHinh, { success: false, error: { code: 'TOKEN_EXPIRED' } }, 401)
    await act(async () => { await ketNoiHttp.get('/protected').catch(() => {}) })
    expect(cacYeuCau.at(-1).headers.get('Authorization')).toBe('Bearer token-mock-a')
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(/Phiên đăng nhập đã hết hạn/)
    expect(xacThuc.daDangNhap).toBe(false)
  })

  it('keeps the session and cache on protected 403', async () => {
    hienThi()
    await dangNhapThanhCong()
    trinhTruyVan.setQueryData(['du-lieu-rieng'], 'giữ lại')
    xuLyYeuCau = cauHinh => phanHoi(cauHinh, { success: false, error: { code: 'FORBIDDEN' } }, 403)
    await act(async () => { await ketNoiHttp.get('/protected').catch(() => {}) })
    expect(xacThuc.daDangNhap).toBe(true)
    expect(trinhTruyVan.getQueryData(['du-lieu-rieng'])).toBe('giữ lại')
    expect(window.location.pathname).toBe('/app')
  })

  it('expires the session on focus after the fixed TTL without refreshing', async () => {
    hienThi()
    await dangNhapThanhCong()
    const lucSau = Date.now() + 900001
    vi.spyOn(Date, 'now').mockReturnValue(lucSau)
    fireEvent.focus(window)
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(xacThuc.tokenTruyCap).toBeNull()
    expect(cacYeuCau).toHaveLength(2)
  })

  it('requires login again after remount/reload without recovering storage', async () => {
    const lanDau = hienThi()
    await dangNhapThanhCong()
    lanDau.unmount()
    hienThi()
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(xacThuc.daDangNhap).toBe(false)
    expect(cacYeuCau).toHaveLength(2)
  })

  it('does not let a delayed 401 from an old session log out a new session', async () => {
    hienThi()
    await dangNhapThanhCong()
    let tuChoiCu
    const xuLyGoc = xuLyYeuCau
    xuLyYeuCau = cauHinh => cauHinh.url === '/slow-protected' ? new Promise((resolve, reject) => {
      tuChoiCu = () => { try { phanHoi(cauHinh, { success: false, error: { code: 'INVALID_TOKEN' } }, 401) } catch (loi) { reject(loi) } }
    }) : xuLyGoc(cauHinh)
    const yeuCauCu = ketNoiHttp.get('/slow-protected').catch(() => {})
    await waitFor(() => expect(tuChoiCu).toBeTypeOf('function'))
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByRole('heading', { name: 'Đăng nhập' })
    await dangNhapThanhCong()
    await act(async () => { tuChoiCu(); await yeuCauCu })
    expect(xacThuc.daDangNhap).toBe(true)
    expect(window.location.pathname).toBe('/app')
  })

  it('does not attach the session token to an external URL', async () => {
    hienThi()
    await dangNhapThanhCong()
    await ketNoiHttp.get('https://example.test/public')
    expect(cacYeuCau.at(-1).headers.has('Authorization')).toBe(false)
  })

  it('clears the session before a slow logout response finishes', async () => {
    hienThi()
    await dangNhapThanhCong()
    let hoanTat
    const xuLyGoc = xuLyYeuCau
    xuLyYeuCau = cauHinh => cauHinh.url === '/auth/logout' ? new Promise(resolve => { hoanTat = () => resolve(xuLyGoc(cauHinh)) }) : xuLyGoc(cauHinh)
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(xacThuc.tokenTruyCap).toBeNull()
    expect(hoanTat).toBeTypeOf('function')
    await act(async () => { hoanTat() })
  })

  it('expires automatically at the fixed deadline without a focus event or request', async () => {
    hienThi()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    await act(async () => { await xacThuc.dangNhap({ email: 'reader@example.test', password: 'thu timer' }) })
    expect(xacThuc.daDangNhap).toBe(true)
    await act(async () => { vi.advanceTimersByTime(900000) })
    expect(xacThuc.daDangNhap).toBe(false)
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(cacYeuCau).toHaveLength(2)
  })

  it('aborts an unfinished login and never restores a session after logout', async () => {
    hienThi()
    let hoanTat
    const xuLyGoc = xuLyYeuCau
    xuLyYeuCau = cauHinh => cauHinh.url === '/auth/me' ? new Promise(resolve => { hoanTat = () => resolve(xuLyGoc(cauHinh)) }) : xuLyGoc(cauHinh)
    let yeuCau
    await act(async () => { yeuCau = xacThuc.dangNhap({ email: 'reader@example.test', password: 'thu huy' }).catch(() => {}) })
    await waitFor(() => expect(hoanTat).toBeTypeOf('function'))
    await act(async () => { await xacThuc.dangXuat() })
    expect(cacYeuCau.at(-1).signal.aborted).toBe(true)
    await act(async () => { hoanTat(); await yeuCau })
    expect(xacThuc.daDangNhap).toBe(false)
    expect(xacThuc.nguoiDung).toBeNull()
  })

  it('cancels pending cached data and prevents a late result from restoring it after logout', async () => {
    hienThi()
    await dangNhapThanhCong()
    let hoanTat, tinHieu
    const yeuCau = trinhTruyVan.fetchQuery({ queryKey: ['du-lieu-rieng-dang-tai'], queryFn: ({ signal }) => {
      tinHieu = signal
      return new Promise(resolve => { hoanTat = () => resolve({ private: true }) })
    } }).catch(() => {})
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(tinHieu.aborted).toBe(true)
    await act(async () => { hoanTat(); await yeuCau })
    expect(trinhTruyVan.getQueryCache().getAll()).toHaveLength(0)
    expect(xacThuc.daDangNhap).toBe(false)
  })

  it('blocks login with missing API config without calling any transport', () => {
    moiTruong.error = 'Missing origin'
    hienThi()
    expect(screen.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(/chưa được cấu hình/)
    expect(cacYeuCau).toHaveLength(0)
  })
})
