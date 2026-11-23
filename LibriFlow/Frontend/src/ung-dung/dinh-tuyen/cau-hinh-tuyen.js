import { BookOpen, BookOpenCheck, House, History, UserRound, ShieldCheck, Users, ChartColumn, TrendingUp, PanelsTopLeft, LayoutTemplate, SquareDashed, HeartPulse, Palette } from 'lucide-react'

export const DUONG_DAN_UNG_DUNG = '/app'

// GET sách public ở Backend; khu vực /app vẫn yêu cầu phiên. Grant ghi được kiểm tại thao tác.
export const cacTrangTrongKhung = [
  { id: 'overview', path: '', to: DUONG_DAN_UNG_DUNG, title: 'Trang chủ thư viện', icon: PanelsTopLeft, status: 'implemented' },
  { id: 'books', path: 'sach', to: `${DUONG_DAN_UNG_DUNG}/sach`, title: 'Quản lý sách', icon: BookOpen, status: 'implemented' },
  { id: 'borrows', path: 'muon-tra', to: `${DUONG_DAN_UNG_DUNG}/muon-tra`, title: 'Mượn / Trả sách', icon: BookOpenCheck, status: 'implemented', yeuCauTruyCap: { quyen: ['borrow_manage'] } },
  { id: 'reader', path: 'doc-gia', to: `${DUONG_DAN_UNG_DUNG}/doc-gia`, title: 'Góc độc giả', icon: House, status: 'implemented', yeuCauTruyCap: { vaiTro: ['reader'] } },
  { id: 'my-borrows', path: 'lich-su-muon', to: `${DUONG_DAN_UNG_DUNG}/lich-su-muon`, title: 'Lịch sử mượn của tôi', icon: History, status: 'implemented', yeuCauTruyCap: { vaiTro: ['reader'] } },
  { id: 'account', path: 'tai-khoan', to: `${DUONG_DAN_UNG_DUNG}/tai-khoan`, title: 'Tài khoản', icon: UserRound, status: 'implemented' },
  { id: 'admin', path: 'admin', to: `${DUONG_DAN_UNG_DUNG}/admin`, title: 'Tổng quan Admin', icon: ShieldCheck, status: 'implemented', yeuCauTruyCap: { vaiTro: ['admin'] } },
  { id: 'users', path: 'nguoi-dung', to: `${DUONG_DAN_UNG_DUNG}/nguoi-dung`, title: 'Quản lý người dùng', icon: Users, status: 'implemented', yeuCauTruyCap: { quyen: ['user_manage'] } },
  { id: 'statistics', path: 'thong-ke', to: `${DUONG_DAN_UNG_DUNG}/thong-ke`, title: 'Thống kê', icon: ChartColumn, status: 'implemented', yeuCauTruyCap: { quyen: ['report_view'] } },
  { id: 'forecasts', path: 'du-bao', to: `${DUONG_DAN_UNG_DUNG}/du-bao`, title: 'Dự báo tần suất', icon: TrendingUp, status: 'implemented', yeuCauTruyCap: { quyen: ['forecast_view'] } },
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
    { id: 'health', label: 'Kiểm tra nền tảng', to: '/kiem-tra-nen-tang', icon: HeartPulse, end: true },
    { id: 'design-system', label: 'Design System', to: '/design-system', icon: Palette, end: true },
  ] },
]

export const thuongHieuUngDung = { name: 'LibriFlow', caption: 'Warm Wooden Library', icon: BookOpen }
