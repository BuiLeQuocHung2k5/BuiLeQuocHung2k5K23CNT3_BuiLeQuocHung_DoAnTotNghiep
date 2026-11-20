import { BookOpen, PanelsTopLeft, LayoutTemplate, SquareDashed, HeartPulse, Palette } from 'lucide-react'

export const DUONG_DAN_UNG_DUNG = '/app'

// Chỉ các route kỹ thuật có thật; không định nghĩa quyền hoặc route nghiệp vụ giả.
export const cacTrangTrongKhung = [
  { id: 'overview', path: '', to: DUONG_DAN_UNG_DUNG, title: 'Khung ứng dụng', icon: PanelsTopLeft, status: 'implemented' },
  { id: 'layouts', path: 'layouts', to: `${DUONG_DAN_UNG_DUNG}/layouts`, title: 'Bố cục theo vai trò', icon: LayoutTemplate, status: 'preview' },
  { id: 'workspace', path: 'workspace', to: `${DUONG_DAN_UNG_DUNG}/workspace`, title: 'Khu vực nội dung', icon: SquareDashed, status: 'placeholder' },
  { id: 'api-check', path: 'api-check', to: `${DUONG_DAN_UNG_DUNG}/api-check`, title: 'Kiểm tra API công khai', icon: HeartPulse, status: 'implemented' },
]

export const dieuHuongNenTang = [
  { id: 'application', label: 'Không gian ứng dụng', items: cacTrangTrongKhung.map(trang => ({ id: trang.id, label: trang.title, to: trang.to, icon: trang.icon, end: true })) },
  { id: 'tools', label: 'Công cụ phát triển', items: [
    { id: 'health', label: 'Kiểm tra nền tảng', to: '/', icon: HeartPulse, end: true },
    { id: 'design-system', label: 'Design System', to: '/design-system', icon: Palette, end: true },
  ] },
]

export const thuongHieuUngDung = { name: 'LibriFlow', caption: 'Warm Wooden Library', icon: BookOpen }
