import VongTai from "./VongTai.jsx"

export default function NutBam({
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
      {loading ? <VongTai label="Đang xử lý" /> : icon}
      {children}
    </button>
  )
}
