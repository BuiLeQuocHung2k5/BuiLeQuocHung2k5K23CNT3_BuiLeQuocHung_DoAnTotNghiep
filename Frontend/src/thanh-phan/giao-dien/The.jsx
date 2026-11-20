export function The({ className = '', children, ...props }) {
  return <div {...props} className={`ui-card ${className}`}>{children}</div>
}
export function DauThe({ className = '', ...props }) {
  return <div {...props} className={`ui-card-header ${className}`} />
}
export function TieuDeThe({ as: TheHtml = 'h3', className = '', ...props }) {
  return <TheHtml {...props} className={`ui-card-title ${className}`} />
}
export function MoTaThe({ className = '', ...props }) {
  return <p {...props} className={`ui-card-description ${className}`} />
}
export function NoiDungThe({ className = '', ...props }) {
  return <div {...props} className={`ui-card-content ${className}`} />
}
export function ChanThe({ className = '', ...props }) {
  return <div {...props} className={`ui-card-footer ${className}`} />
}
