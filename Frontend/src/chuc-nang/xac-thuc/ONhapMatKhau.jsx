import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import TruongNhap from '../../thanh-phan/giao-dien/TruongNhap.jsx'

export default function ONhapMatKhau({ id, label, helperText, error, required, disabled, ...props }) {
  const maTuSinh = useId()
  const maTruong = id ?? maTuSinh
  const [hien, datHien] = useState(false)
  const moTa = [props['aria-describedby'], helperText && `${maTruong}-helper`, error && `${maTruong}-error`].filter(Boolean).join(' ')
  return <TruongNhap id={maTruong} label={label} required={required} helperText={helperText} error={error}>
    <div className="auth-password">
      <input {...props} id={maTruong} className="ui-control" type={hien ? 'text' : 'password'} required={required}
        disabled={disabled} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={moTa || undefined} />
      <button className="auth-password-toggle" type="button" disabled={disabled}
        aria-label={hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={hien}
        onClick={() => datHien(cu => !cu)}>
        {hien ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </div>
  </TruongNhap>
}
