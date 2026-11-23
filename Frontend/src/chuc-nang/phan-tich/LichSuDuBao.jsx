import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ketNoiHttp } from '../../thu-vien/api/ket-noi-http.js'
import { loiPhanTich, cotDuBao } from './dich-vu-phan-tich.js'
import ONhap from '../../thanh-phan/giao-dien/ONhap.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'

function cauHinh(phien, signal) {
  return { signal, headers: { Authorization: 'Bearer '+phien.tokenTruyCap } }
}
export function TraCuuDuBao({ phien, chon }) {
  const [nhap, datNhap] = useState('')
  const [tuKhoa, tim] = useState('')
  const quanLy = phien.nguoiDung.permissions.includes('user_manage')
  const kq = useQuery({
    queryKey: ['du-bao-tra-cuu', phien.nguoiDung.user_id, tuKhoa, quanLy],
    enabled: Boolean(tuKhoa), retry: false,
    queryFn: async ({signal}) => (await ketNoiHttp.get(quanLy ? '/admin/users' : '/forecasts/lookup', {
      ...cauHinh(phien,signal), params: {search:tuKhoa}
    })).data.data,
  })
  return <section><form onSubmit={e => { e.preventDefault(); tim(nhap.trim()) }}>
    <ONhap label="Tên hoặc email người dùng" value={nhap} maxLength={100} onChange={e=>datNhap(e.target.value)} />
    <NutBam type="submit" disabled={!nhap.trim()}>Tìm người dùng</NutBam>
  </form>{tuKhoa && (kq.isPending ? <p>Đang tìm…</p> : kq.isError ? <p role="alert">{loiPhanTich(kq.error)}</p> :
    kq.data.length ? <ul>{kq.data.map(u=><li key={u.user_id}><button type="button" onClick={()=>chon(u.user_id)}>{u.name} · #{u.user_id} · {u.roles.join(', ')}</button></li>)}</ul> : <p>Không tìm thấy người dùng.</p>)}</section>
}



export function LichSuDuBao({ phien, ma, choLuu }) {
  const [mo, datMo] = useState(false)
  const [ngay, datNgay] = useState('')
  const client = useQueryClient()
  const khoa = ['lich-su-sma7',phien.nguoiDung.user_id,ma]
  const url = (ma === phien.nguoiDung.user_id ? '/forecasts/me' : '/forecasts/users/'+ma)+'/history'
  const ds = useQuery({queryKey:khoa,enabled:mo,queryFn:async({signal})=>(await ketNoiHttp.get(url,cauHinh(phien,signal))).data.data})
  const chiTiet = useQuery({queryKey:[...khoa,ngay],enabled:mo && Boolean(ngay),queryFn:async({signal})=>(await ketNoiHttp.get(url+'/'+ngay,cauHinh(phien,signal))).data.data})
  const luu = useMutation({mutationFn:async()=>(await ketNoiHttp.post('/forecasts/users/'+ma+'/generate',{},cauHinh(phien))).data.data,
    onSuccess:async()=>{ datMo(true); await client.invalidateQueries({queryKey:khoa}) }})
  return <section><h3>Lịch sử dự báo SMA7</h3>
    {choLuu && <NutBam disabled={luu.isPending} onClick={()=>luu.mutate()}>Lưu dự báo</NutBam>}
    <NutBam onClick={()=>datMo(!mo)}>{mo?'Ẩn lịch sử':'Xem lịch sử'}</NutBam>
    {luu.isSuccess && <p role="status">{luu.data.created?'Đã lưu dự báo.':'Đã có kết quả cho ngày cắt này.'}</p>}
    {luu.isError && <p role="alert">{loiPhanTich(luu.error)}</p>}
    {mo && (ds.isError ? <p role="alert">{loiPhanTich(ds.error)}</p> : ds.isPending ? <p>Đang tải…</p> :
      ds.data.length ? <ul>{ds.data.map(r=><li key={r.cutoff_date}><button onClick={()=>datNgay(r.cutoff_date)}>Ngày cắt {r.cutoff_date} · Tạo lúc {r.created_at}</button></li>)}</ul> : <p>Chưa có dự báo đã lưu.</p>)}
    {mo && ngay && (chiTiet.isError ? <p role="alert">{loiPhanTich(chiTiet.error)}</p> : chiTiet.data && <Bang caption={'Dự báo đã lưu ngày '+ngay} rows={chiTiet.data} rowKey="forecast_date" columns={cotDuBao}/>)}
  </section>
}
