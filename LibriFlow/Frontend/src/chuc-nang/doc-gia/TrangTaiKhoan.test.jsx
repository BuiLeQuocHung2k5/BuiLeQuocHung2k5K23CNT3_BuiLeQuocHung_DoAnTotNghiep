import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { AxiosError } from 'axios'
import BoCungCapUngDung from '../../ung-dung/bo-cung-cap/BoCungCapUngDung.jsx'
import DinhTuyenUngDung from '../../ung-dung/dinh-tuyen/DinhTuyenUngDung.jsx'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'

vi.mock('../../cau-hinh/moi-truong.js', () => ({ moiTruong: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null } }))

const adapterGoc = ketNoiHttp.defaults.adapter
const avatar = '/api/auth/avatars/a4536f84-34bc-4ae9-aeca-30fa46ca5902.png'
const URLGoc = URL
let hoSo, cacYeuCau, taoXemTruoc, huyXemTruoc, loiAnhMayChu, giuYeuCauSo, traSoDangCho

beforeEach(() => {
  hoSo = { user_id: '9007199254740993', name: 'Tài khoản kiểm thử', email: 'profile@example.test', phone: null,
    avatar: null, roles: ['reader'], permissions: ['book_view'], status: 'active' }
  cacYeuCau = []; loiAnhMayChu = false; giuYeuCauSo = false; traSoDangCho = null
  taoXemTruoc = vi.fn(() => 'blob:profile-test')
  huyXemTruoc = vi.fn()
  vi.stubGlobal('URL', class extends URLGoc {
    static createObjectURL = taoXemTruoc
    static revokeObjectURL = huyXemTruoc
  })
  ketNoiHttp.defaults.adapter = async config => {
    cacYeuCau.push(config)
    const tra = (data, status = 200) => ({ data, status, headers: {}, config })
    if (config.url === '/auth/login') return tra({ success: true, data: { accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900 } })
    if (config.url === '/auth/logout') return tra({ success: true, data: null })
    if (config.url === '/auth/me' && config.method === 'get') return tra({ success: true, data: hoSo })
    if (config.url === '/auth/me' && config.method === 'patch') {
      const { phone } = JSON.parse(config.data)
      if (giuYeuCauSo) return new Promise(resolve => {
        const hoSoCu = { ...hoSo, phone }
        traSoDangCho = () => resolve(tra({ success: true, data: hoSoCu }))
      })
      hoSo = { ...hoSo, phone }
      return tra({ success: true, data: hoSo })
    }
    if (config.url === '/auth/me/avatar' && config.method === 'put') {
      if (loiAnhMayChu) throw new AxiosError('private details', 'ERR_BAD_REQUEST', config, null,
        tra({ success: false, error: { code: 'INVALID_AVATAR', message: 'private details' } }, 400))
      hoSo = { ...hoSo, avatar }
      return tra({ success: true, data: hoSo })
    }
    if (config.url === '/books') return tra({ success: true, data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } })
    throw new Error('Unexpected profile test API request')
  }
})

afterEach(() => {
  ketNoiHttp.defaults.adapter = adapterGoc
  vi.unstubAllGlobals()
})

async function dangNhapVaoHoSo() {
  await userEvent.type(screen.getByLabelText(/^Email/), 'profile@example.test')
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'mat khau mau')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập', exact: true }))
  const menu = await screen.findByRole('navigation', { name: 'Điều hướng chính' })
  await userEvent.click(within(menu).getByRole('link', { name: 'Tài khoản', exact: true }))
  await screen.findByRole('heading', { name: 'Tài khoản của tôi' })
}

function hienThi() {
  render(<BoCungCapUngDung><MemoryRouter initialEntries={['/dang-nhap']}><DinhTuyenUngDung /></MemoryRouter></BoCungCapUngDung>)
}

it('saves only a Vietnamese phone string to the authenticated profile and reloads it from me on login', async () => {
  hienThi()
  await dangNhapVaoHoSo()
  const dienThoai = screen.getByRole('textbox', { name: 'Số điện thoại' })
  await userEvent.type(dienThoai, '12345')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  expect(screen.getByText('Nhập số điện thoại Việt Nam hợp lệ, bắt đầu bằng 0.')).toBeVisible()
  expect(cacYeuCau.some(c => c.method === 'patch')).toBe(false)
  await userEvent.clear(dienThoai)
  await userEvent.type(dienThoai, '0912345678')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  expect(await screen.findByText('Đã cập nhật số điện thoại.')).toBeVisible()
  const yeuCau = cacYeuCau.find(c => c.method === 'patch')
  expect(yeuCau.url).toBe('/auth/me')
  expect(yeuCau.headers.Authorization).toBe('Bearer test-token')
  expect(JSON.parse(yeuCau.data)).toEqual({ phone: '0912345678' })
  await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
  await dangNhapVaoHoSo()
  expect(screen.getByRole('textbox', { name: 'Số điện thoại' })).toHaveValue('0912345678')
})

it('previews and cancels local files, handles invalid bytes safely, and updates both avatar views after upload', async () => {
  hienThi()
  await dangNhapVaoHoSo()
  const tep = screen.getByLabelText('Chọn tệp ảnh đại diện')
  expect(tep).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  const chonTep = vi.spyOn(tep, 'click').mockImplementation(() => {})
  await userEvent.click(screen.getByRole('button', { name: 'Thay ảnh đại diện' }))
  expect(chonTep).toHaveBeenCalledOnce()

  const lon = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'lon.png', { type: 'image/png' })
  fireEvent.change(tep, { target: { files: [lon] } })
  expect(screen.getByRole('alert')).toHaveTextContent('Chọn ảnh JPEG, PNG hoặc WebP')
  expect(taoXemTruoc).not.toHaveBeenCalled()
  const anh = new File(['fixture'], 'avatar.png', { type: 'image/png' })
  fireEvent.change(tep, { target: { files: [anh] } })
  expect(screen.getByAltText('Xem trước ảnh đại diện')).toHaveAttribute('src', 'blob:profile-test')
  await userEvent.click(screen.getByRole('button', { name: 'Hủy chọn ảnh' }))
  expect(huyXemTruoc).toHaveBeenCalledWith('blob:profile-test')
  expect(cacYeuCau.some(c => c.method === 'put')).toBe(false)

  fireEvent.change(tep, { target: { files: [anh] } })
  loiAnhMayChu = true
  await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh không hợp lệ')
  expect(document.body).not.toHaveTextContent('private details')
  expect(within(screen.getByRole('banner')).queryByAltText('Ảnh đại diện')).not.toBeInTheDocument()
  loiAnhMayChu = false
  await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }))
  expect(await screen.findByText('Đã cập nhật ảnh đại diện.')).toBeVisible()
  const upload = cacYeuCau.find(c => c.method === 'put')
  expect(upload.url).toBe('/auth/me/avatar')
  expect(upload.headers['Content-Type']).toBe('image/png')
  expect(upload.data).toBe(anh)
  for (const khuVuc of [screen.getByRole('banner'), screen.getByRole('main')]) {
    expect(within(khuVuc).getByAltText('Ảnh đại diện')).toHaveAttribute('src', `http://127.0.0.1:3000${avatar}`)
  }
  expect(huyXemTruoc).toHaveBeenCalledTimes(2)
  chonTep.mockRestore()
})

it('cancels the old profile write on logout and keeps the next principal when the response arrives late', async () => {
  hienThi()
  await dangNhapVaoHoSo()
  giuYeuCauSo = true
  await userEvent.type(screen.getByRole('textbox', { name: 'Số điện thoại' }), '0912345678')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  expect(screen.getByRole('button', { name: /Lưu thay đổi/ })).toBeDisabled()
  const yeuCau = cacYeuCau.find(c => c.method === 'patch')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
  expect(yeuCau.signal.aborted).toBe(true)
  hoSo = { ...hoSo, user_id: '42', name: 'Phiên mới', phone: '0987654321' }
  await dangNhapVaoHoSo()
  await act(async () => { traSoDangCho() })
  expect(screen.getByRole('textbox', { name: 'Số điện thoại' })).toHaveValue('0987654321')
  expect(within(screen.getByRole('banner')).getByText('Phiên mới')).toBeVisible()
})
