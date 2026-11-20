import { CircleCheck, Info, TriangleAlert, CircleX } from 'lucide-react'
import BieuTuong from "./BieuTuong.jsx"

const cacBieuTuong = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleX }

export default function ThongBao({ variant = 'info', title, children, className = '', role = 'note', ...props }) {
  return (
    <div {...props} role={role} className={`ui-alert ui-tone--${variant === 'error' ? 'danger' : variant} ${className}`}>
      <BieuTuong icon={cacBieuTuong[variant] ?? Info} size={20} />
      <div><p className="ui-alert-title">{title}</p><div className="ui-alert-content">{children}</div></div>
    </div>
  )
}
