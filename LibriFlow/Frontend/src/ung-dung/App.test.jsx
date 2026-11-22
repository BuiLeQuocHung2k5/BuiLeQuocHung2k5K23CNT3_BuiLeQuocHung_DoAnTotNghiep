import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { kiemTraSucKhoe } from "../chuc-nang/nen-tang/api-suc-khoe.js"
import { moiTruong } from "../cau-hinh/moi-truong.js"

vi.mock("../chuc-nang/nen-tang/api-suc-khoe.js", () => ({ kiemTraSucKhoe: vi.fn() }))
vi.mock("../cau-hinh/moi-truong.js", () => ({
  moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null },
}))

beforeEach(() => {
  window.history.replaceState({}, '', '/kiem-tra-nen-tang')
  moiTruong.error = null
})

describe('FE-02 foundation', () => {
  it('renders without calling the backend on startup', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Nền tảng LibriFlow' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Kiểm tra health' })).toBeEnabled()
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
  })

  it('handles an unknown route and navigates back through React Router', async () => {
    window.history.replaceState({}, '', '/unknown-foundation-route')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
    await userEvent.click(screen.getByRole('link', { name: 'Về trang chủ' }))
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    expect(window.location.pathname).toBe('/dang-nhap')
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
  })

  it('checks public health only after a click, then displays the verified envelope', async () => {
    kiemTraSucKhoe.mockResolvedValueOnce({ status: 200, data: { success: true, message: 'LibriFlow Backend is running' } })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra health' }))
    expect(await screen.findByText('LibriFlow Backend is running')).toBeVisible()
    expect(kiemTraSucKhoe).toHaveBeenCalledTimes(1)
  })

  it('keeps the page usable when the backend is offline, without automatic retries', async () => {
    kiemTraSucKhoe.mockRejectedValueOnce(new Error('Network Error'))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra health' }))
    expect(await screen.findByText(/Chưa kết nối được Backend/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Kiểm tra health' })).toBeEnabled()
    expect(kiemTraSucKhoe).toHaveBeenCalledTimes(1)
  })

  it('reports an invalid health envelope instead of declaring a successful connection', async () => {
    kiemTraSucKhoe.mockResolvedValueOnce({ status: 200, data: '<html>wrong origin</html>' })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra health' }))
    expect(await screen.findByText(/Phản hồi health không đúng định dạng/)).toBeVisible()
  })

  it('renders setup instructions when no API origin is configured', () => {
    moiTruong.error = 'Chưa cấu hình VITE_API_BASE_URL.'
    render(<App />)
    expect(screen.getByText('Chưa cấu hình VITE_API_BASE_URL.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Kiểm tra health' })).not.toBeInTheDocument()
    expect(kiemTraSucKhoe).not.toHaveBeenCalled()
  })
})
