export default function Skeleton({ variant = 'text', className = '', ...props }) {
  return <div {...props} aria-hidden="true" className={`ui-skeleton ui-skeleton--${variant} ${className}`} />
}
