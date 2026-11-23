import { useState } from 'react'
import Bang from '../../thanh-phan/giao-dien/Bang.jsx'
import DanhSachChon from '../../thanh-phan/giao-dien/DanhSachChon.jsx'
import NutBam from '../../thanh-phan/giao-dien/NutBam.jsx'
import OChon from '../../thanh-phan/giao-dien/OChon.jsx'
import { trangThaiPhieu } from './dich-vu-muon-tra.js'

const tinhTrang = [{ value: 'good', label: 'Tốt' }, { value: 'damaged', label: 'Hư hỏng' }]
const trangThaiChiTiet = { borrowed: 'Chưa trả', returned: 'Đã trả', lost: 'Bị mất' }
export default function ChiTietPhieuMuon({ phieu, duQuyen, dangGui, chuaRo, onReturn }) {
  const [daChon, datDaChon] = useState({})
  const [tinhTrangChung, datTinhTrangChung] = useState('good')
  const [xacNhan, datXacNhan] = useState(null)
  const coTheTra = ['borrowed', 'partially_returned', 'overdue'].includes(phieu.status)
  const chuaTra = phieu.details.filter(m => m.status === 'borrowed' && m.returned_at === null)
  const khoa = !duQuyen || dangGui || chuaRo || !coTheTra
  const items = Object.entries(daChon).map(([copy_id, condition_after]) => ({ copy_id, condition_after }))
  const cacCot = [
    { key: 'copy_id', header: 'Mã bản sao', render: ma => `#${ma}` },
    { key: 'condition_before', header: 'Khi mượn', render: giaTri => tinhTrang.find(m => m.value === giaTri)?.label ?? giaTri },
    { key: 'status', header: 'Trạng thái', render: giaTri => trangThaiChiTiet[giaTri] ?? giaTri },
    { key: 'returned_at', header: 'Ngày trả (UTC)', render: giaTri => giaTri ?? '—' },
    { key: 'condition_after', header: 'Khi trả', render: giaTri => tinhTrang.find(m => m.value === giaTri)?.label ?? '—' },
  ]
  if (duQuyen && coTheTra) cacCot.push({ key: 'chon', header: 'Ghi nhận trả', render: (_, muc) => muc.status === 'borrowed' && muc.returned_at === null ? <div className="borrow-return-choice">
    <OChon label={`Trả bản sao ${muc.copy_id}`} checked={Object.hasOwn(daChon, muc.copy_id)} disabled={khoa || Boolean(xacNhan)} onChange={e => datDaChon(cu => {
      const moi = { ...cu }; if (e.target.checked) moi[muc.copy_id] = 'good'; else delete moi[muc.copy_id]; return moi
    })} />
    <DanhSachChon label={`Tình trạng trả bản sao ${muc.copy_id}`} value={daChon[muc.copy_id] ?? 'good'} options={tinhTrang} disabled={khoa || !Object.hasOwn(daChon, muc.copy_id) || Boolean(xacNhan)} onChange={e => datDaChon(cu => ({ ...cu, [muc.copy_id]: e.target.value }))} />
  </div> : '—' })
  return <section className="borrow-form" aria-label={`Chi tiết phiếu ${phieu.borrow_id}`}>
    <dl className="borrow-facts">{[['Mã phiếu', `#${phieu.borrow_id}`], ['Độc giả', `#${phieu.user_id}`], ['Ngày mượn (UTC)', phieu.borrow_date], ['Hạn trả (UTC)', phieu.due_date], ['Trạng thái', trangThaiPhieu[phieu.status]]].map(([nhan, giaTri]) => <div key={nhan}><dt>{nhan}</dt><dd>{giaTri}</dd></div>)}</dl>
    {phieu.note && <p className="borrow-note">Ghi chú: {phieu.note}</p>}
    <Bang caption="Bản sao trong phiếu" columns={cacCot} rows={phieu.details} rowKey="borrow_detail_id" emptyTitle="Phiếu chưa có chi tiết" />
    {duQuyen && coTheTra && chuaTra.length > 0 && !xacNhan && <>
      <div className="borrow-actions"><NutBam variant="outline" disabled={khoa} onClick={() => datDaChon(Object.fromEntries(chuaTra.map(m => [m.copy_id, 'good'])))}>Chọn tất cả bản sao chưa trả</NutBam>
        <NutBam disabled={khoa || !items.length || items.length > 100} onClick={() => datXacNhan({ items })}>Trả bản sao đã chọn ({items.length})</NutBam></div>
      <div className="borrow-actions"><DanhSachChon label="Tình trạng chung khi trả toàn bộ" value={tinhTrangChung} options={tinhTrang} disabled={khoa} onChange={e => datTinhTrangChung(e.target.value)} />
        <NutBam variant="outline" disabled={khoa || phieu.details.some(m => m.status === 'lost')} onClick={() => datXacNhan({ return_all: true, condition_after: tinhTrangChung })}>Trả toàn bộ phiếu</NutBam></div>
    </>}
    {xacNhan && <div className="borrow-confirm" role="region" aria-label="Xác nhận trả sách"><h3>Xác nhận ghi nhận trả</h3>
      <p>Phiếu #{phieu.borrow_id} — độc giả #{phieu.user_id}</p>
      {xacNhan.return_all ? <p>Trả toàn bộ bản sao chưa trả. Tình trạng chung: {tinhTrang.find(m => m.value === xacNhan.condition_after).label}.</p> : <ul>{xacNhan.items.map(m => <li key={m.copy_id}>Bản sao #{m.copy_id}: {tinhTrang.find(t => t.value === m.condition_after).label}</li>)}</ul>}
      <div className="borrow-actions"><NutBam variant="outline" disabled={dangGui || chuaRo} onClick={() => datXacNhan(null)}>Quay lại lựa chọn</NutBam><NutBam loading={dangGui} disabled={khoa} onClick={() => onReturn(xacNhan)}>Xác nhận trả sách</NutBam></div>
    </div>}
  </section>
}
