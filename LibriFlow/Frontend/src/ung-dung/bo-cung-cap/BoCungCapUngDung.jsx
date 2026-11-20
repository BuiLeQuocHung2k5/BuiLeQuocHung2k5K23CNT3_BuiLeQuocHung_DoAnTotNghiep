import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { taoTrinhTruyVan } from "../../thu-vien/trinh-truy-van.js"
import VungThongBao from "../../thanh-phan/giao-dien/VungThongBao.jsx"

export default function BoCungCapUngDung({ children }) {
  const [trinhTruyVan] = useState(taoTrinhTruyVan)
  return <QueryClientProvider client={trinhTruyVan}>{children}<VungThongBao /></QueryClientProvider>
}
