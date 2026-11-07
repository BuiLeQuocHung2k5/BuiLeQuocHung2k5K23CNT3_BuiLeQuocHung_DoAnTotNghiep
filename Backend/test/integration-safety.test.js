import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { loadTestConfig, assertIdentity, assertGrants, assertRuntimeSql, sqlStatements, sqlSources } from "../integration/safety.mjs";
import { buildApp } from "../src/app-factory.js";

const env = () => ({ TEST_DB_NAME: "libriflow_integration_test", TEST_DB_HOST: "isolated.test.invalid", TEST_DB_PORT: "3307", TEST_DB_USER: "integration_fixture",
    TEST_DB_PASSWORD: randomBytes(24).toString("hex"), TEST_DB_SERVER_UUID: "11111111-1111-1111-1111-111111111111", TEST_DB_MAIN_SERVER_UUID: "22222222-2222-2222-2222-222222222222", DB_NAME: "libriflow" });
const config = value => loadTestConfig(value, { mainDatabaseNames: ["libriflow"] });

test("integration safety requires every explicit TEST_DB setting; never falls back to DB_*", () => {
    const complete = env();
    for (const key of Object.keys(complete).filter(key => key.startsWith("TEST_DB_"))) {
        const missing = { ...complete, DB_HOST: "localhost", DB_USER: "root", DB_PASSWORD: "not-a-real-secret" };delete missing[key];
        assert.throws(() => config(missing), { code: `MISSING_${key}` });
    }
    try { config({ ...complete, TEST_DB_PORT: "invalid" }); } catch (error) { assert.ok(!error.message.includes(complete.TEST_DB_PASSWORD)); }
});

test("integration rejects main DB, unallowlisted names, case tricks, and NODE_ENV alone", () => {
    for (const name of ["libriflow", "LibriFlow", " libriflow ", "production", "libriflow_other_test", "libriflow_integration_test; DROP DATABASE libriflow"]) assert.throws(() => config({ ...env(), TEST_DB_NAME: name }));
    assert.throws(() => config({ NODE_ENV: "test", DB_NAME: "libriflow_integration_test" }), { code: "MISSING_TEST_DB_NAME" });
    assert.throws(() => loadTestConfig(env(), { mainDatabaseNames: ["libriflow_integration_test"] }), { code: "MAIN_DATABASE_FORBIDDEN" });
});

test("integration pins distinct server UUIDs and freezes validated config", () => {
    const value = env();assert.ok(Object.isFrozen(config(value)));
    assert.throws(() => config({ ...value, TEST_DB_MAIN_SERVER_UUID: value.TEST_DB_SERVER_UUID }), { code: "MAIN_SERVER_FORBIDDEN" });
    assert.throws(() => config({ ...value, TEST_DB_SERVER_UUID: "not-a-uuid" }), { code: "INVALID_SERVER_UUID" });
    for (const port of ["0", "65536", "1.5"]) assert.throws(() => config({ ...value, TEST_DB_PORT: port }), { code: "INVALID_TEST_PORT" });
});

test("actual SELECT identity must match name and server pin, never main UUID", () => {
    const expected = config(env());assert.doesNotThrow(() => assertIdentity({ database_name: expected.name, server_uuid: expected.serverUuid }, expected));
    assert.throws(() => assertIdentity({ database_name: "libriflow", server_uuid: expected.serverUuid }, expected), { code: "CONNECTED_DATABASE_MISMATCH" });
    assert.throws(() => assertIdentity({ database_name: expected.name, server_uuid: expected.mainServerUuid }, expected), { code: "CONNECTED_SERVER_MISMATCH" });
});

test("integration account must be test-schema-only, without global/admin/delete/role grants", () => {
    const name = "libriflow_integration_test";
    assert.doesNotThrow(() => assertGrants(["GRANT USAGE ON *.* TO fixture", `GRANT SELECT, INSERT, UPDATE, CREATE, REFERENCES ON \`${name}\`.* TO fixture`], name));
    for (const grant of ["GRANT ALL PRIVILEGES ON *.* TO fixture", "GRANT SELECT ON *.* TO fixture", "GRANT SELECT ON libriflow.* TO fixture", `GRANT DELETE ON ${name}.* TO fixture`, `GRANT SELECT ON ${name}.* TO fixture WITH GRANT OPTION`, "GRANT administrator TO fixture"]) assert.throws(() => assertGrants([grant], name));
    assert.throws(() => assertGrants([], name), { code: "GRANTS_NOT_VERIFIED" });
});

test("runtime SQL rail blocks schema switching, cross-schema targets, destructive and multi-statements", () => {
    for (const sql of ["USE libriflow", "DROP DATABASE libriflow", "TRUNCATE Sach", "DELETE FROM Sach", "ALTER TABLE Sach ADD x INT", "SELECT 1; UPDATE Sach SET title = 'x'", "SELECT * FROM libriflow.NguoiDung", "INSERT INTO `libriflow`.`Sach` (title) VALUES (?)"]) assert.throws(() => assertRuntimeSql(sql));
    for (const sql of ["SELECT book_id FROM Sach WHERE book_id = ? FOR UPDATE", "INSERT INTO Sach (title, author) VALUES (?, ?)", "UPDATE BanSaoSach SET availability_status = ? WHERE copy_id = ?"]) assert.doesNotThrow(() => assertRuntimeSql(sql));
});

test("SQL splitting respects quotes/comments and refuses unfinished statements", () => {
    assert.deepEqual(sqlStatements("-- intro\nSELECT 'a;b'; /* comment; */ SELECT 'c'';d'; # end\n"), ["SELECT 'a;b'", "SELECT 'c'';d'"]);
    assert.throws(() => sqlStatements("SELECT 'unfinished"), { code: "UNTERMINATED_SQL" });
    assert.throws(() => sqlStatements("/* unfinished"), { code: "UNTERMINATED_SQL" });
});

test("test setup derives original 16 tables and seed without CREATE DATABASE or USE", () => {
    const source = sqlSources();assert.equal(source.ddl.length, 16);assert.equal(source.seeds.length, 5);assert.equal(source.fingerprint.length, 64);
    assert.ok(source.ddl.every(sql => /^CREATE TABLE IF NOT EXISTS /.test(sql)));
    assert.ok([...source.ddl, ...source.seeds].every(sql => !/^(CREATE DATABASE|USE|DROP|TRUNCATE)/.test(sql)));
});

test("pure app factory cannot fall back to application DB; health uses only its explicit dependency", async () => {
    const source = readFileSync(new URL("../src/app-factory.js", import.meta.url), "utf8");assert.ok(!/from ["'].*config\/database/.test(source));
    assert.throws(() => buildApp(), /explicit database dependency/);
    let queries = 0;
    const database = { async query(sql) { assert.equal(sql, "SELECT 1");queries++;return [[{ value: 1 }]]; } };
    const server = buildApp({ database }).listen(0, "127.0.0.1");await once(server, "listening");
    try { const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health/db`);assert.equal(response.status, 200);assert.equal(queries, 1); }
    finally { server.closeAllConnections();await new Promise(resolve => server.close(resolve)); }
});
