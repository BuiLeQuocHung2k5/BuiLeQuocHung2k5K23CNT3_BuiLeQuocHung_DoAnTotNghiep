import { useState } from 'react'
import { UserRound } from 'lucide-react'
import BieuTuong from '../../thanh-phan/giao-dien/BieuTuong.jsx'
import { moiTruong } from '../../cau-hinh/moi-truong.js'
import '../../kieu-dang/ho-so.css'

// Avatar trong hồ sơ chỉ có thể trỏ tới tệp do Backend tạo.
const DUONG_DAN_ANH = /^\/api\/auth\/avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/

export default function AnhDaiDien({ avatar, lon = false }) {
  const [anhLoi, datAnhLoi] = useState(null)
  const url = moiTruong.apiBaseUrl && typeof avatar === 'string' && DUONG_DAN_ANH.test(avatar)
    ? new URL(avatar, moiTruong.apiBaseUrl).href
    : null
  return <span className={`profile-avatar${lon ? ' profile-avatar--large' : ''}`}>
    {url && url !== anhLoi
      ? <img src={url} alt="Ảnh đại diện" onError={() => datAnhLoi(url)} />
      : <BieuTuong icon={UserRound} size={lon ? 42 : 18} />}
  </span>
}
