import { ketNoiHttp } from "../../thu-vien/api/ket-noi-http.js"

export function kiemTraSucKhoe({ signal: tinHieu } = {}) {
  return ketNoiHttp.get('/health', { signal: tinHieu })
}
