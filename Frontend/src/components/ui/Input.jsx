import { useId } from 'react'
import Field from './Field.jsx'

export default function Input({ id, label, helperText, error, required, className = '', ...props }) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const description = [props['aria-describedby'], helperText && `${fieldId}-helper`, error && `${fieldId}-error`].filter(Boolean).join(' ')
  return (
    <Field id={fieldId} label={label} required={required} helperText={helperText} error={error}>
      <input {...props} id={fieldId} required={required} className={`ui-control ${className}`}
        aria-invalid={error ? true : props['aria-invalid']} aria-describedby={description || undefined} />
    </Field>
  )
}
