import { Link } from 'react-router'

export default function TrangKhongTimThay() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-12">
      <h1 className="text-3xl font-semibold">Không tìm thấy trang</h1>
      <p>Trang bạn tìm không tồn tại hoặc đã thay đổi đường dẫn.</p>
      <Link className="underline" to="/">Về trang chủ</Link>
    </main>
  )
}
