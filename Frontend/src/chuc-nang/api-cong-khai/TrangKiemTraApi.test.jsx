import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onlineManager, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, CanceledError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TrangKiemTraApi from "./TrangKiemTraApi.jsx"
import App from "../../ung-dung/App.jsx"
import { ketNoiHttp } from "../../thu-vien/api/ket-noi-http.js"
import { taoTrinhTruyVan } from "../../thu-vien/trinh-truy-van.js"
import { moiTruong } from "../../cau-hinh/moi-truong.js"

vi.mock("../../cau-hinh/moi-truong.js", () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))
const boVanChuyenGoc = ketNoiHttp.defaults.adapter
const cacTrinhKetNoi = []
beforeEach(() => { moiTruong.error = null })
afterEach(() => { ketNoiHttp.defaults.adapter = boVanChuyenGoc; cacTrinhKetNoi.splice(0).forEach(trinhKetNoi => trinhKetNoi.clear()); onlineManager.setOnline(true) })
function hienThiTrang() {
  const trinhKetNoi = taoTrinhTruyVan()
  cacTrinhKetNoi.push(trinhKetNoi)
  return render(<QueryClientProvider client={trinhKetNoi}><TrangKiemTraApi title="Kiểm tra API công khai" /></QueryClientProvider>)
}
function traPhanHoi(data) {
  ketNoiHttp.defaults.adapter = vi.fn(async cauHinh => ({ config: cauHinh, status: 200, headers: {}, data }))
}

describe('Public API check page', () => {
  it('renders through the real /app/api-check shell with no automatic request', async () => {
    traPhanHoi({ success: true })
    window.history.replaceState({}, '', '/app/api-check')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Kiểm tra API công khai' })).toBeVisible()
    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Kiểm tra API công khai', exact: true })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('button', { name: /^Kiểm tra (Health|Books|Categories)$/ })).toHaveLength(3)
    expect(ketNoiHttp.defaults.adapter).not.toHaveBeenCalled()
  })
  it('keeps the page readable with missing configuration and blocks all requests', () => {
    moiTruong.error = 'Thiếu VITE_API_BASE_URL.'
    traPhanHoi({ success: true })
    hienThiTrang()
    expect(screen.getByText('Cần cấu hình API origin')).toBeVisible()
    for (const nut of screen.getAllByRole('button', { name: /^Kiểm tra / })) expect(nut).toBeDisabled()
    expect(ketNoiHttp.defaults.adapter).not.toHaveBeenCalled()
  })
  it('checks health only on click and displays no raw server message', async () => {
    traPhanHoi({ success: true, message: 'private backend detail' })
    hienThiTrang()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Health', exact: true }))
    expect(await screen.findByText(/Health envelope hợp lệ/)).toBeVisible()
    expect(screen.getByText('HTTP 200')).toBeVisible()
    expect(screen.queryByText('private backend detail')).not.toBeInTheDocument()
    expect(ketNoiHttp.defaults.adapter).toHaveBeenCalledTimes(1)
  })
  it('renders a genuine empty list without fabricated rows', async () => {
    traPhanHoi({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })
    hienThiTrang()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Books', exact: true }))
    expect(await screen.findByText('Danh sách đang trống')).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
  it('shows only list counts and preserves string IDs in the transport', async () => {
    traPhanHoi({ success: true, data: [{ id: '9007199254740993', title: 'private title' }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } })
    hienThiTrang()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Categories', exact: true }))
    expect(await screen.findByText(/Nhận 1 mục/)).toBeVisible()
    expect(screen.queryByText('private title')).not.toBeInTheDocument()
  })
  it('does not mistake HTTP 200 HTML or an invalid envelope for API success', async () => {
    traPhanHoi('<!DOCTYPE html><html>Vite fallback</html>')
    hienThiTrang()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Health', exact: true }))
    expect(await screen.findByText('Phản hồi không đúng contract')).toBeVisible()
    expect(screen.queryByText('HTTP 200')).not.toBeInTheDocument()
  })
  it.each([['ERR_NETWORK', null, /Không kết nối được dịch vụ/], ['ECONNABORTED', null, /quá thời gian chờ/], ['ERR_BAD_REQUEST', 401, /Yêu cầu cần xác thực/], ['ERR_BAD_REQUEST', 403, /Không có quyền/]])('renders %s / %s safely, without retry or redirect', async (ma, trangThaiHttp, thongBao) => {
    const boVanChuyen = vi.fn(async cauHinh => { throw new AxiosError('private stack', ma, cauHinh, null, trangThaiHttp ? { status: trangThaiHttp, data: { error: { code: 'TEST_ERROR', message: 'private stack' } } } : undefined) })
    ketNoiHttp.defaults.adapter = boVanChuyen
    window.history.replaceState({}, '', '/app/api-check')
    hienThiTrang()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Books', exact: true }))
    expect(await screen.findByText(thongBao)).toBeVisible()
    expect(screen.queryByText('private stack')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/api-check')
    expect(boVanChuyen).toHaveBeenCalledTimes(1)
  })
  it('shows loading, cancels in flight, then supports another explicit attempt', async () => {
    let tinHieu
    ketNoiHttp.defaults.adapter = cauHinh => new Promise((resolve, reject) => {
      tinHieu = cauHinh.signal
      tinHieu.addEventListener('abort', () => reject(new CanceledError('cancelled', cauHinh)), { once: true })
    })
    hienThiTrang()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Health', exact: true }))
    await waitFor(() => expect(tinHieu).toBeDefined())
    expect(await screen.findByRole('status')).toHaveTextContent('Đang kiểm tra Health')
    expect(screen.getByRole('button', { name: 'Kiểm tra Health', exact: true })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy Health', exact: true }))
    expect(tinHieu.aborted).toBe(true)
    expect(await screen.findByText('Đã hủy yêu cầu')).toBeVisible()
    traPhanHoi({ success: true, message: 'OK' })
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Health', exact: true }))
    expect(await screen.findByText(/Health envelope hợp lệ/)).toBeVisible()
    expect(screen.queryByText('Đã hủy yêu cầu')).not.toBeInTheDocument()
  })
  it('explains an offline-paused query and lets the user cancel before any transport', async () => {
    onlineManager.setOnline(false)
    traPhanHoi({ success: true, message: 'OK' })
    hienThiTrang()
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra Health', exact: true }))
    expect(await screen.findByText('Đang chờ kết nối mạng')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Kiểm tra Health', exact: true })).toBeDisabled()
    expect(ketNoiHttp.defaults.adapter).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy Health', exact: true }))
    expect(await screen.findByText('Đã hủy yêu cầu')).toBeVisible()
    expect(ketNoiHttp.defaults.adapter).not.toHaveBeenCalled()
  })
})
