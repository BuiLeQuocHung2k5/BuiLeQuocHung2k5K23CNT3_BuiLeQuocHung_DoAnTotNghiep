// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL("./bien-thiet-ke.css", import.meta.url), 'utf8')
const cacGiaTri = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(ketQuaKhop => [ketQuaKhop[1], ketQuaKhop[2]]))
function resolve(token) {
  const giaTri = cacGiaTri[token]
  return giaTri.startsWith('var(') ? resolve(giaTri.slice(4, -1)) : giaTri
}
function doChoi(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map(thanhPhan => {
    const kenhMau = parseInt(thanhPhan, 16) / 255
    return kenhMau <= 0.04045 ? kenhMau / 12.92 : ((kenhMau + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function doTuongPhan(mauThuNhat, mauThuHai) {
  const a = doChoi(resolve(mauThuNhat)), b = doChoi(resolve(mauThuHai))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe('WCAG AA token pairs used for ordinary text', () => {
  it.each([
    ['--foreground', '--background'], ['--foreground', '--surface'],
    ['--foreground-muted', '--surface'], ['--foreground-muted', '--surface-muted'],
    ['--primary-foreground', '--primary'], ['--primary-foreground', '--primary-hover'],
    ['--primary-foreground', '--danger'], ['--primary-foreground', '--danger-hover'],
    ['--primary', '--secondary'], ['--primary', '--secondary-hover'],
    ['--accent-foreground', '--accent'],
    ...['neutral', 'success', 'warning', 'danger', 'info'].map(sacDo => [`--${sacDo}`, `--${sacDo}-background`]),
  ])('%s on %s meets 4.5:1', (mauChu, mauNen) => {
    expect(doTuongPhan(mauChu, mauNen)).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['--border-strong', '--surface'], ['--focus-ring', '--background'], ['--focus-ring', '--surface'],
    ...['neutral', 'success', 'warning', 'danger', 'info'].map(sacDo => [`--${sacDo}-border`, `--${sacDo}-background`]),
  ])('%s on %s meets 3:1 for important boundaries/focus', (mauChu, mauNen) => {
    expect(doTuongPhan(mauChu, mauNen)).toBeGreaterThanOrEqual(3)
  })
})
