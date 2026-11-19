import { Toaster as SonnerToaster } from 'sonner'

export default function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="bottom-right"
      closeButton
      containerAriaLabel="Thông báo"
      visibleToasts={3}
      toastOptions={{
        duration: 5000,
        closeButtonAriaLabel: 'Đóng thông báo',
        classNames: {
          toast: 'ui-toast', title: 'ui-toast-title', description: 'ui-toast-description',
          success: 'ui-tone--success', error: 'ui-tone--danger',
          warning: 'ui-tone--warning', info: 'ui-tone--info',
          closeButton: 'ui-toast-close',
        },
      }}
    />
  )
}
