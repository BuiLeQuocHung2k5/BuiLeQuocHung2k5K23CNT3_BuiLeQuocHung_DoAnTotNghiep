import { BookOpen, Copy, FolderTree, HandCoins, History, LibraryBig, NotebookPen, PanelsTopLeft, UserRound, UsersRound } from 'lucide-react'

const cacKhuVuc = {
  books: { id: 'books', label: 'Quản lý sách', icon: BookOpen },
  categories: { id: 'categories', label: 'Danh mục', icon: FolderTree },
  copies: { id: 'copies', label: 'Bản sao', icon: Copy },
  borrowing: { id: 'borrowing', label: 'Phiếu mượn', icon: NotebookPen },
  fines: { id: 'fines', label: 'Tiền phạt', icon: HandCoins },
  users: { id: 'users', label: 'Người dùng', icon: UsersRound },
  reports: { id: 'reports', label: 'Thống kê', icon: PanelsTopLeft },
  discovery: { id: 'discovery', label: 'Tra cứu sách', icon: LibraryBig },
  myBorrowing: { id: 'my-borrowing', label: 'Phiếu mượn cá nhân', icon: NotebookPen },
  history: { id: 'history', label: 'Lịch sử cá nhân', icon: History },
  profile: { id: 'profile', label: 'Hồ sơ', icon: UserRound },
}

// Tên role đối chiếu FE-01; đây là ý tưởng bố cục, không phải grants hoặc user session.
export const boCucVaiTroXemThu = {
  admin: { label: 'Admin — Quản trị viên', description: 'Dự kiến nhóm công cụ quản trị và vận hành.', areas: ['books', 'categories', 'copies', 'borrowing', 'fines', 'users', 'reports'] },
  librarian: { label: 'Librarian — Thủ thư', description: 'Dự kiến nhóm công cụ phục vụ công việc thư viện.', areas: ['books', 'copies', 'borrowing', 'fines', 'reports'] },
  reader: { label: 'Reader — Bạn đọc', description: 'Dự kiến nhóm tra cứu và thông tin của chính bạn đọc.', areas: ['discovery', 'myBorrowing', 'history', 'profile'] },
}

export function layDieuHuongVaiTroXemThu(tenVaiTro) {
  const banXemThu = boCucVaiTroXemThu[tenVaiTro]
  if (!banXemThu) return []
  return [{ id: 'planned', label: 'Nhóm điều hướng dự kiến', items: banXemThu.areas.map(id => ({ ...cacKhuVuc[id], status: 'planned' })) }]
}
