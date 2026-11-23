import { BookOpen, PanelsTopLeft, LayoutTemplate, SquareDashed, HeartPulse, Palette } from 'lucide-react'

export const DUONG_DAN_UNG_DUNG = '/app'

// GET sách public ở Backend; khu vực /app vẫn yêu cầu phiên. Grant ghi được kiểm tại thao tác.
export const cacTrangTrongKhung = [
  { id: 'overview', path: '', to: DUONG_DAN_UNG_DUNG, title: 'Khung ứng dụng', icon: PanelsTopLeft, status: 'implemented' },
  { id: 'books', path: 'sach', to: `${DUONG_DAN_UNG_DUNG}/sach`, title: 'Quản lý sách', icon: BookOpen, status: 'implemented' },
  { id: 'layouts', path: 'layouts', to: `${DUONG_DAN_UNG_DUNG}/layouts`, title: 'Bố cục theo vai trò', icon: LayoutTemplate, status: 'preview', congKhaiKyThuat: true },
  { id: 'workspace', path: 'workspace', to: `${DUONG_DAN_UNG_DUNG}/workspace`, title: 'Khu vực nội dung', icon: SquareDashed, status: 'placeholder', congKhaiKyThuat: true },
  { id: 'api-check', path: 'api-check', to: `${DUONG_DAN_UNG_DUNG}/api-check`, title: 'Kiểm tra API công khai', icon: HeartPulse, status: 'implemented', congKhaiKyThuat: true },
]

function taoMucDieuHuong(trang) {
  return { id: trang.id, label: trang.title, to: trang.to, icon: trang.icon, end: true,
    canDangNhap: !trang.congKhaiKyThuat, yeuCauTruyCap: trang.yeuCauTruyCap }
}

export const dieuHuongNenTang = [
  { id: 'application', label: 'Không gian ứng dụng', items: cacTrangTrongKhung.filter(trang => !trang.congKhaiKyThuat).map(taoMucDieuHuong) },
  { id: 'tools', label: 'Công cụ phát triển', items: [
    ...cacTrangTrongKhung.filter(trang => trang.congKhaiKyThuat).map(taoMucDieuHuong),
    { id: 'health', label: 'Kiểm tra nền tảng', to: '/', icon: HeartPulse, end: true },
    { id: 'design-system', label: 'Design System', to: '/design-system', icon: Palette, end: true },
  ] },
]

export const thuongHieuUngDung = { name: 'LibriFlow', caption: 'Warm Wooden Library', icon: BookOpen }
