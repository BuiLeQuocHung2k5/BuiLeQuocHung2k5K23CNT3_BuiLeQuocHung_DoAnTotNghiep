import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { AxiosError } from 'axios'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { kiemTraBieuMauSach, layDanhSachSach, layChiTietSach, luuSach, xoaSach, loiSachAnToan } from './dich-vu-sach.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))
const ma = '18446744073709551614'
const sach = { book_id: ma, title: 'Sách thử', author: 'Tác giả thử', category_id: null, series_id: '9007199254740993', publisher: null, description: null, publication_year: 0 }
const phien = { daDangNhap: true, tokenTruyCap: 'token-mock-fe08', nguoiDung: { status: 'active', roles: ['librarian'], permissions: ['book_create', 'book_update', 'book_delete'] } }
const adapterGoc = ketNoiHttp.defaults.adapter
let daGoi
beforeEach(() => {
  daGoi = []
  ketNoiHttp.defaults.adapter = async cauHinh => {
    daGoi.push(cauHinh)
    const data = cauHinh.method === 'delete' ? null : { ...sach, ...(cauHinh.data ? JSON.parse(cauHinh.data) : {}) }
    return { config: cauHinh, status: cauHinh.method === 'post' ? 201 : 200, headers: {}, data: { success: true, data } }
  }
})
afterEach(() => { ketNoiHttp.defaults.adapter = adapterGoc; vi.restoreAllMocks() })

describe('FE-08 — request contract qua Axios adapter mock', () => {
  it('sends only page/limit/search and preserves literal percent/underscore search', async () => {
    ketNoiHttp.defaults.adapter = async cauHinh => { daGoi.push(cauHinh); return { config: cauHinh, status: 200, headers: {}, data: { success: true, data: [sach], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } } } }
    await layDanhSachSach({ search: ' %_ publisher ' })
    expect(daGoi[0].params).toEqual({ page: 1, limit: 10, search: '%_ publisher' })
    await expect(layDanhSachSach({ category_id: '1' })).rejects.toThrow()
    expect(daGoi).toHaveLength(1)
  })
  it('keeps BIGINT identity, forwards AbortSignal and calls the real detail path', async () => {
    const dieuKhien = new AbortController()
    const ketQua = await layChiTietSach(ma, { signal: dieuKhien.signal })
    expect(ketQua.data.data.book_id).toBe(ma)
    expect(daGoi[0].url).toBe(`/books/${ma}`)
    expect(daGoi[0].signal).toBe(dieuKhien.signal)
  })
  it('PUT sends every writable field, preserves null/zero/reference IDs and excludes read-only fields', async () => {
    await luuSach(ma, { ...sach, created_at: 'read-only', isbn: 'not-a-book-field' }, phien)
    expect(daGoi[0].method).toBe('put')
    expect(daGoi[0].headers.get('Authorization')).toBe('Bearer token-mock-fe08')
    expect(JSON.parse(daGoi[0].data)).toEqual({ title: 'Sách thử', author: 'Tác giả thử', publisher: null, category_id: null, series_id: '9007199254740993', description: null, publication_year: 0 })
  })
  it('POST uses JSON and DELETE has no invented soft-delete body', async () => {
    await luuSach(null, sach, phien)
    await xoaSach(ma, phien)
    expect(daGoi.map(cauHinh => [cauHinh.method, cauHinh.url])).toEqual([['post', '/books'], ['delete', `/books/${ma}`]])
    expect(daGoi[0].headers.get('Content-Type')).toContain('application/json')
    expect(daGoi[1].data).toBeUndefined()
  })
  it.each(['book_create', 'book_update', 'book_delete'])('blocks missing %s before any API request, even for admin', async quyen => {
    const khongQuyen = { ...phien, nguoiDung: { ...phien.nguoiDung, roles: ['admin'], permissions: [] } }
    const yeuCau = quyen === 'book_delete' ? xoaSach(ma, khongQuyen) : luuSach(quyen === 'book_create' ? null : ma, sach, khongQuyen)
    await expect(yeuCau).rejects.toMatchObject({ code: 'BOOK_ACTION_FORBIDDEN' })
    expect(daGoi).toHaveLength(0)
  })
  it.each(['0', '01', '18446744073709551616', '1/../../auth/me'])('rejects invalid ID %s before transport', async id => {
    await expect(layChiTietSach(id)).rejects.toMatchObject({ code: 'BOOK_ID_INVALID' })
    expect(daGoi).toHaveLength(0)
  })
  it('rejects HTML, wrong record identity and malformed list envelopes', async () => {
    ketNoiHttp.defaults.adapter = async cauHinh => ({ status: 200, headers: {}, config: cauHinh, data: '<html>wrong origin</html>' })
    await expect(layDanhSachSach({})).rejects.toMatchObject({ code: 'BOOK_RESPONSE_INVALID' })
    ketNoiHttp.defaults.adapter = async cauHinh => ({ status: 200, headers: {}, config: cauHinh, data: { success: true, data: { ...sach, book_id: '2' } } })
    await expect(layChiTietSach(ma)).rejects.toMatchObject({ code: 'BOOK_RESPONSE_INVALID' })
  })
})

describe('FE-08 — form và lỗi an toàn', () => {
  it('accepts Unicode codepoint lengths and preserves description whitespace/empty versus null', () => {
    const ketQua = kiemTraBieuMauSach({ ...sach, title: '📚'.repeat(255), description: ' \nMô tả\n ', publisher: '' })
    expect(ketQua.loi).toEqual({})
    expect(ketQua.duLieu.description).toBe(' \nMô tả\n ')
    expect(ketQua.duLieu.publisher).toBe('')
    expect(kiemTraBieuMauSach(sach).duLieu.description).toBeNull()
  })
  it.each([
    ['title', '   '], ['title', 'a'.repeat(256)], ['author', ''], ['publisher', 'a'.repeat(151)],
    ['category_id', '0'], ['series_id', '18446744073709551616'], ['publication_year', -1],
    ['publication_year', 65536], ['publication_year', 1.5], ['description', 'a'.repeat(65536)], ['description', '\uD800'],
  ])('validates %s without weakening Backend constraints %#', (khoa, giaTri) => {
    expect(kiemTraBieuMauSach({ ...sach, [khoa]: giaTri }).loi[khoa]).toBeTypeOf('string')
  })
  it('sanitizes validation details and explains referenced deletion without retaining Axios config', () => {
    const loi = new AxiosError('private', 'ERR_BAD_REQUEST', { headers: { Authorization: 'token-mock-fe08' } }, null,
      { status: 400, data: { error: { code: 'VALIDATION_ERROR', message: 'private SQL', details: [{ field: 'title', message: 'private SQL' }] } } })
    const anToan = loiSachAnToan(loi, true)
    expect(anToan.loiTruong.title).toBe('Kiểm tra giá trị của trường này.')
    expect(JSON.stringify(anToan)).not.toMatch(/private|token-mock-fe08/)
    expect(Object.hasOwn(anToan, 'cause')).toBe(false)
    loi.response = { status: 409, data: { error: { code: 'BOOK_HAS_COPIES' } } }
    expect(loiSachAnToan(loi, true).message).toMatch(/bản sao/)
  })
  it('treats lost responses or server failures on writes as uncertain, without automatic replay', () => {
    expect(loiSachAnToan(new AxiosError('Network Error', 'ERR_NETWORK'), true).chuaRo).toBe(true)
    expect(loiSachAnToan(new AxiosError('Network Error', 'ERR_NETWORK'), false).chuaRo).toBe(false)
    const loiMayChu = new AxiosError('Mock server error', 'ERR_BAD_RESPONSE', {}, null, { status: 503, data: { error: { code: 'DATABASE_UNAVAILABLE' } } })
    expect(loiSachAnToan(loiMayChu, true).chuaRo).toBe(true)
  })
})
