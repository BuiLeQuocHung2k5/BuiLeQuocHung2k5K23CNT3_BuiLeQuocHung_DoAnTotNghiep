import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const seed = read("../sql/seeds/initial-permissions.sql");
const original = read("../sql/libriflow_database.sql");
const schema = read("../sql/schema.sql");
const migration = read("../sql/migrations/001_add_category_manage.sql").replace(/^--.*$/gm, "");

function permissionNames(sql) {
    const values = sql.match(/INSERT IGNORE INTO QuyenHan \(name, description\) VALUES([\s\S]*?);/)[1];
    return [...values.matchAll(/\('([^']+)'\s*,/g)].map(match => match[1]);
}

test("seed adds only category_manage, keeps all prior permissions and reader grants", () => {
    assert.deepEqual(permissionNames(seed), [...permissionNames(original), "category_manage"]);
    const grants = sql => [...sql.matchAll(/INSERT IGNORE INTO VaiTro_QuyenHan[\s\S]*?;/g)].map(match => match[0]);
    const oldGrants = grants(original), newGrants = grants(seed);
    assert.equal(newGrants.length, oldGrants.length);
    assert.equal(newGrants[0], oldGrants[0]); // Admin still receives every permission via CROSS JOIN.
    assert.equal(newGrants[1].replace(",'category_manage'", ""), oldGrants[1]);
    assert.equal(newGrants[2], oldGrants[2]); // Reader remains book_view only.
});

test("migration static contract: additive idempotent inserts and natural-key lookup, no DDL or fixed IDs", () => {
    const statements = migration.split(";").map(value => value.trim()).filter(Boolean);
    assert.equal(statements.length, 4);
    assert.equal(statements[0], "START TRANSACTION");assert.equal(statements[3], "COMMIT");
    assert.match(statements[1], /^INSERT IGNORE INTO QuyenHan \(name, description\)\s+VALUES \('category_manage', 'Quan ly danh muc sach'\)$/);
    assert.match(statements[2], /^INSERT IGNORE INTO VaiTro_QuyenHan \(role_id, permission_id\)\s+SELECT r.role_id, p.permission_id/);
    assert.match(statements[2], /WHERE r.name IN \('admin', 'librarian'\)\s+AND p.name = 'category_manage'$/);
    assert.ok(!/\b(?:ALTER|DROP|DELETE|UPDATE|TRUNCATE|CREATE|USE|reader)\b/i.test(migration));
    assert.ok(!/\b\d+\b/.test(migration));
    assert.match(schema, /CREATE TABLE IF NOT EXISTS QuyenHan \([\s\S]*?name VARCHAR\(100\) NOT NULL UNIQUE/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS VaiTro \([\s\S]*?name VARCHAR\(50\) NOT NULL UNIQUE/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS VaiTro_QuyenHan \([\s\S]*?PRIMARY KEY \(role_id, permission_id\)/);
    // UNIQUE(name) and composite PK provide duplicate protection for repeated INSERT IGNORE.
    // This is static verification, not execution or a claim of tested MySQL idempotence.
});
