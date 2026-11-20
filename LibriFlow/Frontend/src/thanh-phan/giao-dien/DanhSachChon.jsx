import { useId } from 'react'
import TruongNhap from "./TruongNhap.jsx"

export default function DanhSachChon({ id, label, placeholder = 'Chọn một mục', options = [], helperText, error: loi, required, className = '', ...props }) {
  const maTuSinh = useId()
  const maTruong = id ?? maTuSinh
  const description = [props['aria-describedby'], helperText && `${maTruong}-helper`, loi && `${maTruong}-error`].filter(Boolean).join(' ')
  const luaChon = props.value === undefined ? { defaultValue: '' } : {}
  return (
    <TruongNhap id={maTruong} label={label} required={required} helperText={helperText} error={loi}>
      <select {...luaChon} {...props} id={maTruong} required={required} className={`ui-control ui-select ${className}`}
        aria-invalid={loi ? true : props['aria-invalid']} aria-describedby={description || undefined}>
        <option value="" disabled>{placeholder}</option>
        {options.map(tuyChon => <option key={tuyChon.value} value={tuyChon.value} disabled={tuyChon.disabled}>{tuyChon.label}</option>)}
      </select>
    </TruongNhap>
  )
}
