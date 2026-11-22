import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CanceledError } from 'axios'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { NguCanhXacThuc } from './useXacThuc.js'
import { guiDangNhap, guiDangXuat, layNguoiDung, guiSoDienThoai, guiAnhDaiDien } from './dich-vu-xac-thuc.js'

const THONG_BAO_HET_PHIEN = 'Phiên đăng nhập đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại.'

function docHoSo(phanHoi, maNguoiDung) {
  const nguoiDung = phanHoi.data?.data
  if (phanHoi.data?.success !== true || typeof nguoiDung?.user_id !== 'string' || typeof nguoiDung.name !== 'string' ||
    (maNguoiDung !== undefined && nguoiDung.user_id !== maNguoiDung) ||
    !Array.isArray(nguoiDung.roles) || !nguoiDung.roles.every(vaiTro => typeof vaiTro === 'string') ||
    !Array.isArray(nguoiDung.permissions) || !nguoiDung.permissions.every(quyen => typeof quyen === 'string')) {
    throw Object.assign(new Error('Phản hồi người dùng không hợp lệ.'), {
      code: maNguoiDung === undefined ? 'AUTH_RESPONSE_INVALID' : 'PROFILE_RESPONSE_INVALID',
    })
  }
  return nguoiDung
}

export default function BoCungCapXacThuc({ children }) {
  const trinhTruyVan = useQueryClient()
  const [phien, datPhien] = useState(null)
  const [dangDangNhap, datDangDangNhap] = useState(false)
  const [thongBaoPhien, datThongBaoPhien] = useState('')
  const hienTai = useRef({ ma: 0, token: null, hetHanLuc: 0, boDieuKhien: null })
  const yeuCauHoSo = useRef(null)

  const xoaPhien = useCallback((thongBao = '') => {
    hienTai.current.boDieuKhien?.abort()
    yeuCauHoSo.current?.abort()
    yeuCauHoSo.current = null
    hienTai.current = { ma: hienTai.current.ma + 1, token: null, hetHanLuc: 0, boDieuKhien: null }
    datPhien(null)
    datDangDangNhap(false)
    datThongBaoPhien(thongBao)
    // Xóa cả cache công khai để giữ ranh giới phiên đơn giản, không sót dữ liệu user cũ.
    void trinhTruyVan.cancelQueries()
    trinhTruyVan.clear()
  }, [trinhTruyVan])

  useEffect(() => {
    const maYeuCau = ketNoiHttp.interceptors.request.use(cauHinh => {
      if (cauHinh.boQuaPhien) return cauHinh
      // Chỉ gắn token vào đường dẫn API tương đối của client này.
      if (cauHinh.baseURL !== ketNoiHttp.defaults.baseURL || !/^\/(?!\/)/.test(cauHinh.url ?? '')) return cauHinh
      const phienMoi = hienTai.current
      if (phienMoi.token && Date.now() >= phienMoi.hetHanLuc) {
        xoaPhien(THONG_BAO_HET_PHIEN)
        throw new CanceledError('Phiên đã hết hạn.')
      }
      if (phienMoi.token && !cauHinh.headers.has('Authorization')) cauHinh.headers.set('Authorization', `Bearer ${phienMoi.token}`)
      if (phienMoi.token && cauHinh.headers.get('Authorization') === `Bearer ${phienMoi.token}`) cauHinh.maPhien = phienMoi.ma
      return cauHinh
    })
    const maPhanHoi = ketNoiHttp.interceptors.response.use(phanHoi => phanHoi, loi => {
      const cauHinh = loi.config
      const phienMoi = hienTai.current
      // 401 của login, request vô danh hoặc phiên cũ không được xóa phiên mới; 403 giữ phiên.
      if (loi.response?.status === 401 && !cauHinh?.boQuaPhien && phienMoi.token && cauHinh?.maPhien === phienMoi.ma &&
        cauHinh.headers?.get('Authorization') === `Bearer ${phienMoi.token}`) xoaPhien(THONG_BAO_HET_PHIEN)
      return Promise.reject(loi)
    })
    return () => {
      ketNoiHttp.interceptors.request.eject(maYeuCau)
      ketNoiHttp.interceptors.response.eject(maPhanHoi)
      hienTai.current.boDieuKhien?.abort()
      yeuCauHoSo.current?.abort()
      yeuCauHoSo.current = null
      hienTai.current = { ma: hienTai.current.ma + 1, token: null, hetHanLuc: 0, boDieuKhien: null }
    }
  }, [xoaPhien])

  useEffect(() => {
    if (!phien) return
    const kiemTraHan = () => {
      if (hienTai.current.ma === phien.ma && Date.now() >= phien.hetHanLuc) xoaPhien(THONG_BAO_HET_PHIEN)
    }
    const henGio = setTimeout(kiemTraHan, Math.max(0, phien.hetHanLuc - Date.now()))
    window.addEventListener('focus', kiemTraHan)
    document.addEventListener('visibilitychange', kiemTraHan)
    return () => {
      clearTimeout(henGio)
      window.removeEventListener('focus', kiemTraHan)
      document.removeEventListener('visibilitychange', kiemTraHan)
    }
  }, [phien, xoaPhien])

  async function dangNhap(thongTin) {
    xoaPhien()
    const ma = hienTai.current.ma
    const boDieuKhien = new AbortController()
    hienTai.current.boDieuKhien = boDieuKhien
    const batDauLuc = Date.now()
    datDangDangNhap(true)
    try {
      const phanHoi = await guiDangNhap(thongTin, boDieuKhien.signal)
      const duLieu = phanHoi.data?.data
      if (phanHoi.data?.success !== true || typeof duLieu?.accessToken !== 'string' || !duLieu.accessToken || duLieu.tokenType !== 'Bearer' || duLieu.expiresIn !== 900) {
        throw Object.assign(new Error('Phản hồi xác thực không hợp lệ.'), { code: 'AUTH_RESPONSE_INVALID' })
      }
      const phanHoiToi = await layNguoiDung(duLieu.accessToken, boDieuKhien.signal)
      const nguoiDung = docHoSo(phanHoiToi)
      const hetHanLuc = batDauLuc + duLieu.expiresIn * 1000
      if (hienTai.current.ma !== ma || boDieuKhien.signal.aborted) throw new CanceledError()
      if (Date.now() >= hetHanLuc) throw Object.assign(new Error('Phiên chưa hợp lệ.'), { code: 'AUTH_RESPONSE_INVALID' })
      hienTai.current = { ma, token: duLieu.accessToken, hetHanLuc, boDieuKhien: null }
      datPhien({ ma, tokenTruyCap: duLieu.accessToken, nguoiDung, hetHanLuc })
    } finally {
      if (hienTai.current.ma === ma) {
        hienTai.current.boDieuKhien = null
        datDangDangNhap(false)
      }
    }
  }

  function dangXuat() {
    const token = hienTai.current.token
    const yeuCau = token ? guiDangXuat(token).catch(() => {}) : Promise.resolve()
    xoaPhien()
    return yeuCau
  }

  async function capNhatHoSo(gui, duLieu) {
    const phienLucGui = hienTai.current
    if (!phien || !phienLucGui.token || phien.ma !== phienLucGui.ma) throw new CanceledError()
    if (yeuCauHoSo.current) throw Object.assign(new Error('Đang lưu hồ sơ.'), { code: 'PROFILE_BUSY' })

    const boDieuKhien = new AbortController()
    yeuCauHoSo.current = boDieuKhien
    try {
      const phanHoi = await gui(duLieu, phienLucGui.token, boDieuKhien.signal)
      if (hienTai.current.ma !== phienLucGui.ma || boDieuKhien.signal.aborted) throw new CanceledError()
      if (Date.now() >= phienLucGui.hetHanLuc) {
        xoaPhien(THONG_BAO_HET_PHIEN)
        throw new CanceledError()
      }
      const nguoiDung = docHoSo(phanHoi, phien.nguoiDung.user_id)
      datPhien(cu => cu?.ma === phienLucGui.ma ? { ...cu, nguoiDung } : cu)
    } finally {
      if (yeuCauHoSo.current === boDieuKhien) yeuCauHoSo.current = null
    }
  }

  return <NguCanhXacThuc.Provider value={{ tokenTruyCap: phien?.tokenTruyCap ?? null, nguoiDung: phien?.nguoiDung ?? null,
    daDangNhap: Boolean(phien), dangDangNhap, thongBaoPhien, dangNhap, dangXuat,
    capNhatSoDienThoai: phone => capNhatHoSo(guiSoDienThoai, phone),
    capNhatAnhDaiDien: tep => capNhatHoSo(guiAnhDaiDien, tep),
  }}>{children}</NguCanhXacThuc.Provider>
}
