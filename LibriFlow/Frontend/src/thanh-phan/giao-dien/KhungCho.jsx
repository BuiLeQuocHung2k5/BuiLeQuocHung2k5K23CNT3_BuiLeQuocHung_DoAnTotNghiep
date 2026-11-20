export default function KhungCho({ variant = 'text', className = '', ...props }) {
  return <div {...props} aria-hidden="true" className={`ui-skeleton ui-skeleton--${variant} ${className}`} />
}
