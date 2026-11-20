import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, CanceledError } from 'axios'
import { ketNoiHttp } from "../../thu-vien/api/ket-noi-http.js"
import { laySachCongKhai, layDanhMucCongKhai, chuanHoaThamSoDanhSach } from "./dich-vu-cong-khai.js"
import { chuanHoaLoiApi } from "../../thu-vien/api/chuan-hoa-loi.js"

vi.mock("../../cau-hinh/moi-truong.js", () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))
const boVanChuyenGoc = ketNoiHttp.defaults.adapter
afterEach(() => { ketNoiHttp.defaults.adapter = boVanChuyenGoc })

describe('Public services and transport', () => {
  it.each([[laySachCongKhai, '/books'], [layDanhMucCongKhai, '/categories']])('preserves list contract through %s', async (dichVu, diemCuoi) => {
    const goiPhanHoi = { success: true, data: [{ id: '9007199254740993' }], pagination: { page: 2, limit: 3, total: 7, totalPages: 3 } }
    let yeuCau
    ketNoiHttp.defaults.adapter = async cauHinh => {
      yeuCau = cauHinh
      return { config: cauHinh, status: 200, statusText: 'OK', headers: { 'x-test': 'kept' }, data: goiPhanHoi }
    }
    const boDieuKhien = new AbortController()
    const phanHoi = await dichVu({ page: 2, limit: 3, search: '  thư viện  ' }, { signal: boDieuKhien.signal })
    expect(yeuCau.url).toBe(diemCuoi)
    expect(yeuCau.method).toBe('get')
    expect(yeuCau.params).toEqual({ page: 2, limit: 3, search: 'thư viện' })
    expect(decodeURI(ketNoiHttp.getUri(yeuCau))).toContain('page=2&limit=3&search=thư+viện')
    expect(yeuCau.signal).toBe(boDieuKhien.signal)
    expect(yeuCau.timeout).toBe(10000)
    expect(yeuCau.withCredentials).toBe(false)
    expect(yeuCau.headers.get('Accept')).toBe('application/json')
    expect(yeuCau.headers.has('Authorization')).toBe(false)
    expect(phanHoi.data).toEqual(goiPhanHoi)
    expect(phanHoi.status).toBe(200)
    expect(phanHoi.headers.get('x-test')).toBe('kept')
  })

  it.each([401, 403, 429, 503])('preserves HTTP %s and original error without retry', async trangThaiHttp => {
    let banGoc
    const boVanChuyen = vi.fn(async cauHinh => {
      banGoc = new AxiosError('private internal message', 'ERR_BAD_RESPONSE', cauHinh, null,
        { config: cauHinh, status: trangThaiHttp, headers: {}, data: { success: false, error: { code: 'BACKEND_CODE', details: [{ field: 'page', message: 'private' }] } } })
      throw banGoc
    })
    ketNoiHttp.defaults.adapter = boVanChuyen
    const loiNhanDuoc = await laySachCongKhai().catch(loi => loi)
    expect(loiNhanDuoc).toBe(banGoc)
    expect(loiNhanDuoc.response.status).toBe(trangThaiHttp)
    expect(loiNhanDuoc.response.data.error.code).toBe('BACKEND_CODE')
    expect(loiNhanDuoc.response.data.error.details[0].message).toBe('private')
    expect(boVanChuyen).toHaveBeenCalledTimes(1)
  })

  it('aborts an in-flight Axios adapter and preserves cancellation', async () => {
    let daBatDau
    const sanSang = new Promise(resolve => { daBatDau = resolve })
    ketNoiHttp.defaults.adapter = cauHinh => new Promise((resolve, reject) => {
      cauHinh.signal.addEventListener('abort', () => reject(new CanceledError('cancelled', cauHinh)), { once: true })
      daBatDau()
    })
    const boDieuKhien = new AbortController()
    const dangCho = layDanhMucCongKhai({}, { signal: boDieuKhien.signal }).catch(loi => loi)
    await sanSang
    boDieuKhien.abort()
    const loi = await dangCho
    expect(loi.code).toBe('ERR_CANCELED')
    expect(chuanHoaLoiApi(loi).isCancelled).toBe(true)
  })

  it('canonicalizes omitted defaults and whitespace without losing Unicode', () => {
    expect(chuanHoaThamSoDanhSach()).toEqual({ page: 1, limit: 10, search: '' })
    expect(chuanHoaThamSoDanhSach({ search: '  📚 Việt  ' })).toEqual({ page: 1, limit: 10, search: '📚 Việt' })
    expect(chuanHoaThamSoDanhSach({ search: '📚'.repeat(255) }).search).toHaveLength(510)
  })
  it.each([{ page: 0 }, { page: '1' }, { page: 1.2 }, { limit: 101 }, { limit: 0 }, { search: 2 }, { search: '\uD800' }, { search: 'x'.repeat(256) }, { page: Number.MAX_SAFE_INTEGER, limit: 100 }, { token: 'not-allowed' }])('rejects invalid params %j before transport', thamSo => {
    const boVanChuyen = vi.fn()
    ketNoiHttp.defaults.adapter = boVanChuyen
    expect(() => laySachCongKhai(thamSo)).toThrow(TypeError)
    expect(boVanChuyen).not.toHaveBeenCalled()
  })
})

describe('Safe UI error normalization', () => {
  it.each([400, 401, 403, 404, 409, 429, 500, 503])('maps verified HTTP %s without exposing server content', trangThaiHttp => {
    const banGoc = new AxiosError('SQL/private', 'ERR_BAD_RESPONSE', {}, null, { status: trangThaiHttp, data: { error: {
      code: 'VALIDATION_ERROR', message: 'private secret stack', details: [{ field: 'page', message: 'private value' }, { field: '<script>', message: 'private' }],
    } } })
    const ketQua = chuanHoaLoiApi(banGoc)
    expect(ketQua.status).toBe(trangThaiHttp)
    expect(ketQua.code).toBe('VALIDATION_ERROR')
    expect(ketQua.message).toBeTruthy()
    expect(ketQua.details).toEqual([{ field: 'page', message: 'Kiểm tra giá trị của trường này.' }])
    expect(ketQua.cause).toBe(banGoc)
    expect(JSON.stringify(ketQua)).not.toMatch(/private|SQL|stack|secret/)
    expect(ketQua.isCancelled).toBe(false)
  })
  it.each([['ERR_NETWORK', 'isNetworkError'], ['ECONNABORTED', 'isTimeout'], ['ETIMEDOUT', 'isTimeout'], ['ERR_CANCELED', 'isCancelled']])('classifies %s with no invented status', (ma, coPhanLoai) => {
    const ketQua = chuanHoaLoiApi(new AxiosError('internal', ma))
    expect(ketQua[coPhanLoai]).toBe(true)
    expect(ketQua.status).toBeNull()
    expect(ketQua.message).not.toContain('internal')
  })
  it('handles client/config errors and unexpected statuses generically', () => {
    expect(chuanHoaLoiApi(new Error('config private')).code).toBe('CLIENT_ERROR')
    const ketQua = chuanHoaLoiApi({ response: { status: 422, data: { error: { code: 'unsafe value' } } } })
    expect(ketQua.status).toBe(422)
    expect(ketQua.code).toBe('HTTP_ERROR')
    expect(ketQua.message).toBe(chuanHoaLoiApi({ response: { status: 418 } }).message)
    expect(chuanHoaLoiApi(null).status).toBeNull()
  })
})
