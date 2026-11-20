import axios from 'axios'

const cacThongBao = {
  400: 'Dữ liệu yêu cầu chưa hợp lệ.', 401: 'Yêu cầu cần xác thực hợp lệ.',
  403: 'Không có quyền thực hiện yêu cầu.', 404: 'Không tìm thấy tài nguyên.',
  409: 'Dữ liệu đã thay đổi hoặc có xung đột.', 429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
}

// UI chỉ nhận thông tin an toàn. Transport/cause gốc không bị sửa hoặc serialize ra UI.
export function chuanHoaLoiApi(loi) {
  const trangThaiHttp = Number.isInteger(loi?.response?.status) ? loi.response.status : null
  const daBiHuy = axios.isCancel(loi) || loi?.code === 'ERR_CANCELED'
  const quaThoiGianCho = !daBiHuy && ['ECONNABORTED', 'ETIMEDOUT'].includes(loi?.code)
  const loiMang = !trangThaiHttp && !daBiHuy && !quaThoiGianCho && loi?.code === 'ERR_NETWORK'
  const maLoiBackend = loi?.response?.data?.error?.code
  const ma = typeof maLoiBackend === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(maLoiBackend)
    ? maLoiBackend : daBiHuy ? 'REQUEST_CANCELLED' : quaThoiGianCho ? 'REQUEST_TIMEOUT'
      : loiMang ? 'NETWORK_ERROR' : trangThaiHttp ? 'HTTP_ERROR' : 'CLIENT_ERROR'
  const thongBao = daBiHuy ? 'Yêu cầu đã được hủy.' : quaThoiGianCho ? 'Yêu cầu quá thời gian chờ.'
    : loiMang ? 'Không kết nối được dịch vụ. Kiểm tra mạng, URL hoặc CORS.'
      : cacThongBao[trangThaiHttp] ?? (trangThaiHttp >= 500 ? 'Dịch vụ tạm thời chưa sẵn sàng.' : 'Không thể hoàn tất yêu cầu. Kiểm tra cấu hình dịch vụ.')
  const chiTietGoc = loi?.response?.data?.error?.details
  const chiTiet = Array.isArray(chiTietGoc) ? chiTietGoc.slice(0, 20)
    .filter(muc => typeof muc?.field === 'string' && /^[a-zA-Z_][a-zA-Z0-9_.]{0,63}$/.test(muc.field))
    .map(muc => ({ field: muc.field, message: 'Kiểm tra giá trị của trường này.' })) : []
  return Object.defineProperty({ status: trangThaiHttp, code: ma, message: thongBao, details: chiTiet, isNetworkError: loiMang, isCancelled: daBiHuy, isTimeout: quaThoiGianCho }, 'cause', { value: loi })
}
