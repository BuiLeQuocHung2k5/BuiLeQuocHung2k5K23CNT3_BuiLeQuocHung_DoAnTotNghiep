import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ketNoiHttp } from "./ket-noi-http.js"
import { moiTruong } from "../../cau-hinh/moi-truong.js"
import { kiemTraSucKhoe } from "../../chuc-nang/nen-tang/api-suc-khoe.js"

vi.mock("../../cau-hinh/moi-truong.js", () => ({
  moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null },
}))

beforeEach(() => { moiTruong.error = null })

describe('HTTP client contract', () => {
  it('preserves response status, headers and envelope without adding authentication', async () => {
    const noiDungPhanHoi = { success: true, data: [], pagination: { page: 1, total: 0 } }
    let yeuCau
    const phanHoi = await ketNoiHttp.get('/books', { adapter: async (cauHinh) => {
      yeuCau = cauHinh
      return { status: 200, statusText: 'OK', headers: { 'x-check': 'preserved' }, data: noiDungPhanHoi, config: cauHinh }
    } })
    expect(ketNoiHttp.getUri(yeuCau)).toBe('http://127.0.0.1:3000/api/books')
    expect(yeuCau.headers.has('Authorization')).toBe(false)
    expect(yeuCau.withCredentials).toBe(false)
    expect(phanHoi.status).toBe(200)
    expect(phanHoi.headers.get('x-check')).toBe('preserved')
    expect(phanHoi.data).toEqual(noiDungPhanHoi)
  })

  it('preserves AxiosError status, backend code and validation details without retrying a write', async () => {
    const noiDungPhanHoi = { success: false, error: { code: 'VALIDATION_ERROR', details: [{ field: 'body', message: 'Invalid' }] } }
    let banGoc
    const boVanChuyen = vi.fn(async (cauHinh) => {
      banGoc = new AxiosError('Request failed', 'ERR_BAD_REQUEST', cauHinh, null,
        { status: 400, data: noiDungPhanHoi, headers: {}, config: cauHinh })
      throw banGoc
    })
    const loiNhanDuoc = await ketNoiHttp.post('/foundation-test', {}, { adapter: boVanChuyen }).catch((loi) => loi)
    expect(loiNhanDuoc).toBe(banGoc)
    expect(loiNhanDuoc.response.status).toBe(400)
    expect(loiNhanDuoc.response.data).toEqual(noiDungPhanHoi)
    expect(boVanChuyen).toHaveBeenCalledTimes(1)
  })

  it('does not invent an HTTP status for network failures', async () => {
    const boVanChuyen = vi.fn(async (cauHinh) => { throw new AxiosError('Network Error', 'ERR_NETWORK', cauHinh) })
    const loiNhanDuoc = await ketNoiHttp.get('/health', { adapter: boVanChuyen }).catch((loi) => loi)
    expect(loiNhanDuoc.code).toBe('ERR_NETWORK')
    expect(loiNhanDuoc.response).toBeUndefined()
    expect(boVanChuyen).toHaveBeenCalledTimes(1)
  })

  it('blocks requests with missing configuration before any network adapter runs', async () => {
    moiTruong.error = 'Missing API origin'
    const boVanChuyen = vi.fn()
    await expect(ketNoiHttp.get('/health', { adapter: boVanChuyen })).rejects.toThrow('Missing API origin')
    expect(boVanChuyen).not.toHaveBeenCalled()
  })

  it('uses only GET /health and forwards cancellation for the technical smoke check', async () => {
    const boDieuKhien = new AbortController()
    const hamTheoDoi = vi.spyOn(ketNoiHttp, 'get').mockResolvedValueOnce({ status: 200, data: { success: true } })
    await kiemTraSucKhoe({ signal: boDieuKhien.signal })
    expect(hamTheoDoi).toHaveBeenCalledWith('/health', { signal: boDieuKhien.signal })
  })
})
