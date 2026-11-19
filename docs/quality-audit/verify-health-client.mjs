// Kiểm tra entrypoint thật và health-api/Axios qua Vite SSR, không phải browser.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';

const frontend = fileURLToPath(new URL('../../Frontend/', import.meta.url));
const require = createRequire(frontend + 'package.json');
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const result = { verifiedDate: '2026-11-19', browser: false };
const originalOrigin = process.env.VITE_API_BASE_URL;
let child, vite;
const makeVite = () => createServer({ root: frontend, configFile: frontend + 'vite.config.js', server: { middlewareMode: true }, logLevel: 'silent' });
try {
  vite = await makeVite();
  const { environment } = await vite.ssrLoadModule('/src/config/environment.js');
  result.currentProcessFrontend = { configured: !environment.error, hasBaseUrl: !!environment.apiBaseUrl };
  if (environment.error) {
    const { checkHealth } = await vite.ssrLoadModule('/src/features/foundation/health-api.js');
    await assert.rejects(() => checkHealth(), error => error.message === environment.error);
    result.currentProcessFrontend.missingConfigurationBlocked = true;
  }
  await vite.close(); vite = undefined;
  // Không đụng tiến trình có trước; nếu cổng bị chiếm thì chỉ ghi startup thất bại.
  child = spawn(process.execPath, ['src/server.js'], { cwd: fileURLToPath(new URL('../../Backend/', import.meta.url)), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('STARTUP_TIMEOUT')), 20000);
    child.on('error', () => { clearTimeout(timer); reject(new Error('STARTUP_FAILED')); });
    child.on('exit', () => { clearTimeout(timer); reject(new Error('STARTUP_EXITED')); });
    let output = '';
    child.stdout.on('data', data => {
      output += data.toString();
      const matched = /API running at http:\/\/localhost:(\d+)/.exec(output);
      if (matched) { clearTimeout(timer); resolve(Number(matched[1])); }
    });
    // Không phát lại stdout/stderr có thể chứa thông tin runtime riêng.
    child.stderr.resume();
  });
  result.backendEntrypoint = { started: true, port };
  const response = await fetch(`http://127.0.0.1:${port}/api/health/db`, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  result.backendEntrypoint.healthDbStatus = response.status;
  // Cấu hình chỉ cho process kiểm thử; không tạo/sửa env file hoặc cấu hình người dùng.
  process.env.VITE_API_BASE_URL = `http://127.0.0.1:${port}`;
  vite = await makeVite();
  const { checkHealth } = await vite.ssrLoadModule('/src/features/foundation/health-api.js');
  const health = await checkHealth();
  assert.equal(health.status, 200);
  assert.equal(health.data.success, true);
  assert.equal(typeof health.data.message, 'string');
  result.explicitTestConfiguration = { actualHealthApiAndAxios: true, status: health.status, envelopeValid: true };
  result.status = 'passed';
} catch (error) {
  result.status = 'failed'; result.errorCode = /^[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'CHECK_FAILED'; process.exitCode = 1;
} finally {
  if (vite) await vite.close();
  if (child && child.exitCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; }
  if (originalOrigin === undefined) delete process.env.VITE_API_BASE_URL; else process.env.VITE_API_BASE_URL = originalOrigin;
}
await writeFile(new URL('./evidence/health-client.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
