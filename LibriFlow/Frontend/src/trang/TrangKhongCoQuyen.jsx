import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { The, NoiDungThe } from '../thanh-phan/giao-dien/The.jsx'
import NutBam from '../thanh-phan/giao-dien/NutBam.jsx'
import BieuTuong from '../thanh-phan/giao-dien/BieuTuong.jsx'

export default function TrangKhongCoQuyen() {
  const dieuHuong = useNavigate()
  useEffect(() => {
    const tieuDeCu = document.title
    document.title = '403 · LibriFlow'
    return () => { document.title = tieuDeCu }
  }, [])
  return <main className="mx-auto max-w-2xl px-6 py-12" aria-labelledby="tieu-de-khong-co-quyen">
    <The><NoiDungThe className="space-y-6 py-8">
      <BieuTuong icon={ShieldAlert} size={36} className="text-primary" />
      <h1 id="tieu-de-khong-co-quyen" className="font-serif text-2xl leading-snug">403 — Bạn không có quyền truy cập trang này.</h1>
      <p className="text-foreground-muted">Bạn có thể quay về trang chính hoặc liên hệ thư viện nếu cần được cấp quyền.</p>
      <NutBam onClick={() => dieuHuong('/app', { replace: true })} icon={<BieuTuong icon={ArrowLeft} />}>Về trang chính</NutBam>
    </NoiDungThe></The>
  </main>
}
