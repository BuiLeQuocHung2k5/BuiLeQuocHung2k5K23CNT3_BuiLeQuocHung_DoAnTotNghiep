import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import App from '../../app/App.jsx'

vi.mock('../foundation/health-api.js', () => ({ checkHealth: vi.fn() }))
import { checkHealth } from '../foundation/health-api.js'

// jsdom has no pointer-capture implementation; Sonner uses it on pointer down.
// Only emulate the missing browser API here; real swipe behavior remains a browser check.
const pointerMethods = ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture']
const originalDescriptors = new Map()
beforeAll(() => {
  const captured = new WeakMap()
  const methods = {
    setPointerCapture(id) { captured.set(this, id) },
    releasePointerCapture() { captured.delete(this) },
    hasPointerCapture(id) { return captured.get(this) === id },
  }
  for (const method of pointerMethods) {
    originalDescriptors.set(method, Object.getOwnPropertyDescriptor(HTMLElement.prototype, method))
    if (!HTMLElement.prototype[method]) Object.defineProperty(HTMLElement.prototype, method, { configurable: true, value: methods[method] })
  }
})
afterAll(() => {
  for (const method of pointerMethods) {
    const original = originalDescriptors.get(method)
    if (original) Object.defineProperty(HTMLElement.prototype, method, original)
    else delete HTMLElement.prototype[method]
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
    expect(checkHealth).not.toHaveBeenCalled()
  })

  it('changes table states and local checkbox state without business data', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getByRole('button', { name: 'Trống' }))
    expect(screen.getByText('Chưa có dữ liệu')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Đang tải', exact: true }))
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Mẫu thành phần A')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Có dữ liệu' }))
    expect(screen.getByRole('cell', { name: 'Mẫu thành phần A' })).toBeVisible()
    await user.click(screen.getByRole('checkbox', { name: 'Bật gợi ý trong bản xem thử' }))
    expect(screen.getByText('Gợi ý: đã tắt')).toBeVisible()
    expect(checkHealth).not.toHaveBeenCalled()
  })

  it('shows and dismisses a themed, accessible toast from a deliberate click', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getByRole('button', { name: 'Thử Toast' }))
    const message = await screen.findByText('Một phản hồi vừa đủ.')
    expect(message.closest('[data-sonner-toast]')).toHaveClass('ui-tone--success')
    await user.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    await waitFor(() => expect(screen.queryByText('Một phản hồi vừa đủ.')).not.toBeInTheDocument())
  })
})
