import { useSyncExternalStore } from 'react'

// Đồng bộ với media query 1024px trong khung-ung-dung.css.
const truyVan = '(min-width: 1024px)'

function dangKyTheoDoi(hamGoiLai) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const dieuKienHienThi = window.matchMedia(truyVan)
  dieuKienHienThi.addEventListener('change', hamGoiLai)
  return () => dieuKienHienThi.removeEventListener('change', hamGoiLai)
}

function layTrangThaiHienTai() {
  return typeof window.matchMedia === 'function' && window.matchMedia(truyVan).matches
}

export default function useDieuHuongDesktop() {
  return useSyncExternalStore(dangKyTheoDoi, layTrangThaiHienTai, () => false)
}
