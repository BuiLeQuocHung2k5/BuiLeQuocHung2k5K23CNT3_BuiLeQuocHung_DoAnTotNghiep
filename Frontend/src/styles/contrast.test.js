// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
const values = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2]]))
function resolve(token) {
  const value = values[token]
  return value.startsWith('var(') ? resolve(value.slice(4, -1)) : value
}
function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map(part => {
    const channel = parseInt(part, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(first, second) {
  const a = luminance(resolve(first)), b = luminance(resolve(second))
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
    ...['neutral', 'success', 'warning', 'danger', 'info'].map(tone => [`--${tone}`, `--${tone}-background`]),
  ])('%s on %s meets 4.5:1', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['--border-strong', '--surface'], ['--focus-ring', '--background'], ['--focus-ring', '--surface'],
    ...['neutral', 'success', 'warning', 'danger', 'info'].map(tone => [`--${tone}-border`, `--${tone}-background`]),
  ])('%s on %s meets 3:1 for important boundaries/focus', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3)
  })
})
