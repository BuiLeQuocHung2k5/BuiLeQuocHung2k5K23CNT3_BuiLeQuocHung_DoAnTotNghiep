// node Backend/sql/migrations/003_thu_phi_demo.mjs <đường dẫn dump trước migration>
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { docCauHinh } from '../../demo/cau-hinh.mjs'

const sql = (await readFile(new URL('./003_thu_phi_demo.sql', import.meta.url), 'utf8')).replaceAll('\r\n','\n')
const statements = sql.replace(/^--.*$|^DELIMITER .*$/gm, '').split('$$').map(s => s.trim()).filter(Boolean)
const expected = {
  phiduytrithe: '81d2a3de940208d0368de8bd9baebac949a09506e60b80bf52b502ca24806f52',
  giaodichthu: 'bbebe9aa17d0c8352200db7dfa50dcf4da0dc27265f51d4cbf8f28aef623702c',
}
const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8')
const original = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(m => m[1].toLowerCase())
assert.equal(original.length, 16)
const demo = await docCauHinh()
const env = dotenv.parse(await readFile(new URL('../../.env', import.meta.url)))
const db = await mysql.createConnection({ host: demo.host, port: demo.port, database: demo.database,
  user: env.DB_USER || 'root', password: env.DB_PASSWORD || '' })

// SHOW CREATE bao gồm cột, kiểu, chỉ mục, CHECK, FK, engine và collation.
// Bỏ bộ đếm tự tăng vì giá trị thay đổi khi sử dụng bảng.
async function tableSignature(name) {
  const [[row]] = await db.query('SHOW CREATE TABLE ??', [name])
  return createHash('sha256').update(row['Create Table'].replace(/ AUTO_INCREMENT=\d+/, '')).digest('hex')
}

try {
  const [[context]] = await db.query('SELECT DATABASE() db, @@server_uuid uuid, VERSION() version, @@lower_case_table_names lc')
  assert.equal(context.db, 'libriflow_demo')
  assert.equal(context.uuid, demo.uuid)
  assert.match(context.version, /^8\.0\./)
  assert.equal(context.lc, 1, 'Chỉ xác minh cấu hình tên bảng không phân biệt hoa thường của demo')
  const [[lock]] = await db.query("SELECT GET_LOCK('libriflow_demo.db-migration-01',10) acquired")
  assert.equal(lock.acquired, 1, 'Migration đang chạy ở phiên khác')
  const [tables] = await db.query('SHOW FULL TABLES')
  const names = tables.map(row => Object.values(row)[0].toLowerCase())
  assert(tables.every(row => row.Table_type === 'BASE TABLE'))
  assert(original.every(t => names.includes(t)) && names.every(t => original.includes(t) || Object.hasOwn(expected,t)), 'Schema khác baseline')
  const pending = []
  for (const statement of statements) {
    const [,kind,name] = /^CREATE (TABLE|TRIGGER) libriflow_demo\.(\w+)/.exec(statement)
    if (kind === 'TABLE') {
      if (!names.includes(name.toLowerCase())) pending.push(statement)
      else assert.equal(await tableSignature(name), expected[name.toLowerCase()], 'Schema khác migration: '+name)
    } else {
      const [[row]] = await db.execute(`SELECT EVENT_MANIPULATION event, ACTION_TIMING timing, EVENT_OBJECT_TABLE tbl, ACTION_STATEMENT body
        FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME=?`,[name])
      if (!row) pending.push(statement)
      else {
        const [, timing, event, body] = / (AFTER|BEFORE) (INSERT|DELETE|UPDATE) ON libriflow_demo\.GiaoDichThu\s+FOR EACH ROW\s+([\s\S]+)/.exec(statement)
        assert.equal(row.tbl.toLowerCase(), 'giaodichthu')
        assert.equal(row.event,event)
        assert.equal(row.timing,timing)
        assert.equal(row.body.replaceAll('\r\n','\n'),body)
      }
    }
  }
  if (pending.length) {
    for (const name of Object.keys(expected).filter(t => names.includes(t))) {
      const [[row]] = await db.query('SELECT EXISTS(SELECT 1 FROM ??) populated', [name])
      assert.equal(row.populated, 0, 'Migration dở dang ở bảng đã có dữ liệu, cần rà soát')
    }
    const dump = await readFile(process.argv[2], 'utf8')
    assert(original.every(name => dump.toLowerCase().includes('create table `'+name+'`')), 'Thiếu cấu trúc trong backup')
    assert(dump.includes('Database: libriflow_demo') && dump.includes('INSERT INTO'), 'Kiểm tra lại backup demo')
    for (const statement of pending) await db.query(statement)
  }
  for (const [name, signature] of Object.entries(expected)) {
    assert.equal(await tableSignature(name), signature, 'Định nghĩa bảng chưa khớp: '+name)
  }
  console.log('DDL đã thực hiện:', pending.length)
} finally { await db.end() }
