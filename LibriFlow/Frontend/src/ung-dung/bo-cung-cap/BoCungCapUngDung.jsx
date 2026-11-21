import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { taoTrinhTruyVan } from "../../thu-vien/trinh-truy-van.js"
import VungThongBao from "../../thanh-phan/giao-dien/VungThongBao.jsx"
import BoCungCapXacThuc from '../../chuc-nang/xac-thuc/BoCungCapXacThuc.jsx'

export default function BoCungCapUngDung({ children }) {
  const [trinhTruyVan] = useState(taoTrinhTruyVan)
  return <QueryClientProvider client={trinhTruyVan}><BoCungCapXacThuc>{children}</BoCungCapXacThuc><VungThongBao /></QueryClientProvider>
}
