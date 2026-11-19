// Không đoán URL khi chưa cấu hình; ứng dụng vẫn render để hướng dẫn thiết lập.
export function readEnvironment(values) {
  const raw = values.VITE_API_BASE_URL?.trim()
  const message = 'Đặt VITE_API_BASE_URL thành origin HTTP(S), không kèm /api, query hoặc thông tin đăng nhập.'
  if (!raw) return { apiBaseUrl: null, error: 'Chưa cấu hình VITE_API_BASE_URL. Xem Frontend/.env.example.' }

  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/') {
      return { apiBaseUrl: null, error: message }
    }
    return { apiBaseUrl: `${url.origin}/api`, error: null }
  } catch {
    return { apiBaseUrl: null, error: message }
  }
}

export const environment = readEnvironment(import.meta.env)
