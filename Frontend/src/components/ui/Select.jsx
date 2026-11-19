import { useId } from 'react'
import Field from './Field.jsx'

export default function Select({ id, label, placeholder = 'Chọn một mục', options = [], helperText, error, required, className = '', ...props }) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const description = [props['aria-describedby'], helperText && `${fieldId}-helper`, error && `${fieldId}-error`].filter(Boolean).join(' ')
  const selection = props.value === undefined ? { defaultValue: '' } : {}
  return (
    <Field id={fieldId} label={label} required={required} helperText={helperText} error={error}>
      <select {...selection} {...props} id={fieldId} required={required} className={`ui-control ui-select ${className}`}
        aria-invalid={error ? true : props['aria-invalid']} aria-describedby={description || undefined}>
        <option value="" disabled>{placeholder}</option>
        {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </Field>
  )
}
