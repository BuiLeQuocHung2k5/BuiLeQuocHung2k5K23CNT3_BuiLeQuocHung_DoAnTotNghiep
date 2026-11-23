// Chạy thủ công trên demo sau migration. Mọi fixture nằm trong một transaction rollback.
import assert from 'node:assert/strict'
import mysql from 'mysql2/promise'
import { docCauHinh } from '../demo/cau-hinh.mjs'

const { host, port, user, password, database, uuid } = await docCauHinh()
const db = await mysql.createConnection({ host, port, user, password, database, dateStrings: true })
const invalid = (query, args, ...codes) => assert.rejects(db.execute(query,args), error => codes.includes(error.errno))
try {
  const [[ctx]] = await db.query('SELECT DATABASE() db, @@server_uuid uuid')
  assert.equal(ctx.db,'libriflow_demo')
  assert.equal(ctx.uuid,uuid)
  const [tables] = await db.query('SHOW FULL TABLES')
  assert.equal(tables.filter(row => row.Table_type === 'BASE TABLE').length,18)
  // ID 0 dành riêng cho transaction thử; INSERT dừng nếu có xung đột.
  await db.query("SET SESSION sql_mode=CONCAT_WS(',',@@sql_mode,'NO_AUTO_VALUE_ON_ZERO')")
  await db.beginTransaction()
  try {
    await db.execute("INSERT INTO NguoiDung(user_id,name,email,password) VALUES(0,'Migration test','tx-migration-01@example.invalid','!')")
    const [[period]] = await db.query("SELECT DATE_FORMAT(UTC_DATE(),'%Y-%m-01') month_start")
    const fee = 'INSERT INTO PhiDuyTriThe(user_id,billing_month,amount,due_date) VALUES(?,?,?,?)'
    const args = [0,period.month_start,20000,period.month_start]
    await invalid(fee,[0,period.month_start,19999,period.month_start],3819)
    await invalid(fee,[0,period.month_start.slice(0,8)+'02',20000,period.month_start.slice(0,8)+'02'],3819)
    const [f] = await db.execute(fee,args)
    await invalid(fee,args,1062)
    const [[detail]] = await db.query('SELECT borrow_detail_id FROM ChiTietPhieuMuon ORDER BY borrow_detail_id LIMIT 1')
    assert(detail,'Cần ít nhất một chi tiết phiếu demo')
    await db.execute("INSERT INTO Phat(fine_id,borrow_detail_id,fine_type,amount) VALUES(0,?,'late',2000)",[detail.borrow_detail_id])
    const collect = "INSERT INTO GiaoDichThu(card_fee_id,fine_id,amount,payment_method,collected_by) VALUES(?,?,?,'cash',?)"
    await invalid(collect,[null,null,20000,0],3819)
    await invalid(collect,[f.insertId,0,20000,0],3819)
    await invalid(collect,[f.insertId,null,0,0],3819)
    await invalid(collect,[f.insertId,null,10000,0],1644)
    await invalid(collect,[null,0,3000,0],1644)
    await invalid(collect,[f.insertId,null,20000,'18446744073709551615'],1216,1452)
    const [[before]] = await db.execute('SELECT payment_status FROM PhiDuyTriThe WHERE card_fee_id=?',[f.insertId])
    assert.equal(before.payment_status,'unpaid')
    await db.query('SAVEPOINT before_collection')
    async function settleBoth() {
      await db.execute(collect,[f.insertId,null,20000,0])
      await db.execute(collect,[null,0,2000,0])
    }
    await settleBoth()
    const [[paid]] = await db.execute(`SELECT p.payment_status fine_status,p.paid_at=g.collected_at same_time,
      (SELECT payment_status FROM PhiDuyTriThe WHERE card_fee_id=?) fee_status
      FROM Phat p JOIN GiaoDichThu g USING(fine_id) WHERE p.fine_id=0`,[f.insertId])
    assert.deepEqual({...paid},{fine_status:'paid',same_time:1,fee_status:'paid'})
    await invalid(collect,[f.insertId,null,20000,0],1062)
    await invalid(collect,[null,0,2000,0],1062)
    await invalid('DELETE FROM NguoiDung WHERE user_id=0',[],1217,1451)
    await invalid('DELETE FROM Phat WHERE fine_id=0',[],1217,1451)
    await invalid('UPDATE GiaoDichThu SET amount=1 WHERE fine_id=0',[],1644)
    await invalid('DELETE FROM GiaoDichThu WHERE fine_id=0',[],1644)
    await db.query('ROLLBACK TO SAVEPOINT before_collection')
    const [[after]] = await db.query("SELECT payment_status,paid_at FROM Phat WHERE fine_id=0")
    assert.deepEqual({...after},{payment_status:'unpaid',paid_at:null})
    await settleBoth() // Cả khoản phí, khoản phạt và hai khóa UNIQUE đã được rollback.
  } finally { await db.rollback() }
  console.log('Đạt: 18 bảng, CHECK/FK/UNIQUE, thu đủ, chặn thu trùng, bảo toàn chứng từ và rollback.')
} finally { await db.end() }
