import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { checkHealth } from '../features/foundation/health-api.js'
import { environment } from '../config/environment.js'

vi.mock('../features/foundation/health-api.js', () => ({ checkHealth: vi.fn() }))
vi.mock('../config/environment.js', () => ({
  environment: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null },
}))

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  environment.error = null
})

describe('FE-02 foundation', () => {
  it('renders without calling the backend on startup', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Nền tảng LibriFlow' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Kiểm tra health' })).toBeEnabled()
    expect(checkHealth).not.toHaveBeenCalled()
  })

  it('handles an unknown route and navigates back through React Router', async () => {
    window.history.replaceState({}, '', '/unknown-foundation-route')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
    await userEvent.click(screen.getByRole('link', { name: 'Về trang kiểm tra kỹ thuật' }))
    expect(screen.getByRole('heading', { name: 'Nền tảng LibriFlow' })).toBeVisible()
    expect(window.location.pathname).toBe('/')
    expect(checkHealth).not.toHaveBeenCalled()
  })

  it('checks public health only after a click, then displays the verified envelope', async () => {
    checkHealth.mockResolvedValueOnce({ status: 200, data: { success: true, message: 'LibriFlow Backend is running' } })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra health' }))
    expect(await screen.findByText('LibriFlow Backend is running')).toBeVisible()
    expect(checkHealth).toHaveBeenCalledTimes(1)
  })

  it('keeps the page usable when the backend is offline, without automatic retries', async () => {
    checkHealth.mockRejectedValueOnce(new Error('Network Error'))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra health' }))
    expect(await screen.findByText(/Chưa kết nối được Backend/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Kiểm tra health' })).toBeEnabled()
    expect(checkHealth).toHaveBeenCalledTimes(1)
  })

  it('reports an invalid health envelope instead of declaring a successful connection', async () => {
    checkHealth.mockResolvedValueOnce({ status: 200, data: '<html>wrong origin</html>' })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra health' }))
    expect(await screen.findByText(/Phản hồi health không đúng định dạng/)).toBeVisible()
  })

  it('renders setup instructions when no API origin is configured', () => {
    environment.error = 'Chưa cấu hình VITE_API_BASE_URL.'
    render(<App />)
    expect(screen.getByText('Chưa cấu hình VITE_API_BASE_URL.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Kiểm tra health' })).not.toBeInTheDocument()
    expect(checkHealth).not.toHaveBeenCalled()
  })
})
