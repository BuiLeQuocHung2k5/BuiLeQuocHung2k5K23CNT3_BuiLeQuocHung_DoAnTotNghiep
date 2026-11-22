import bcrypt from 'bcryptjs'
import { dichNgayUtc } from '../src/utils/thuat-toan-du-bao.js'
import { kiemTraSuKienSuDung } from '../src/utils/kiem-tra-thong-ke.js'

const sach = [
  ['Don Quijote', 'Miguel de Cervantes'], ['Đồi gió hú', 'Emily Brontë', '9780141439556'],
  ['Dế Mèn phiêu lưu ký', 'Tô Hoài'], ['Lão Hạc', 'Nam Cao'], ['Truyện Kiều', 'Nguyễn Du'],
  ['Hai đứa trẻ', 'Thạch Lam'], ['Kiêu hãnh và định kiến', 'Jane Austen'], ['Hoàng tử bé', 'Antoine de Saint-Exupéry'],
  ['Hai vạn dặm dưới biển', 'Jules Verne'], ['Alice ở xứ sở thần tiên', 'Lewis Carroll']
]

async function themPhieu(db, nguoi, banSao, muon, tra, han) {
  const [[copy]] = await db.execute('SELECT availability_status, condition_status FROM BanSaoSach WHERE copy_id=? FOR UPDATE', [banSao])
  if (copy?.availability_status !== 'available' || copy.condition_status !== 'good') return false
  const [giaoNhau] = await db.execute(`SELECT d.copy_id FROM ChiTietPhieuMuon d JOIN PhieuMuon p USING (borrow_id)
    WHERE d.copy_id=? AND p.borrow_date <= ? AND (d.returned_at IS NULL OR d.returned_at >= ?) LIMIT 1`, [banSao, tra ?? '9999-12-31', muon])
  if (giaoNhau.length) return false
  const tinhTrang = tra ? 'returned' : 'borrowed'
  const [p] = await db.execute('INSERT INTO PhieuMuon(user_id,borrow_date,due_date,status,note,created_at) VALUES(?,?,?,?,?,?)',
    [nguoi, muon, han, tinhTrang, 'Dữ liệu trình diễn LibriFlow', muon])
  await db.execute('INSERT INTO ChiTietPhieuMuon(borrow_id,copy_id,returned_at,condition_after,status) VALUES(?,?,?,?,?)',
    [p.insertId, banSao, tra, tra ? 'good' : null, tinhTrang])
  if (!tra) await db.execute("UPDATE BanSaoSach SET availability_status='borrowed' WHERE copy_id=?", [banSao])
  for (const [type, ngay] of [['borrow', muon], ['return', tra]]) {
    if (!ngay) continue
    const event = kiemTraSuKienSuDung({ user_id: String(nguoi), copy_id: String(banSao), borrow_id: String(p.insertId), action_type: type })
    await db.execute('INSERT INTO LichSuSuDung(user_id,copy_id,action_type,action_date,details) VALUES(?,?,?,?,?)',
      [nguoi, banSao, type, ngay, event.details])
  }
  return true
}

export async function taoDuLieu(db, taiKhoan, homNay) {
  const ngayDau = dichNgayUtc(homNay, -28)
  const [[moc]] = await db.query("SELECT description FROM NhatKyHeThong WHERE action='fe14_seed_day' ORDER BY log_id DESC LIMIT 1")
  if (!moc) {
    const [[cu]] = await db.query('SELECT (SELECT COUNT(*) FROM NguoiDung)+(SELECT COUNT(*) FROM Sach)+(SELECT COUNT(*) FROM PhieuMuon) AS n')
    if (Number(cu.n)) throw Error('DEMO_NOT_EMPTY')
    for (const [role, thongTin] of Object.entries(taiKhoan)) {
      const taoLuc = (role === 'librarian' ? homNay : dichNgayUtc(ngayDau, -1)) + ' 00:00:00'
      const [r] = await db.execute('INSERT INTO NguoiDung(name,email,password,created_at,updated_at) VALUES(?,?,?,?,?)',
        [thongTin.name, thongTin.email, await bcrypt.hash(thongTin.password, 12), taoLuc, taoLuc])
      const [gan] = await db.execute('INSERT INTO NguoiDung_VaiTro SELECT ?,role_id FROM VaiTro WHERE name=?', [r.insertId, role])
      if (gan.affectedRows !== 1) throw Error('DEMO_ROLE_MISSING')
    }
    let stt = 0
    for (const [title, author, isbn = null] of sach) {
      const [r] = await db.execute('INSERT INTO Sach(title,author,isbn,created_at) VALUES(?,?,?,?)', [title, author, isbn, ngayDau])
      for (let i = 0; i < 2; i++) await db.execute('INSERT INTO BanSaoSach(book_id,barcode,created_at) VALUES(?,?,?)',
        [r.insertId, 'LF-DEMO-' + String(++stt).padStart(3, '0'), ngayDau])
    }
  }
  const [[docGia]] = await db.execute('SELECT user_id FROM NguoiDung WHERE email=?', [taiKhoan.reader.email])
  const [[admin]] = await db.execute('SELECT user_id FROM NguoiDung WHERE email=?', [taiKhoan.admin.email])
  const [banSao] = await db.query("SELECT copy_id FROM BanSaoSach WHERE barcode IN ('LF-DEMO-001','LF-DEMO-002','LF-DEMO-003') ORDER BY barcode")
  if (!docGia || !admin || banSao.length !== 3) throw Error('DEMO_FIXTURES_MISSING')
  // Chỉ bổ sung ngày vừa khép lại; bỏ qua khung giờ bản sao đã có người mượn.
  const homQua = dichNgayUtc(homNay, -1)
  const batDau = moc ? [ngayDau, dichNgayUtc(moc.description, 1)].sort().at(-1) : ngayDau
  for (let ngay = batDau; ngay <= homQua; ngay = dichNgayUtc(ngay, 1)) {
    const soPhieu = [0, 1, 2, 1, 0, 2, 2][new Date(ngay).getUTCDay()]
    for (let i = 0; i < soPhieu; i++) {
      await themPhieu(db, docGia.user_id, banSao[0].copy_id, ngay + (i ? ' 14:00:00' : ' 08:00:00'),
        ngay + (i ? ' 16:00:00' : ' 10:00:00'), dichNgayUtc(ngay, 7))
    }
  }
  if (!moc) {
    for (const [user, copy] of [[docGia, banSao[1]], [admin, banSao[2]]]) {
      if (!await themPhieu(db, user.user_id, copy.copy_id, homQua + ' 11:00:00', null, dichNgayUtc(homNay, 6))) throw Error('DEMO_OPEN_LOAN_FAILED')
    }
  }
  if (!moc || moc.description !== homQua) {
    await db.execute("INSERT INTO NhatKyHeThong(action,description) VALUES('fe14_seed_day',?)", [homQua])
  }
  // Đối chiếu hai chiều giữa sổ phiếu và sự kiện mượn trong schema demo do script sở hữu.
  const [[audit]] = await db.execute(`SELECT
    (SELECT COUNT(*) FROM PhieuMuon p WHERE p.borrow_date >= ? AND p.borrow_date < ? AND p.status <> 'cancelled'
     AND (NOT EXISTS (SELECT 1 FROM ChiTietPhieuMuon d WHERE d.borrow_id=p.borrow_id)
       OR EXISTS (SELECT 1 FROM ChiTietPhieuMuon d WHERE d.borrow_id=p.borrow_id AND NOT EXISTS
         (SELECT 1 FROM LichSuSuDung l WHERE l.action_type='borrow' AND l.user_id=p.user_id AND l.copy_id=d.copy_id
          AND DATE(l.action_date)=DATE(p.borrow_date) AND l.details->>'$.borrow_id'=CAST(p.borrow_id AS CHAR))))) AS thieu,
    (SELECT COUNT(*) FROM LichSuSuDung l WHERE l.action_type='borrow' AND l.action_date>=? AND l.action_date<?
     AND NOT EXISTS (SELECT 1 FROM PhieuMuon p JOIN ChiTietPhieuMuon d USING(borrow_id)
       WHERE p.borrow_id=l.details->>'$.borrow_id' AND d.copy_id=l.copy_id AND p.user_id=l.user_id)) AS du`,
    [ngayDau, homNay, ngayDau, homNay])
  if (Number(audit.thieu) || Number(audit.du)) throw Error('DEMO_COVERAGE_MISMATCH')
  return { start_date: ngayDau, end_date: homQua }
}
