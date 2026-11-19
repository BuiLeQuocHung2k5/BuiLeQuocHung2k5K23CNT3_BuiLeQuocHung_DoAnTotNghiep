import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from './http-client.js'
import { environment } from '../../config/environment.js'
import { checkHealth } from '../../features/foundation/health-api.js'

vi.mock('../../config/environment.js', () => ({
  environment: { apiBaseUrl: 'http://127.0.0.1:3000/api', error: null },
}))

beforeEach(() => { environment.error = null })

describe('HTTP client contract', () => {
  it('preserves response status, headers and envelope without adding authentication', async () => {
    const payload = { success: true, data: [], pagination: { page: 1, total: 0 } }
    let request
    const response = await httpClient.get('/books', { adapter: async (config) => {
      request = config
      return { status: 200, statusText: 'OK', headers: { 'x-check': 'preserved' }, data: payload, config }
    } })
    expect(httpClient.getUri(request)).toBe('http://127.0.0.1:3000/api/books')
    expect(request.headers.has('Authorization')).toBe(false)
    expect(request.withCredentials).toBe(false)
    expect(response.status).toBe(200)
    expect(response.headers.get('x-check')).toBe('preserved')
    expect(response.data).toEqual(payload)
  })

  it('preserves AxiosError status, backend code and validation details without retrying a write', async () => {
    const payload = { success: false, error: { code: 'VALIDATION_ERROR', details: [{ field: 'body', message: 'Invalid' }] } }
    let original
    const adapter = vi.fn(async (config) => {
      original = new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null,
        { status: 400, data: payload, headers: {}, config })
      throw original
    })
    const caught = await httpClient.post('/foundation-test', {}, { adapter }).catch((error) => error)
    expect(caught).toBe(original)
    expect(caught.response.status).toBe(400)
    expect(caught.response.data).toEqual(payload)
    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('does not invent an HTTP status for network failures', async () => {
    const adapter = vi.fn(async (config) => { throw new AxiosError('Network Error', 'ERR_NETWORK', config) })
    const caught = await httpClient.get('/health', { adapter }).catch((error) => error)
    expect(caught.code).toBe('ERR_NETWORK')
    expect(caught.response).toBeUndefined()
    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('blocks requests with missing configuration before any network adapter runs', async () => {
    environment.error = 'Missing API origin'
    const adapter = vi.fn()
    await expect(httpClient.get('/health', { adapter })).rejects.toThrow('Missing API origin')
    expect(adapter).not.toHaveBeenCalled()
  })

  it('uses only GET /health and forwards cancellation for the technical smoke check', async () => {
    const controller = new AbortController()
    const spy = vi.spyOn(httpClient, 'get').mockResolvedValueOnce({ status: 200, data: { success: true } })
    await checkHealth({ signal: controller.signal })
    expect(spy).toHaveBeenCalledWith('/health', { signal: controller.signal })
  })
})
