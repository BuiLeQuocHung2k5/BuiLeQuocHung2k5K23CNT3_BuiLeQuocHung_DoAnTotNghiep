import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import App from "../../ung-dung/App.jsx"

vi.mock("../nen-tang/api-suc-khoe.js", () => ({ kiemTraSucKhoe: vi.fn() }))
import { kiemTraSucKhoe } from "../nen-tang/api-suc-khoe.js"

// jsdom has no pointer-capture implementation; Sonner uses it on pointer down.
// Only emulate the missing browser API here; real swipe behavior remains a browser check.
const cacHamConTro = ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture']
const moTaThuocTinhGoc = new Map()
beforeAll(() => {
  const daGhiNhan = new WeakMap()
  const cacPhuongThuc = {
    setPointerCapture(id) { daGhiNhan.set(this, id) },
    releasePointerCapture() { daGhiNhan.delete(this) },
    hasPointerCapture(id) { return daGhiNhan.get(this) === id },
  }
  for (const phuongThuc of cacHamConTro) {
    moTaThuocTinhGoc.set(phuongThuc, Object.getOwnPropertyDescriptor(HTMLElement.prototype, phuongThuc))
    if (!HTMLElement.prototype[phuongThuc]) Object.defineProperty(HTMLElement.prototype, phuongThuc, { configurable: true, value: cacPhuongThuc[phuongThuc] })
  }
})
afterAll(() => {
  for (const phuongThuc of cacHamConTro) {
    const banGoc = moTaThuocTinhGoc.get(phuongThuc)
    if (banGoc) Object.defineProperty(HTMLElement.prototype, phuongThuc, banGoc)
    else delete HTMLElement.prototype[phuongThuc]
  }
  toast.dismiss()
})

beforeEach(() => { window.history.replaceState({}, '', '/design-system') })

describe('Design System Preview route', () => {
  it('renders the real route and all preview sections without calling health or any backend service', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ấm áp trongtừng chi tiết.')
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6)
    expect(screen.getByRole('navigation', { name: 'Các phần Design System' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Trang kỹ thuật FE-02' })).toHaveAttribute('href', '/')
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
  })

  it('changes table states and local checkbox state without business data', async () => {
    const nguoiThaoTac = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1 })
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Trống' }))
    expect(screen.getByText('Chưa có dữ liệu')).toBeVisible()
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Đang tải', exact: true }))
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Mẫu thành phần A')).not.toBeInTheDocument()
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Có dữ liệu' }))
    expect(screen.getByRole('cell', { name: 'Mẫu thành phần A' })).toBeVisible()
    await nguoiThaoTac.click(screen.getByRole('checkbox', { name: 'Bật gợi ý trong bản xem thử' }))
    expect(screen.getByText('Gợi ý: đã tắt')).toBeVisible()
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
  })

  it('shows and dismisses a themed, accessible toast from a deliberate click', async () => {
    const nguoiThaoTac = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1 })
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Thử Toast' }))
    const thongBao = await screen.findByText('Một phản hồi vừa đủ.')
    expect(thongBao.closest('[data-sonner-toast]')).toHaveClass('ui-tone--success')
    await nguoiThaoTac.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    await waitFor(() => expect(screen.queryByText('Một phản hồi vừa đủ.')).not.toBeInTheDocument())
  })
})
