import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, CanceledError } from 'axios'
import { taoTrinhTruyVan } from "../../thu-vien/trinh-truy-van.js"
import { ketNoiHttp } from "../../thu-vien/api/ket-noi-http.js"
import { khoaTruyVanCongKhai, useSucKhoe, useSachCongKhai, useDanhMucCongKhai } from "./truy-van-cong-khai.js"

vi.mock("../../cau-hinh/moi-truong.js", () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))
const boVanChuyenGoc = ketNoiHttp.defaults.adapter
const cacTrinhKetNoi = []
afterEach(() => { ketNoiHttp.defaults.adapter = boVanChuyenGoc; cacTrinhKetNoi.splice(0).forEach(trinhKetNoi => trinhKetNoi.clear()) })
function thietLapTruyVan() {
  const trinhKetNoi = taoTrinhTruyVan()
  cacTrinhKetNoi.push(trinhKetNoi)
  return { client: trinhKetNoi, wrapper: ({ children }) => <QueryClientProvider client={trinhKetNoi}>{children}</QueryClientProvider> }
}

describe('Public query lifecycle', () => {
  it('uses stable canonical keys and isolates resources/pages', () => {
    expect(khoaTruyVanCongKhai.books()).toEqual(khoaTruyVanCongKhai.books({ search: ' ', page: 1, limit: 10 }))
    expect(khoaTruyVanCongKhai.books({ search: ' sách ' })).toEqual(khoaTruyVanCongKhai.books({ search: 'sách' }))
    expect(khoaTruyVanCongKhai.books()).not.toEqual(khoaTruyVanCongKhai.categories())
    expect(khoaTruyVanCongKhai.books()).not.toEqual(khoaTruyVanCongKhai.books({ page: 2 }))
    expect(khoaTruyVanCongKhai.health()).toEqual(['public', 'health'])
    expect(() => khoaTruyVanCongKhai.books({ jwt: 'no' })).toThrow()
  })
  it.each([[useSucKhoe, '/health'], [useSachCongKhai, '/books'], [useDanhMucCongKhai, '/categories']])('keeps %s disabled until explicitly enabled, preserving response', async (hamHook, url) => {
    const boVanChuyen = vi.fn(async cauHinh => ({ config: cauHinh, status: 200, headers: {}, data: { success: true, data: [] } }))
    ketNoiHttp.defaults.adapter = boVanChuyen
    const { wrapper, client: trinhKetNoi } = thietLapTruyVan()
    const { result: ketQua, rerender } = renderHook(({ enabled }) => hamHook === useSucKhoe ? hamHook({ enabled }) : hamHook({}, { enabled }), { wrapper, initialProps: { enabled: false } })
    expect(ketQua.current.fetchStatus).toBe('idle')
    expect(boVanChuyen).not.toHaveBeenCalled()
    rerender({ enabled: true })
    await waitFor(() => expect(ketQua.current.isSuccess).toBe(true))
    expect(boVanChuyen).toHaveBeenCalledTimes(1)
    expect(boVanChuyen.mock.calls[0][0].url).toBe(url)
    expect(ketQua.current.data.status).toBe(200)
    expect(ketQua.current.data.data).toEqual({ success: true, data: [] })
    const truyVan = trinhKetNoi.getQueryCache().getAll()[0]
    expect(truyVan.options.staleTime).toBe(30000)
    expect(truyVan.gcTime).toBe(300000)
    expect(truyVan.options.refetchOnWindowFocus).toBe(false)
    rerender({ enabled: true })
    expect(boVanChuyen).toHaveBeenCalledTimes(1)
  })
  it.each([401, 403, 503])('propagates HTTP %s as an error with retry disabled', async trangThaiHttp => {
    const banGoc = new AxiosError('failure', 'ERR_BAD_RESPONSE', {}, null, { status: trangThaiHttp, data: { error: { code: 'TEST_ERROR' } } })
    const boVanChuyen = vi.fn(async () => { throw banGoc })
    ketNoiHttp.defaults.adapter = boVanChuyen
    const { wrapper, client: trinhKetNoi } = thietLapTruyVan()
    const { result: ketQua } = renderHook(() => useSachCongKhai({}, { enabled: true }), { wrapper })
    await waitFor(() => expect(ketQua.current.isError).toBe(true))
    expect(ketQua.current.error).toBe(banGoc)
    expect(boVanChuyen).toHaveBeenCalledTimes(1)
    expect(trinhKetNoi.getQueryCache().getAll()[0].options.retry).toBe(false)
    expect(trinhKetNoi.getDefaultOptions().mutations.retry).toBe(false)
  })
  it.each(['explicit', 'unmount'])('aborts the actual signal on %s cancellation, without a query error', async cheDo => {
    let tinHieu
    ketNoiHttp.defaults.adapter = cauHinh => new Promise((resolve, reject) => {
      tinHieu = cauHinh.signal
      tinHieu.addEventListener('abort', () => reject(new CanceledError('cancelled', cauHinh)), { once: true })
    })
    const { wrapper, client: trinhKetNoi } = thietLapTruyVan()
    const { result: ketQua, unmount } = renderHook(() => useDanhMucCongKhai({}, { enabled: true }), { wrapper })
    await waitFor(() => expect(tinHieu).toBeDefined())
    expect(ketQua.current.isFetching).toBe(true)
    if (cheDo === 'unmount') unmount()
    else await act(() => trinhKetNoi.cancelQueries({ queryKey: khoaTruyVanCongKhai.categories(), exact: true }))
    expect(tinHieu.aborted).toBe(true)
    expect(trinhKetNoi.getQueryState(khoaTruyVanCongKhai.categories()).error).toBeNull()
    expect(trinhKetNoi.getQueryState(khoaTruyVanCongKhai.categories()).fetchStatus).toBe('idle')
  })
})
