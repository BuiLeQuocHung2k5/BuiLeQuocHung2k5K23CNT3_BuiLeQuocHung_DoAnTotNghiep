import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'

export default function ONhapMatKhau(props) {
  const [hien, datHien] = useState(false)
  return <div className="auth-password">
    <ONhap {...props} type={hien ? 'text' : 'password'} />
    <button className="auth-password-toggle" type="button" disabled={props.disabled}
      aria-label={hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={hien}
      onClick={() => datHien(cu => !cu)}>
      {hien ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
    </button>
  </div>
}
