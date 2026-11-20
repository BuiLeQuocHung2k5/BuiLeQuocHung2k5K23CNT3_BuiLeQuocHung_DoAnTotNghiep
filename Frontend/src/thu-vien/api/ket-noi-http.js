import axios from 'axios'
import { moiTruong } from "../../cau-hinh/moi-truong.js"

export const ketNoiHttp = axios.create({
  baseURL: moiTruong.apiBaseUrl ?? undefined,
  timeout: 10000,
  withCredentials: false,
  headers: { Accept: 'application/json' },
})

// Chặn request sai cấu hình thay vì vô tình gửi tới origin của Vite.
ketNoiHttp.interceptors.request.use((cauHinh) => {
  if (moiTruong.error) throw new Error(moiTruong.error)
  return cauHinh
})

// Giữ nguyên AxiosResponse/AxiosError: status, headers, envelope, details và cause.
// Chưa có interceptor token/refresh, redirect phiên hoặc retry.
