import test from 'node:test'
import assert from 'node:assert/strict'
import { taoMoHinhNguoiDung } from '../src/models/nguoi-dung.model.js'

function moPhong(role, permissions) {
  const calls = []
  const cx = {
    async beginTransaction() {}, async commit() { calls.push('commit') }, async rollback() { calls.push('rollback') }, release() {},
    async execute(sql) {
      calls.push(sql)
      if (sql.includes('permission_id FROM QuyenHan')) return [[{permission_id:1}]]
      if (sql.includes('permission_name')) return [permissions.map(permission_name=>({ user_id:'1',status:'active',role_name:role,permission_name }))]
      if (sql.includes('GROUP_CONCAT')) return [[{ user_id:'1',status:'active',roles:role }]]
      throw Error('Unexpected SQL')
    },
    async query() { return [[{ role:'admin',perm:'user_manage' },{role:'admin',perm:'report_view'},{role:'reader',perm:'book_view'}]] }
  }
  return { model:taoMoHinhNguoiDung({getConnection:async()=>cx}), calls }
}
test('an active manager cannot disable itself or replace its roles', async () => {
  for (const data of [{ status:'inactive' }, { role:'reader' }]) {
    const {model,calls}=moPhong('admin',['user_manage','book_view','report_view'])
    await assert.rejects(model.luu('1','1',data),{code:'SELF_ACCESS_CHANGE'})
    assert.equal(calls.at(-1),'rollback')
    assert.ok(!calls.some(sql=>/^(UPDATE|DELETE|INSERT)/.test(sql)))
  }
})
test('rechecks live permissions before writing and restricts role delegation', async () => {
  for (const [role,permissions] of [['admin',['book_view']],['librarian',['user_manage','report_view']],['admin',['user_manage']]]) {
    const {model,calls}=moPhong(role,permissions)
    await assert.rejects(model.luu('1',null,{role:'admin'}),{code:'FORBIDDEN'})
    assert.match(calls[0],/FOR UPDATE/)
    assert.equal(calls.at(-1),'rollback')
  }
})
