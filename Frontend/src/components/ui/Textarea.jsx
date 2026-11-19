import { useId } from 'react'
import Field from './Field.jsx'

export default function Textarea({ id, label, helperText, error, required, className = '', rows = 4, ...props }) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const description = [props['aria-describedby'], helperText && `${fieldId}-helper`, error && `${fieldId}-error`].filter(Boolean).join(' ')
  return (
    <Field id={fieldId} label={label} required={required} helperText={helperText} error={error}>
      <textarea {...props} id={fieldId} rows={rows} required={required} className={`ui-control ui-textarea ${className}`}
        aria-invalid={error ? true : props['aria-invalid']} aria-describedby={description || undefined} />
    </Field>
  )
}
