import { describe, expect, it } from 'vitest'
import { docMoiTruong } from "./moi-truong.js"

describe('public API configuration', () => {
  it('adds the verified prefix once and accepts a trailing slash on the origin', () => {
    expect(docMoiTruong({ VITE_API_BASE_URL: ' http://127.0.0.1:3000/ ' })).toEqual({
      apiBaseUrl: 'http://127.0.0.1:3000/api', error: null,
    })
  })

  it('allows a configured HTTPS origin without hardcoding production', () => {
    expect(docMoiTruong({ VITE_API_BASE_URL: 'https://api.example.invalid' }).apiBaseUrl)
      .toBe('https://api.example.invalid/api')
  })

  it.each([
    undefined, '', 'not a URL', '/api', 'ftp://api.example.invalid',
    'https://api.example.invalid/api', 'https://api.example.invalid/?test=1',
    'https://api.example.invalid/#fragment', 'https://demo:placeholder@api.example.invalid',
  ])('blocks missing or invalid origins (%s) without exposing the configured value', (giaTri) => {
    const ketQua = docMoiTruong({ VITE_API_BASE_URL: giaTri })
    expect(ketQua.apiBaseUrl).toBeNull()
    expect(ketQua.error).toBeTruthy()
    if (giaTri?.includes('placeholder')) expect(ketQua.error).not.toContain('placeholder')
  })
})
