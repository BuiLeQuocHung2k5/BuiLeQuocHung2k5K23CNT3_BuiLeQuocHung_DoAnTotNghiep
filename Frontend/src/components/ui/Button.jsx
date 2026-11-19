import Spinner from './Spinner.jsx'

export default function Button({
  variant = 'primary', size = 'md', loading = false, disabled = false,
  icon, children, className = '', type = 'button', ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <Spinner label="Đang xử lý" /> : icon}
      {children}
    </button>
  )
}
