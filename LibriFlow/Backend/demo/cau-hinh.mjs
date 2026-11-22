import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const thuMuc = new URL('../.demo-local/', import.meta.url)
export const tepCauHinh = new URL('cau-hinh.json', thuMuc)
export const tepDoPhu = fileURLToPath(new URL('do-phu.json', thuMuc))
export const database = 'libriflow_demo'
export const user = 'libriflow_demo_app'

export async function docCauHinh() {
  const cauHinh = JSON.parse(await readFile(tepCauHinh, 'utf8'))
  if (cauHinh.database !== database || cauHinh.user !== user || cauHinh.host !== '127.0.0.1' ||
      !Number.isInteger(cauHinh.port) || !cauHinh.uuid || !cauHinh.password || !cauHinh.jwt) throw Error('DEMO_CONFIG_INVALID')
  return cauHinh
}
