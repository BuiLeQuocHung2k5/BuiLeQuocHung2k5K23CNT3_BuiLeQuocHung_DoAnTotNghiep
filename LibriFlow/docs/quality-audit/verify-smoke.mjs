// QA-01: chỉ SELECT metadata/aggregate và GET/OPTIONS; không đọc/in nội dung .env.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import pool from '../../Backend/src/config/co-so-du-lieu.js';
import { dungUngDung } from '../../Backend/src/app-factory.js';

const result = { verifiedDate: '2026-11-19', existing: {}, checks: [], sqlCalls: 0 };
const onlySelect = sql => {
  assert.match(sql, /^\s*SELECT\b/i);
  assert.doesNotMatch(sql, /;|\b(?:OUTFILE|DUMPFILE|FOR\s+UPDATE|FOR\s+SHARE|GET_LOCK)\b/i);
  result.sqlCalls++;
};
const db = {
  query(sql, params) { onlySelect(sql); return pool.query(sql, params); },
  execute(sql, params) { onlySelect(sql); return pool.execute(sql, params); },
  getConnection() { throw new Error('QA01_WRITE_CONNECTION_FORBIDDEN'); },
};
let server;
try {
  for (const [name, url] of Object.entries({ backend3000: 'http://127.0.0.1:3000/api/health', frontend5173: 'http://127.0.0.1:5173/' })) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); result.existing[name] = { reachable: true, status: response.status }; }
    catch { result.existing[name] = { reachable: false }; }
  }
  const [[metadata]] = await db.query(`SELECT VERSION() AS version,
    (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE') AS tables_count,
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()) AS columns_count,
    (SELECT COUNT(*) FROM NguoiDung) AS users_count,
    (SELECT COUNT(*) FROM QuyDinhPhat WHERE is_active = 1) AS active_fine_rules,
    (SELECT COUNT(*) FROM QuyenHan WHERE name = 'category_manage') AS category_permission_count`);
  const [constraints] = await db.query('SELECT CONSTRAINT_TYPE AS type, COUNT(*) AS count FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() GROUP BY CONSTRAINT_TYPE');
  const [columns] = await db.query('SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, COLUMN_TYPE AS column_type, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION');
  const [indexes] = await db.query('SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name, NON_UNIQUE AS non_unique, COLUMN_NAME AS column_name, SEQ_IN_INDEX AS position FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX');
  const [grants] = await db.query('SELECT r.name AS role_name, p.name AS permission_name FROM VaiTro r LEFT JOIN VaiTro_QuyenHan rp ON rp.role_id = r.role_id LEFT JOIN QuyenHan p ON p.permission_id = rp.permission_id ORDER BY r.name, p.name');
  result.database = { ...metadata, constraints, columns, indexes, grants };
  // Tên role/quyền và metadata công khai thiết kế; không SELECT hồ sơ/hash/token.
  const app = dungUngDung({ database: db });
  const factorySource = await readFile(new URL('../../Backend/src/app-factory.js', import.meta.url), 'utf8');
  const prefixes = [...factorySource.matchAll(/ungDung\.use\("([^"]+)"/g)].map(match => match[1]);
  let mountIndex = 0;
  result.endpoints = [];
  for (const layer of app.router.stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) result.endpoints.push({ method: method.toUpperCase(), path: layer.route.path, jwt: false });
    } else if (layer.name === 'router') {
      const prefix = prefixes[mountIndex++];
      let inheritedAuth = false;
      for (const child of layer.handle.stack) {
        if (!child.route && child.handle.name === 'authenticate') inheritedAuth = true;
        if (!child.route) continue;
        const jwt = inheritedAuth || child.route.stack.some(handler => handler.handle.name === 'authenticate');
        for (const method of Object.keys(child.route.methods)) result.endpoints.push({ method: method.toUpperCase(), path: prefix + (child.route.path === '/' ? '' : child.route.path), jwt });
      }
    }
  }
  assert.equal(mountIndex, prefixes.length);
  assert.equal(result.endpoints.length, 40);
  assert.equal(new Set(result.endpoints.map(endpoint => endpoint.method + ' ' + endpoint.path)).size, 40);
  assert.equal(result.endpoints.filter(endpoint => endpoint.jwt).length, 29);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, expected] of [
    ['/api/health', 200], ['/api/health/db', 200], ['/api/books?limit=1', 200],
    ['/api/categories?limit=1', 200], ['/api/book-copies?limit=1', 200],
    ['/api/auth/me', 401], ['/api/borrows', 401], ['/api/fines', 401], ['/api/overdues', 401],
    ['/api/usage-history/me', 401], ['/api/statistics/overview', 401], ['/api/forecasts/me', 401],
    ['/api/books?sort=title', 400], ['/api/books/0', 400], ['/api/not-a-route', 404],
  ]) {
    const response = await fetch(base + path, { headers: { Origin: 'http://127.0.0.1:5173' }, signal: AbortSignal.timeout(15000) });
    const payload = await response.json();
    assert.equal(response.status, expected, path);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(payload.success, expected === 200);
    result.checks.push({ method: 'GET', path, status: response.status, cors: '*' });
  }
  const response = await fetch(base + '/api/auth/me', { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('access-control-allow-headers'), /authorization/i);
  result.checks.push({ method: 'OPTIONS', path: '/api/auth/me', status: response.status });
  const invalidTokenResponse = await fetch(base + '/api/auth/me', { headers: { Authorization: 'Bearer a.b.c' } });
  const invalidTokenPayload = await invalidTokenResponse.json();
  assert.ok([401, 503].includes(invalidTokenResponse.status));
  result.authConfiguration = { available: invalidTokenResponse.status === 401, errorCode: invalidTokenPayload.error.code };
  result.checks.push({ method: 'GET', path: '/api/auth/me (invalid token)', status: invalidTokenResponse.status });
  result.status = 'passed';
} catch (error) {
  result.status = 'failed';
  result.errorCode = /^[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'CHECK_FAILED';
  process.exitCode = 1;
} finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await pool.end();
}
await writeFile(new URL('./evidence/smoke.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, existing: result.existing, database: result.database && { version: result.database.version, tables: result.database.tables_count, columns: result.database.columns_count, users: result.database.users_count, activeFineRules: result.database.active_fine_rules, categoryPermission: result.database.category_permission_count }, checks: result.checks.length, sqlCalls: result.sqlCalls, errorCode: result.errorCode }));
