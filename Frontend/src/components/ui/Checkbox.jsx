import { useId } from 'react'

export default function Checkbox({ id, label, className = '', ...props }) {
  const generatedId = useId()
  return (
    <label className={`ui-checkbox-label ${props.disabled ? 'is-disabled' : ''} ${className}`} htmlFor={id ?? generatedId}>
      <input {...props} type="checkbox" id={id ?? generatedId} className="ui-checkbox" />
      <span>{label}</span>
    </label>
  )
}
