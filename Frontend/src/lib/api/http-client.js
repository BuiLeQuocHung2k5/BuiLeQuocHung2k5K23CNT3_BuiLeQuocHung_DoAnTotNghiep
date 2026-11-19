import axios from 'axios'
import { environment } from '../../config/environment.js'

export const httpClient = axios.create({
  baseURL: environment.apiBaseUrl ?? undefined,
  timeout: 10000,
  withCredentials: false,
  headers: { Accept: 'application/json' },
})

// Chặn request sai cấu hình thay vì vô tình gửi tới origin của Vite.
httpClient.interceptors.request.use((config) => {
  if (environment.error) throw new Error(environment.error)
  return config
})

// Giữ nguyên AxiosResponse/AxiosError: status, headers, envelope, details và cause.
// Chưa có interceptor token/refresh, redirect phiên hoặc retry.
