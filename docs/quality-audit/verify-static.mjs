// Dùng parser/linter đã cài trong Frontend, không cài package và không sửa source.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(path.join(root, 'Frontend/package.json'));
const { parse } = require('espree'), { Linter } = require('eslint'), globals = require('globals');
const walk = directory => fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
const files = ['Backend/src', 'Backend/test', 'Backend/integration', 'Frontend/src'].flatMap(walk).filter(file => /\.(?:m?js|jsx)$/.test(file));
const result = { verifiedDate: '2026-11-19', files: [], edges: [], errors: [], unusedLocals: [], cycles: [], packages: {}, cssTokensUnused: [] };
const graph = new Map();
function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') callback(node);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(child => visit(child, callback)); else if (value && typeof value === 'object') visit(value, callback);
}
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
  result.files.push({ file, lines: source.split('\n').length, sha256: createHash('sha256').update(source).digest('hex') });
  const dependencies = [];
  visit(ast, node => {
    const specifier = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) ? node.source?.value : node.type === 'ImportExpression' ? node.source?.value : undefined;
    if (typeof specifier !== 'string' || !specifier.startsWith('.')) return;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
    if (!fs.existsSync(path.join(root, target))) result.errors.push({ file, missing: specifier });
    else if (!fs.readdirSync(path.dirname(path.join(root, target))).includes(path.posix.basename(target))) result.errors.push({ file, casing: specifier });
    result.edges.push({ from: file, to: target }); dependencies.push(target);
  });
  graph.set(file, dependencies);
  if (file.startsWith('Backend/')) {
    const syntax = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8', windowsHide: true });
    if (syntax.status !== 0) result.errors.push({ file, syntax: false });
  }
  if (file.startsWith('Backend/src/')) {
    const messages = new Linter().verify(source, [{ languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node }, rules: { 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }], 'no-undef': 'error', 'no-unreachable': 'error', 'no-constant-condition': 'warn' } }]);
    for (const message of messages) (message.ruleId === 'no-unused-vars' ? result.unusedLocals : result.errors).push({ file, line: message.line, rule: message.ruleId, message: message.message });
  }
}
const active = new Set(), done = new Set();
function dfs(file, stack = []) {
  if (active.has(file)) { result.cycles.push([...stack, file]); return; }
  if (done.has(file)) return;
  active.add(file); (graph.get(file) ?? []).forEach(next => dfs(next, [...stack, file])); active.delete(file); done.add(file);
}
files.forEach(file => dfs(file));
for (const directory of ['Backend', 'Frontend']) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, directory, 'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(root, directory, 'package-lock.json')));
  result.packages[directory] = { production: Object.keys(manifest.dependencies).length, development: Object.keys(manifest.devDependencies).length, direct: [] };
  for (const [name, spec] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    const version = lock.packages[`node_modules/${name}`]?.version;
    const installed = JSON.parse(fs.readFileSync(path.join(root, directory, 'node_modules', name, 'package.json'))).version;
    result.packages[directory].direct.push({ name, spec, version, installed });
    if (installed !== version) result.errors.push({ package: name, lockInstalledMismatch: true });
  }
  if (JSON.stringify(lock.packages[''].dependencies) !== JSON.stringify(manifest.dependencies) || JSON.stringify(lock.packages[''].devDependencies) !== JSON.stringify(manifest.devDependencies)) result.errors.push({ directory, rootLockMismatch: true });
  const versions = new Map();
  for (const [location, pkg] of Object.entries(lock.packages)) {
    if (!location.includes('node_modules/')) continue;
    const name = location.split('node_modules/').at(-1);
    if (!versions.has(name)) versions.set(name, new Set());
    versions.get(name).add(pkg.version);
  }
  result.packages[directory].multipleVersions = [...versions].filter(([, set]) => set.size > 1).map(([name, set]) => ({ name, versions: [...set] }));
}
const css = walk('Frontend/src/styles').filter(file => file.endsWith('.css')).map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const frontendText = walk('Frontend/src').map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
// Chỉ liệt kê ứng viên không có var() trực tiếp; @theme/third-party vẫn có thể dùng động.
result.cssTokensUnused = [...css.matchAll(/(?:^|[;{])\s*(--[\w-]+)\s*:/gm)].map(match => match[1]).filter(token => !frontendText.includes(`var(${token})`));
const baseline = JSON.parse(fs.readFileSync(new URL('./evidence/baseline.json', import.meta.url)));
const smoke = JSON.parse(fs.readFileSync(new URL('./evidence/smoke.json', import.meta.url)));
const schema = fs.readFileSync(path.join(root, 'Backend/sql/schema.sql'), 'utf8');
const expectedColumns = [];
for (const match of schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\) ENGINE=/g)) {
  for (const line of match[2].split('\n')) {
    const column = /^\s*(\w+)\s+(BIGINT UNSIGNED|SMALLINT UNSIGNED|VARCHAR\(\d+\)|DECIMAL\(\d+,\d+\)|ENUM\([^)]*\)|DATETIME|DATE|TEXT|JSON|BOOLEAN)(.*)/i.exec(line);
    if (!column) continue;
    expectedColumns.push({ table_name: match[1].toLowerCase(), column_name: column[1], column_type: column[2].toLowerCase().replace('boolean', 'tinyint(1)'), nullable: /NOT NULL|PRIMARY KEY/i.test(column[3]) ? 'NO' : 'YES' });
  }
}
result.schemaComparison = { scope: 'column names/types/nullability only; no defaults/cascade/collation/CHECK expression comparison', expectedColumns: expectedColumns.length, observedColumns: smoke.database?.columns?.length, mismatches: [] };
for (const expected of expectedColumns) {
  const actual = smoke.database?.columns?.find(column => column.table_name.toLowerCase() === expected.table_name && column.column_name === expected.column_name);
  if (!actual || actual.column_type !== expected.column_type || actual.nullable !== expected.nullable) result.schemaComparison.mismatches.push(expected);
}
if (expectedColumns.length !== 96 || smoke.database?.columns?.length !== 96 || result.schemaComparison.mismatches.length) result.errors.push({ schemaColumnMismatch: true });
result.changedFromBaseline = Object.entries(baseline.hashes).filter(([file, hash]) => !fs.existsSync(path.join(root, file)) || createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') !== hash).map(([file]) => file);
const index = spawnSync('git', ['ls-files', '--stage'], { cwd: root, encoding: 'utf8', windowsHide: true });
result.originalIndexUnchanged = index.stdout === baseline.index;
if (!result.originalIndexUnchanged) result.errors.push({ gitIndexChanged: true });
result.status = result.errors.length || result.cycles.length ? 'failed' : 'passed';
const phase = process.argv[2] === 'after' ? 'after' : 'before';
fs.writeFileSync(new URL(`./evidence/static-${phase}.json`, import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, files: result.files.length, backendFiles: result.files.filter(item => item.file.startsWith('Backend/')).length, frontendFiles: result.files.filter(item => item.file.startsWith('Frontend/')).length, edges: result.edges.length, cycles: result.cycles.length, errors: result.errors, unusedLocals: result.unusedLocals.length, packages: Object.fromEntries(Object.entries(result.packages).map(([name, value]) => [name, { production: value.production, development: value.development, multipleVersions: value.multipleVersions }])), changedFromBaseline: result.changedFromBaseline, originalIndexUnchanged: result.originalIndexUnchanged, cssTokensUnused: result.cssTokensUnused }));
if (result.status !== 'passed') process.exitCode = 1;
