import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from "../../ung-dung/App.jsx"
import { kiemTraSucKhoe } from "../nen-tang/api-suc-khoe.js"

vi.mock("../nen-tang/api-suc-khoe.js", () => ({ kiemTraSucKhoe: vi.fn() }))

let chieuRongKhung
let cacHamTheoDoiManHinh

beforeEach(() => {
  chieuRongKhung = 1280
  cacHamTheoDoiManHinh = new Set()
  vi.stubGlobal('matchMedia', vi.fn(truyVan => ({
    media: truyVan,
    get matches() { return truyVan === '(min-width: 1024px)' && chieuRongKhung >= 1024 },
    addEventListener(type, hamGoiLai) { if (type === 'change' && truyVan === '(min-width: 1024px)') cacHamTheoDoiManHinh.add(hamGoiLai) },
    removeEventListener(type, hamGoiLai) { if (type === 'change') cacHamTheoDoiManHinh.delete(hamGoiLai) },
  })))
  window.history.replaceState({}, '', '/app')
})

afterEach(() => { vi.unstubAllGlobals() })

function doiKichThuoc(chieuRong) {
  act(() => {
    chieuRongKhung = chieuRong
    for (const hamGoiLai of cacHamTheoDoiManHinh) hamGoiLai({ matches: chieuRong >= 1024, media: '(min-width: 1024px)' })
  })
}

async function hienThiKhung(duongDanTep = '/app', chieuRong = 1280) {
  chieuRongKhung = chieuRong
  window.history.replaceState({}, '', duongDanTep)
  const ketQua = render(<App />)
  await screen.findByRole('banner')
  return ketQua
}

describe('Application Shell and routing', () => {
  it('renders sidebar, header, a single main Outlet and a neutral future account slot without APIs', async () => {
    await hienThiKhung()
    expect(screen.getByRole('complementary', { name: 'Điều hướng ứng dụng' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Đường dẫn trang' })).toBeVisible()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Khung ứng dụng' }))
    expect(screen.getByText('Tài khoản chưa tích hợp')).toBeVisible()
    expect(screen.queryByRole('button', { name: /đăng xuất/i })).not.toBeInTheDocument()
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
  })

  it('marks exactly the matching navigation link active and changes the Outlet without losing layout', async () => {
    const nguoiThaoTac = userEvent.setup()
    await hienThiKhung()
    const vungDieuHuong = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    expect(within(vungDieuHuong).getByRole('link', { name: 'Khung ứng dụng', exact: true })).toHaveAttribute('aria-current', 'page')
    await nguoiThaoTac.click(within(vungDieuHuong).getByRole('link', { name: 'Khu vực nội dung' }))
    expect(await screen.findByRole('heading', { name: 'Khu vực nội dung', level: 1 })).toBeVisible()
    expect(window.location.pathname).toBe('/app/workspace')
    expect(within(vungDieuHuong).getByRole('link', { name: 'Khung ứng dụng', exact: true })).not.toHaveAttribute('aria-current')
    expect(within(vungDieuHuong).getByRole('link', { name: 'Khu vực nội dung' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it.each(['/app', '/app/'])('renders the index route directly at %s without redirects', async duongDanTep => {
    await hienThiKhung(duongDanTep)
    expect(screen.getByRole('heading', { name: 'Khung ứng dụng', level: 1 })).toBeVisible()
    expect(window.location.pathname).toBe(duongDanTep)
    expect(screen.getByRole('link', { name: 'Khung ứng dụng', exact: true })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps a shell-scoped Not Found page and returns safely to the index', async () => {
    await hienThiKhung('/app/unknown/deep-route')
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang', level: 1 })).toBeVisible()
    expect(screen.getByRole('complementary')).toBeVisible()
    const dieuHuong = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    expect(within(dieuHuong).getAllByRole('link').every(lienKet => !lienKet.hasAttribute('aria-current'))).toBe(true)
    expect(screen.getByRole('main')).not.toContainElement(screen.getByRole('complementary'))
    await userEvent.click(screen.getByRole('link', { name: 'Về khung ứng dụng' }))
    expect(await screen.findByRole('heading', { name: 'Khung ứng dụng', level: 1 })).toBeVisible()
  })

  it('preserves the global Not Found route outside the shell', async () => {
    window.history.replaceState({}, '', '/missing-outside-app')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang kiểm tra kỹ thuật' })).toHaveAttribute('href', '/')
  })

  it('keeps the existing health page reachable from navigation, with no automatic health request', async () => {
    await hienThiKhung()
    await userEvent.click(screen.getByRole('link', { name: 'Kiểm tra nền tảng', exact: true }))
    expect(await screen.findByRole('heading', { name: 'Nền tảng LibriFlow' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Mở khung ứng dụng FE-04 →' })).toHaveAttribute('href', '/app')
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
  })

  it('keeps Design System reachable as its existing independent route', async () => {
    await hienThiKhung()
    await userEvent.click(screen.getByRole('link', { name: 'Design System', exact: true }))
    expect(await screen.findByRole('heading', { level: 1, name: /Ấm áp/ })).toHaveTextContent('Ấm áp trongtừng chi tiết.')
    expect(window.location.pathname).toBe('/design-system')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
  })

  it('supports keyboard navigation and skip-to-content without an extra main landmark', async () => {
    const nguoiThaoTac = userEvent.setup()
    await hienThiKhung()
    await nguoiThaoTac.tab()
    const lienKetBoQua = screen.getByRole('link', { name: 'Đến nội dung chính' })
    expect(lienKetBoQua).toHaveFocus()
    expect(lienKetBoQua).toHaveAttribute('href', '#app-main-content')
    await nguoiThaoTac.keyboard('{Enter}')
    expect(screen.getByRole('main')).toHaveFocus()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'app-main-content')
  })

  it('updates the page title and restores the earlier title when leaving the shell', async () => {
    document.title = 'Trang kỹ thuật ban đầu'
    await hienThiKhung('/app/layouts')
    expect(document.title).toBe('Bố cục theo vai trò · LibriFlow')
    await userEvent.click(screen.getByRole('link', { name: 'Kiểm tra nền tảng', exact: true }))
    await screen.findByRole('heading', { name: 'Nền tảng LibriFlow' })
    expect(document.title).toBe('Trang kỹ thuật ban đầu')
  })
})

describe('Mobile/tablet navigation', () => {
  it.each([375, 768])('uses a closed drawer trigger at %spx instead of a duplicate sidebar', async chieuRong => {
    await hienThiKhung('/app', chieuRong)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mở điều hướng' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens and closes with accessible controls and restores focus on dismissal', async () => {
    const nguoiThaoTac = userEvent.setup()
    await hienThiKhung('/app', 375)
    const trigger = screen.getByRole('button', { name: 'Mở điều hướng' })
    await nguoiThaoTac.click(trigger)
    const hopThoai = await screen.findByRole('dialog', { name: 'Điều hướng LibriFlow' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(hopThoai).toHaveAccessibleDescription('Chọn một trang kỹ thuật. Các chức năng nghiệp vụ chưa được tích hợp.')
    expect(within(hopThoai).getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible()
    await nguoiThaoTac.click(within(hopThoai).getByRole('button', { name: 'Đóng hộp thoại' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('traps keyboard focus, closes on Escape and returns focus to the menu trigger', async () => {
    const nguoiThaoTac = userEvent.setup()
    await hienThiKhung('/app', 768)
    await nguoiThaoTac.tab()
    await nguoiThaoTac.tab()
    const trigger = screen.getByRole('button', { name: 'Mở điều hướng' })
    expect(trigger).toHaveFocus()
    await nguoiThaoTac.keyboard('{Enter}')
    const hopThoai = await screen.findByRole('dialog')
    for (let i = 0; i < 8; i++) { await nguoiThaoTac.tab(); expect(hopThoai).toContainElement(document.activeElement) }
    await nguoiThaoTac.tab({ shift: true })
    expect(hopThoai).toContainElement(document.activeElement)
    await nguoiThaoTac.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('closes after choosing a route, focuses new content and does not reopen on the new route', async () => {
    const nguoiThaoTac = userEvent.setup()
    await hienThiKhung('/app', 375)
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    await nguoiThaoTac.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Khu vực nội dung' }))
    expect(await screen.findByRole('heading', { name: 'Khu vực nội dung', level: 1 })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Mở điều hướng' })).toHaveAttribute('aria-expanded', 'false')
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Khu vực nội dung' })).toHaveAttribute('aria-current', 'page')
    await nguoiThaoTac.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Kiểm tra nền tảng', exact: true }))
    await screen.findByRole('heading', { name: 'Nền tảng LibriFlow' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
  })

  it('removes an open drawer on desktop resize and returns to compact mode without a stale modal', async () => {
    const nguoiThaoTac = userEvent.setup()
    await hienThiKhung('/app', 375)
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    doiKichThuoc(1280)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Điều hướng ứng dụng' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Mở điều hướng' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
    doiKichThuoc(768)
    expect(screen.getByRole('button', { name: 'Mở điều hướng' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.pointerEvents).toBe('')
  })

  it('closes an open drawer when browser history changes the route', async () => {
    const nguoiThaoTac = userEvent.setup()
    await hienThiKhung('/app', 375)
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    await nguoiThaoTac.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Khu vực nội dung' }))
    await screen.findByRole('heading', { name: 'Khu vực nội dung', level: 1 })
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    act(() => { window.history.back() })
    await screen.findByRole('heading', { name: 'Khung ứng dụng', level: 1 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mở điều hướng' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Role layout preview is presentation only', () => {
  it('ignores a role query parameter, starts without a selected role and never grants access', async () => {
    await hienThiKhung('/app/layouts?role=admin')
    expect(screen.getByRole('combobox', { name: 'Bố cục dự kiến' })).toHaveValue('')
    expect(screen.getByText('Chỉ là bản xem trước, không phải phân quyền')).toBeVisible()
    expect(screen.getByText('Chọn một bố cục')).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Bản xem trước điều hướng' })).not.toBeInTheDocument()
    expect(screen.getByText('Tài khoản chưa tích hợp')).toBeVisible()
  })

  it.each(['admin', 'librarian', 'reader'])('shows only planned, non-clickable items for %s without creating a session', async name => {
    const nguoiThaoTac = userEvent.setup()
    const boLuuTru = vi.spyOn(Storage.prototype, 'setItem')
    await hienThiKhung('/app/layouts')
    await nguoiThaoTac.selectOptions(screen.getByRole('combobox', { name: 'Bố cục dự kiến' }), name)
    const banXemThu = screen.getByRole('navigation', { name: 'Bản xem trước điều hướng' })
    expect(within(banXemThu).queryAllByRole('link')).toHaveLength(0)
    expect(within(banXemThu).getAllByText('Chưa triển khai').length).toBeGreaterThan(0)
    expect(window.location.pathname).toBe('/app/layouts')
    expect(window.location.search).toBe('')
    expect(boLuuTru).not.toHaveBeenCalled()
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
    expect(screen.getByText('Tài khoản chưa tích hợp')).toBeVisible()
  })

  it('does not persist the preview selection across route changes', async () => {
    const nguoiThaoTac = userEvent.setup()
    await hienThiKhung('/app/layouts')
    await nguoiThaoTac.selectOptions(screen.getByRole('combobox', { name: 'Bố cục dự kiến' }), 'admin')
    const vungDieuHuong = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    await nguoiThaoTac.click(within(vungDieuHuong).getByRole('link', { name: 'Khung ứng dụng', exact: true }))
    await nguoiThaoTac.click(within(vungDieuHuong).getByRole('link', { name: 'Bố cục theo vai trò' }))
    expect(screen.getByRole('combobox', { name: 'Bố cục dự kiến' })).toHaveValue('')
  })
})
