import { readFile, writeFile, rename } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { doiChieuLichSu } from './du-lieu.mjs'
import { kiemTraXacNhanDoPhu } from '../src/config/do-phu-du-bao.js'
import { dichNgayUtc } from '../src/utils/thuat-toan-du-bao.js'
import { spawn } from 'node:child_process'
import { docCauHinh, tepDoPhu } from './cau-hinh.mjs'
import mysql from 'mysql2/promise'

const backend = new URL('../', import.meta.url)
const frontend = new URL('../../Frontend/', import.meta.url)
const tienTrinh = []
const mode = process.argv[2]
let dangDung = false
// Terminal thuộc tiến trình cha để Vite không giữ Ctrl+C trên Windows.
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.on('data', data => { if (data.includes(3)) dung(0) })
}
function dung(ma) {
  if (dangDung) return
  dangDung = true
  if (process.stdin.isTTY) { process.stdin.setRawMode(false); process.stdin.pause() }
  process.exitCode = ma
  for (const con of tienTrinh) if (con.exitCode === null) con.kill()
}
function chay(tep, cwd, env) {
  const con = spawn(process.execPath, [tep], { cwd, env, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true })
  tienTrinh.push(con)
  con.on('error', () => dung(1))
  con.on('exit', ma => dung(ma ?? 1))
}
process.on('SIGINT', () => dung(0))
process.on('SIGTERM', () => dung(0))
try {
  const { host, port, user, password, database, jwt, uuid } = await docCauHinh()
  const db = await mysql.createConnection({ host, port, user, password, database })
  try {
    const [[r]] = await db.query('SELECT @@server_uuid AS uuid, DATABASE() AS db')
    if (r.uuid !== uuid || r.db !== database) throw Error('DEMO_IDENTITY_MISMATCH')
    await db.query('SELECT isbn FROM Sach LIMIT 0')
    const [[ctx]] = await db.query("SELECT DATABASE() database_name, @@server_uuid server_uuid, DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%dT%H:%i:%sZ') observed_at")
    const ngay = ctx.observed_at.slice(0,10)
    try {
      const cu = JSON.parse(await readFile(tepDoPhu,'utf8'))
      const homQua = dichNgayUtc(ngay,-1)
      if (kiemTraXacNhanDoPhu(cu,ctx) && cu.end_date < homQua) {
        const dau = [cu.start_date,dichNgayUtc(ngay,-28)].sort().at(-1)
        await db.query("SET SESSION time_zone = '+00:00'")
        await doiChieuLichSu(db,dau,ngay)
        const tam = tepDoPhu + '.' + randomUUID() + '.tmp'
        await writeFile(tam,JSON.stringify({...cu,start_date:dau,end_date:homQua,verified_at:ctx.observed_at}),{mode:0o600})
        await rename(tam,tepDoPhu)
      }
    } catch { console.warn('Chưa gia hạn được độ phủ dự báo demo.') }
  } finally { await db.end() }
  const portApi = Number(process.env.PORT || 3000)
  if (!Number.isInteger(portApi) || portApi < 1 || portApi > 65535 || portApi === 5173) throw Error('PORT_INVALID')
  if (!dangDung) {
    if (mode !== '--frontend') chay('src/server.js', backend, { ...process.env, DB_HOST: host, DB_PORT: String(port), DB_USER: user, DB_PASSWORD: password,
      DB_NAME: database, LIBRIFLOW_DEMO_UTC: '1', JWT_SECRET: jwt, FORECAST_COVERAGE_FILE: tepDoPhu, PORT: String(portApi) })
    if (mode !== '--backend') chay('node_modules/vite/bin/vite.js', frontend, { ...process.env, VITE_API_BASE_URL: 'http://127.0.0.1:' + portApi })
  }
} catch (loi) {
  console.error('Chưa khởi động được demo (' + (loi.code || (['DEMO_CONFIG_INVALID', 'DEMO_IDENTITY_MISMATCH', 'PORT_INVALID'].includes(loi.message) ? loi.message : 'DEMO_CONFIG_ERROR')) + '). Kiểm tra MySQL Server, dependency và chạy npm run demo:setup.')
  dung(1)
}
