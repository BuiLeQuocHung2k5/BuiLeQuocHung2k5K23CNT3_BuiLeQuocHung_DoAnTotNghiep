import { useQuery } from '@tanstack/react-query'
import { kiemTraSucKhoe } from "../nen-tang/api-suc-khoe.js"
import { laySachCongKhai, layDanhMucCongKhai, chuanHoaThamSoDanhSach } from "./dich-vu-cong-khai.js"

export const khoaTruyVanCongKhai = {
  all: ['public'],
  health: () => ['public', 'health'],
  books: thamSo => ['public', 'books', chuanHoaThamSoDanhSach(thamSo)],
  categories: thamSo => ['public', 'categories', chuanHoaThamSoDanhSach(thamSo)],
}

const vongDoi = {
  retry: false, staleTime: 30_000, gcTime: 300_000,
  refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: false,
}

export function useSucKhoe({ enabled = false } = {}) {
  return useQuery({ ...vongDoi, queryKey: khoaTruyVanCongKhai.health(), queryFn: ({ signal: tinHieu }) => kiemTraSucKhoe({ signal: tinHieu }), enabled })
}

export function useSachCongKhai(thamSo = {}, { enabled = false } = {}) {
  const thamSoChuan = chuanHoaThamSoDanhSach(thamSo)
  return useQuery({ ...vongDoi, queryKey: khoaTruyVanCongKhai.books(thamSoChuan), queryFn: ({ signal: tinHieu }) => laySachCongKhai(thamSoChuan, { signal: tinHieu }), enabled })
}

export function useDanhMucCongKhai(thamSo = {}, { enabled = false } = {}) {
  const thamSoChuan = chuanHoaThamSoDanhSach(thamSo)
  return useQuery({ ...vongDoi, queryKey: khoaTruyVanCongKhai.categories(thamSoChuan), queryFn: ({ signal: tinHieu }) => layDanhMucCongKhai(thamSoChuan, { signal: tinHieu }), enabled })
}
