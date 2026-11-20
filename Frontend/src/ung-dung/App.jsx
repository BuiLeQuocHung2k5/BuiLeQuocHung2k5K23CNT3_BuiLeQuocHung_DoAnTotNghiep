import { BrowserRouter } from 'react-router'
import BoCungCapUngDung from "./bo-cung-cap/BoCungCapUngDung.jsx"
import DinhTuyenUngDung from "./dinh-tuyen/DinhTuyenUngDung.jsx"

export default function App() {
  return (
    <BoCungCapUngDung>
      <BrowserRouter>
        <DinhTuyenUngDung />
      </BrowserRouter>
    </BoCungCapUngDung>
  )
}
