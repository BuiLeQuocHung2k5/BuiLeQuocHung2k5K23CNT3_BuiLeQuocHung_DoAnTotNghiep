export default function TruongNhap({ id, label, required, helperText, error: loi, children }) {
  return (
    <div className="ui-field">
      {label && <label className="ui-label" htmlFor={id}>
        {label}{required && <span className="ui-required"> <span aria-hidden="true">*</span><span className="sr-only"> (bắt buộc)</span></span>}
      </label>}
      {children}
      {helperText && <p className="ui-helper" id={`${id}-helper`}>{helperText}</p>}
      {loi && <p className="ui-error" id={`${id}-error`}>{loi}</p>}
    </div>
  )
}
