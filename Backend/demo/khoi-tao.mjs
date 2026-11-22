import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { database, user, thuMuc, tepCauHinh, tepDoPhu, docCauHinh } from './cau-hinh.mjs'
import { taoDuLieu } from './du-lieu.mjs'

const ngauNhien = () => randomBytes(32).toString('base64url')
const tepDangNhap = new URL('tai-khoan.json', thuMuc)
let admin, db
// Không thực thi USE hoặc CREATE DATABASE của schema/seed gốc.
async function khoiTaoBang(ketNoi, tep, tieuDe, loai) {
  const sql = (await readFile(new URL(tep, import.meta.url), 'utf8')).replaceAll('\r\n', '\n')
  if (!sql.startsWith(tieuDe)) throw Error('DEMO_SQL_HEADER_CHANGED')
  for (const cau of sql.slice(tieuDe.length).split(';').map(s => s.trim()).filter(Boolean)) {
    if (!cau.startsWith(loai)) throw Error('DEMO_SQL_UNREVIEWED')
    await ketNoi.query(cau)
  }
}

try {
  const env = { ...dotenv.parse(await readFile(new URL('../.env', import.meta.url))), ...process.env }
  const host = env.DB_HOST || '127.0.0.1', port = Number(env.DB_PORT || 3306)
  if (!['127.0.0.1', 'localhost'].includes(host)) throw Error('DEMO_LOOPBACK_REQUIRED')
  admin = await mysql.createConnection({ host: '127.0.0.1', port, user: env.DB_USER || 'root', password: env.DB_PASSWORD || '' })
  const [[meta]] = await admin.query("SELECT @@server_uuid AS uuid, @@partial_revokes AS literal_grants, GET_LOCK('libriflow.fe14.setup',5) AS locked")
  if (Number(meta.locked) !== 1) throw Error('DEMO_SETUP_BUSY')
  let config
  try { config = await docCauHinh() } catch (e) { if (e.code !== 'ENOENT') throw e }
  if (!config) {
    const [schema] = await admin.execute('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?', [database])
    const [account] = await admin.execute('SELECT 1 FROM mysql.user WHERE User=?', [user])
    if (schema.length || account.length) throw Error('DEMO_NAME_ALREADY_USED')
    await mkdir(thuMuc, { recursive: true, mode: 0o700 })
    config = { database, user, host: '127.0.0.1', port, uuid: meta.uuid, password: ngauNhien(), jwt: ngauNhien() }
    const taiKhoan = Object.fromEntries([['admin','Quản trị demo'],['librarian','Thủ thư demo'],['reader','Độc giả demo']].map(([role,name]) =>
      [role, { name, email: role + '@demo.example.test', password: ngauNhien() }]))
    await writeFile(tepDangNhap, JSON.stringify(taiKhoan, null, 2), { flag: 'wx', mode: 0o600 })
    await admin.query('CREATE DATABASE libriflow_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    await admin.query("CREATE USER 'libriflow_demo_app'@'127.0.0.1' IDENTIFIED BY ?", [config.password])
    const schemaGrant = Number(meta.literal_grants) ? database : database.replaceAll('_', '\\_')
    await admin.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ?? .* TO 'libriflow_demo_app'@'127.0.0.1'", [schemaGrant])
    await writeFile(tepCauHinh, JSON.stringify(config), { flag: 'wx', mode: 0o600 })
  }
  if (config.uuid !== meta.uuid || config.port !== port) throw Error('DEMO_IDENTITY_MISMATCH')
  db = await mysql.createConnection({ host: config.host, port, user, password: config.password, database, dateStrings: true })
  const [[dinhDanh]] = await db.query('SELECT DATABASE() db, @@server_uuid uuid, CURRENT_USER() account')
  if (dinhDanh.db !== database || dinhDanh.uuid !== config.uuid || dinhDanh.account !== user + '@127.0.0.1') throw Error('DEMO_IDENTITY_MISMATCH')
  await admin.query('USE libriflow_demo')
  await db.query("SET time_zone='+00:00'")
  const [bangMoc] = await db.execute("SELECT 1 FROM information_schema.tables WHERE table_schema=? AND LOWER(table_name)='nhatkyhethong'", [database])
  if (!bangMoc.length) await khoiTaoBang(admin, '../sql/schema.sql', 'CREATE DATABASE IF NOT EXISTS libriflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE libriflow;', 'CREATE TABLE IF NOT EXISTS ')
  // Hủy hiệu lực biên bản cũ trong khi kiểm kê; lỗi đối chiếu phải trả insufficient_data.
  await writeFile(tepDoPhu, '{}', { mode: 0o600 })
  const taiKhoan = JSON.parse(await readFile(tepDangNhap, 'utf8'))
  const [[dongHo]] = await db.query("SELECT UTC_DATE() today, DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%dT%H:%i:%sZ') observed")
  await db.beginTransaction()
  const [[seed]] = await db.query("SELECT COUNT(*) n FROM NhatKyHeThong WHERE action='fe14_seed_day'")
  if (!Number(seed.n)) await khoiTaoBang(db, '../sql/seeds/initial-permissions.sql', 'USE libriflow;', 'INSERT IGNORE INTO ')
  const khoangNgay = await taoDuLieu(db, taiKhoan, dongHo.today)
  await db.commit()
  const doPhu = { verified: true, complete: true, target: 'borrow_receipts_per_user_per_day', timezone: 'UTC', user_timestamps_timezone: 'UTC',
    database_name: database, server_uuid: config.uuid, ...khoangNgay, verified_at: dongHo.observed, evidence_ref: 'FE14 demo: fe14_seed_day + doi chieu PhieuMuon/ChiTietPhieuMuon/LichSuSuDung' }
  await writeFile(tepDoPhu + '.tmp', JSON.stringify(doPhu), { mode: 0o600 })
  await rename(tepDoPhu + '.tmp', tepDoPhu)
  console.log('MySQL demo sẵn sàng. Tài khoản trình diễn trong Backend/.demo-local/tai-khoan.json.')
} catch (e) {
  await db?.rollback().catch(() => {})
  console.error('Khởi tạo demo dừng (' + (e.code || (/^DEMO_/.test(e.message) ? e.message : 'DEMO_SETUP_FAILED')) + '). Xem hướng dẫn trong README.')
  process.exitCode = 1
} finally { await db?.end(); await admin?.end() }
