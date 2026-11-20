import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import BieuTuong from "./BieuTuong.jsx"

export default function HopThoai({ trigger, title, description, children, footer, open: dangMo, defaultOpen, onOpenChange: xuLyDoiTrangThaiMo, className = '', ...contentProps }) {
  return (
    <DialogPrimitive.Root open={dangMo} defaultOpen={defaultOpen} onOpenChange={xuLyDoiTrangThaiMo}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog-overlay" />
        <DialogPrimitive.Content {...contentProps} {...(description ? {} : { 'aria-describedby': undefined })} className={`ui-dialog ${className}`}>
          <div className="ui-dialog-header">
            <DialogPrimitive.Title className="ui-dialog-title">{title}</DialogPrimitive.Title>
            {description && <DialogPrimitive.Description className="ui-dialog-description">{description}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close className="ui-dialog-close" aria-label="Đóng hộp thoại"><BieuTuong icon={X} size={20} /></DialogPrimitive.Close>
          <div className="ui-dialog-body">{children}</div>
          {footer && <div className="ui-dialog-footer">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function DongHopThoai({ children }) {
  return <DialogPrimitive.Close asChild>{children}</DialogPrimitive.Close>
}
