import { createContext, useContext } from 'react'

export const NguCanhXacThuc = createContext(null)

export function useXacThuc() {
  const xacThuc = useContext(NguCanhXacThuc)
  if (!xacThuc) throw new Error('Thiếu bộ cung cấp xác thực.')
  return xacThuc
}
