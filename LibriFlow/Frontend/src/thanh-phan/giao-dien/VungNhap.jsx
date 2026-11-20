import { useId } from 'react'
import TruongNhap from "./TruongNhap.jsx"

export default function VungNhap({ id, label, helperText, error: loi, required, className = '', rows = 4, ...props }) {
  const maTuSinh = useId()
  const maTruong = id ?? maTuSinh
  const description = [props['aria-describedby'], helperText && `${maTruong}-helper`, loi && `${maTruong}-error`].filter(Boolean).join(' ')
  return (
    <TruongNhap id={maTruong} label={label} required={required} helperText={helperText} error={loi}>
      <textarea {...props} id={maTruong} rows={rows} required={required} className={`ui-control ui-textarea ${className}`}
        aria-invalid={loi ? true : props['aria-invalid']} aria-describedby={description || undefined} />
    </TruongNhap>
  )
}
