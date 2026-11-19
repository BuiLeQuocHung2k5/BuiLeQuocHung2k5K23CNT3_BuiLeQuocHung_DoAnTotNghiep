export default function Badge({ variant = 'neutral', className = '', children, ...props }) {
  return <span {...props} className={`ui-badge ui-tone--${variant} ${className}`}>{children}</span>
}
