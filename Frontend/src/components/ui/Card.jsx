export function Card({ className = '', children, ...props }) {
  return <div {...props} className={`ui-card ${className}`}>{children}</div>
}
export function CardHeader({ className = '', ...props }) {
  return <div {...props} className={`ui-card-header ${className}`} />
}
export function CardTitle({ as: Tag = 'h3', className = '', ...props }) {
  return <Tag {...props} className={`ui-card-title ${className}`} />
}
export function CardDescription({ className = '', ...props }) {
  return <p {...props} className={`ui-card-description ${className}`} />
}
export function CardContent({ className = '', ...props }) {
  return <div {...props} className={`ui-card-content ${className}`} />
}
export function CardFooter({ className = '', ...props }) {
  return <div {...props} className={`ui-card-footer ${className}`} />
}
