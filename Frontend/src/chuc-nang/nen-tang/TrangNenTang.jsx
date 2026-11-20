import { useMutation } from '@tanstack/react-query'
import { moiTruong } from "../../cau-hinh/moi-truong.js"
import { kiemTraSucKhoe } from "./api-suc-khoe.js"
import { Link } from 'react-router'

export default function TrangNenTang() {
  // Thao tác kỹ thuật do người dùng chủ động bấm; không polling hoặc gọi khi mount.
  const sucKhoe = useMutation({
    mutationFn: () => kiemTraSucKhoe(),
    retry: false,
  })
  const sucKhoeHopLe = sucKhoe.data?.data?.success === true &&
    typeof sucKhoe.data?.data?.message === 'string'

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <div>
        <p className="text-sm text-neutral-600">FE-02 · Trang kiểm tra kỹ thuật</p>
        <h1 className="mt-2 text-3xl font-semibold">Nền tảng LibriFlow</h1>
      </div>
      <p>React, routing và nền tảng CSS đã sẵn sàng. Đây chưa phải giao diện nghiệp vụ hoặc thiết kế cuối cùng.</p>
      <Link className="inline-flex min-h-11 items-center text-primary underline" to="/design-system">Xem Design System Warm Wooden Library →</Link>
      <Link className="flex min-h-11 items-center text-primary underline" to="/app">Mở khung ứng dụng FE-04 →</Link>
      <section aria-labelledby="health-heading" className="space-y-3">
        <h2 id="health-heading" className="text-xl font-medium">Kết nối Backend</h2>
        {moiTruong.error ? <p role="status">{moiTruong.error}</p> : (
          <>
            <p className="break-all text-sm">API: {moiTruong.apiBaseUrl}</p>
            <button
              type="button"
              className="rounded border border-neutral-400 px-4 py-2 disabled:opacity-50"
              disabled={sucKhoe.isPending}
              onClick={() => sucKhoe.mutate()}
            >
              {sucKhoe.isPending ? 'Đang kiểm tra…' : 'Kiểm tra health'}
            </button>
          </>
        )}
        <div role="status" aria-live="polite">
          {sucKhoe.isSuccess && (sucKhoeHopLe ? sucKhoe.data.data.message : 'Phản hồi health không đúng định dạng đã xác minh.')}
          {sucKhoe.isError && (sucKhoe.error.response
            ? `Backend trả HTTP ${sucKhoe.error.response.status}. Kiểm tra cấu hình và trạng thái dịch vụ.`
            : 'Chưa kết nối được Backend. Frontend vẫn hoạt động; kiểm tra URL, mạng hoặc CORS.')}
        </div>
      </section>
    </main>
  )
}
