// null cho ISBN để trống, undefined khi sai định dạng hoặc sai số kiểm tra.
export function chuanHoaIsbn(giaTri) {
  if (giaTri == null) return null
  if (typeof giaTri !== 'string') return undefined
  const chuoi = giaTri.trim()
  if (!chuoi) return null
  const ma = chuoi.replace(/[ -]/g, '').toUpperCase()
  if (/^[0-9]{9}[0-9X]$/.test(ma)) {
    const tong = [...ma].reduce((t, so, i) => t + (so === 'X' ? 10 : Number(so)) * (10 - i), 0)
    if (tong % 11 === 0) return ma
  }
  if (/^97[89][0-9]{10}$/.test(ma)) {
    const tong = [...ma].reduce((t, so, i) => t + Number(so) * (i % 2 ? 3 : 1), 0)
    if (tong % 10 === 0) return ma
  }
  return undefined
}
