import { useId } from 'react'

export default function OChon({ id, label, className = '', ...props }) {
  const maTuSinh = useId()
  return (
    <label className={`ui-checkbox-label ${props.disabled ? 'is-disabled' : ''} ${className}`} htmlFor={id ?? maTuSinh}>
      <input {...props} type="checkbox" id={id ?? maTuSinh} className="ui-checkbox" />
      <span>{label}</span>
    </label>
  )
}
