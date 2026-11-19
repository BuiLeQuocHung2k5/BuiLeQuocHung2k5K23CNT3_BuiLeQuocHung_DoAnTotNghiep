export default function Spinner({ label = 'Đang tải', className = '', ...props }) {
  return (
    <span className={`ui-spinner-wrap ${className}`} role="status" {...props}>
      <span className="ui-spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
