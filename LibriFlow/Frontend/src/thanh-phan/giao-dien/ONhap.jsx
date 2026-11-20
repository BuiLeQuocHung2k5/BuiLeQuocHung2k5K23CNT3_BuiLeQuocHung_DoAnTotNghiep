import { useId } from 'react'
import TruongNhap from "./TruongNhap.jsx"

export default function ONhap({ id, label, helperText, error: loi, required, className = '', ...props }) {
  const maTuSinh = useId()
  const maTruong = id ?? maTuSinh
  const description = [props['aria-describedby'], helperText && `${maTruong}-helper`, loi && `${maTruong}-error`].filter(Boolean).join(' ')
  return (
    <TruongNhap id={maTruong} label={label} required={required} helperText={helperText} error={loi}>
      <input {...props} id={maTruong} required={required} className={`ui-control ${className}`}
        aria-invalid={loi ? true : props['aria-invalid']} aria-describedby={description || undefined} />
    </TruongNhap>
  )
}
