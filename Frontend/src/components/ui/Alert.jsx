import { CircleCheck, Info, TriangleAlert, CircleX } from 'lucide-react'
import Icon from './Icon.jsx'

const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleX }

export default function Alert({ variant = 'info', title, children, className = '', role = 'note', ...props }) {
  return (
    <div {...props} role={role} className={`ui-alert ui-tone--${variant === 'error' ? 'danger' : variant} ${className}`}>
      <Icon icon={icons[variant] ?? Info} size={20} />
      <div><p className="ui-alert-title">{title}</p><div className="ui-alert-content">{children}</div></div>
    </div>
  )
}
