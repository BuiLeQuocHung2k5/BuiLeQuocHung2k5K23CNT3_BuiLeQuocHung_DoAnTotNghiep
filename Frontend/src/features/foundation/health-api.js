import { httpClient } from '../../lib/api/http-client.js'

export function checkHealth({ signal } = {}) {
  return httpClient.get('/health', { signal })
}
