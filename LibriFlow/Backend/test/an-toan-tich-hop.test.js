import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { napCauHinhKiemThu, kiemTraDinhDanhKetNoi, kiemTraQuyenCoSoDuLieu, kiemTraSqlLucChay, tachCauLenhSql, docNguonSql } from "../integration/an-toan.mjs";
import { dungUngDung } from "../src/app-factory.js";

const bienMoiTruong = () => ({ TEST_DB_NAME: "libriflow_integration_test", TEST_DB_HOST: "isolated.test.invalid", TEST_DB_PORT: "3307", TEST_DB_USER: "integration_fixture",
    TEST_DB_PASSWORD: randomBytes(24).toString("hex"), TEST_DB_SERVER_UUID: "11111111-1111-1111-1111-111111111111", TEST_DB_MAIN_SERVER_UUID: "22222222-2222-2222-2222-222222222222", DB_NAME: "libriflow" });
const cauHinh = giaTri => napCauHinhKiemThu(giaTri, { mainDatabaseNames: ["libriflow"] });

test("integration safety requires every explicit TEST_DB setting; never falls back to DB_*", () => {
    const daHoanTat = bienMoiTruong();
    for (const khoa of Object.keys(daHoanTat).filter(khoa => khoa.startsWith("TEST_DB_"))) {
        const khongTonTai = { ...daHoanTat, DB_HOST: "localhost", DB_USER: "root", DB_PASSWORD: "not-a-real-secret" };delete khongTonTai[khoa];
        assert.throws(() => cauHinh(khongTonTai), { code: `MISSING_${khoa}` });
    }
    try { cauHinh({ ...daHoanTat, TEST_DB_PORT: "invalid" }); } catch (loi) { assert.ok(!loi.message.includes(daHoanTat.TEST_DB_PASSWORD)); }
});

test("integration rejects main DB, unallowlisted names, case tricks, and NODE_ENV alone", () => {
    for (const ten of ["libriflow", "LibriFlow", " libriflow ", "production", "libriflow_other_test", "libriflow_integration_test; DROP DATABASE libriflow"]) assert.throws(() => cauHinh({ ...bienMoiTruong(), TEST_DB_NAME: ten }));
    assert.throws(() => cauHinh({ NODE_ENV: "test", DB_NAME: "libriflow_integration_test" }), { code: "MISSING_TEST_DB_NAME" });
    assert.throws(() => napCauHinhKiemThu(bienMoiTruong(), { mainDatabaseNames: ["libriflow_integration_test"] }), { code: "MAIN_DATABASE_FORBIDDEN" });
});

test("integration pins distinct server UUIDs and freezes validated config", () => {
    const giaTri = bienMoiTruong();assert.ok(Object.isFrozen(cauHinh(giaTri)));
    assert.throws(() => cauHinh({ ...giaTri, TEST_DB_MAIN_SERVER_UUID: giaTri.TEST_DB_SERVER_UUID }), { code: "MAIN_SERVER_FORBIDDEN" });
    assert.throws(() => cauHinh({ ...giaTri, TEST_DB_SERVER_UUID: "not-a-uuid" }), { code: "INVALID_SERVER_UUID" });
    for (const cong of ["0", "65536", "1.5"]) assert.throws(() => cauHinh({ ...giaTri, TEST_DB_PORT: cong }), { code: "INVALID_TEST_PORT" });
});

test("actual SELECT identity must match name and server pin, never main UUID", () => {
    const mongDoi = cauHinh(bienMoiTruong());assert.doesNotThrow(() => kiemTraDinhDanhKetNoi({ database_name: mongDoi.name, server_uuid: mongDoi.serverUuid }, mongDoi));
    assert.throws(() => kiemTraDinhDanhKetNoi({ database_name: "libriflow", server_uuid: mongDoi.serverUuid }, mongDoi), { code: "CONNECTED_DATABASE_MISMATCH" });
    assert.throws(() => kiemTraDinhDanhKetNoi({ database_name: mongDoi.name, server_uuid: mongDoi.mainServerUuid }, mongDoi), { code: "CONNECTED_SERVER_MISMATCH" });
});

test("integration account must be test-schema-only, without global/admin/delete/role grants", () => {
    const ten = "libriflow_integration_test";
    assert.doesNotThrow(() => kiemTraQuyenCoSoDuLieu(["GRANT USAGE ON *.* TO fixture", `GRANT SELECT, INSERT, UPDATE, CREATE, REFERENCES ON \`${ten}\`.* TO fixture`], ten));
    for (const dongQuyen of ["GRANT ALL PRIVILEGES ON *.* TO fixture", "GRANT SELECT ON *.* TO fixture", "GRANT SELECT ON libriflow.* TO fixture", `GRANT DELETE ON ${ten}.* TO fixture`, `GRANT SELECT ON ${ten}.* TO fixture WITH GRANT OPTION`, "GRANT administrator TO fixture"]) assert.throws(() => kiemTraQuyenCoSoDuLieu([dongQuyen], ten));
    assert.throws(() => kiemTraQuyenCoSoDuLieu([], ten), { code: "GRANTS_NOT_VERIFIED" });
});

test("runtime SQL rail blocks schema switching, cross-schema targets, destructive and multi-statements", () => {
    for (const cauSql of ["USE libriflow", "DROP DATABASE libriflow", "TRUNCATE Sach", "DELETE FROM Sach", "ALTER TABLE Sach ADD x INT", "SELECT 1; UPDATE Sach SET title = 'x'", "SELECT * FROM libriflow.NguoiDung", "INSERT INTO `libriflow`.`Sach` (title) VALUES (?)"]) assert.throws(() => kiemTraSqlLucChay(cauSql));
    for (const cauSql of ["SELECT book_id FROM Sach WHERE book_id = ? FOR UPDATE", "INSERT INTO Sach (title, author) VALUES (?, ?)", "UPDATE BanSaoSach SET availability_status = ? WHERE copy_id = ?"]) assert.doesNotThrow(() => kiemTraSqlLucChay(cauSql));
});

test("SQL splitting respects quotes/comments and refuses unfinished statements", () => {
    assert.deepEqual(tachCauLenhSql("-- intro\nSELECT 'a;b'; /* comment; */ SELECT 'c'';d'; # end\n"), ["SELECT 'a;b'", "SELECT 'c'';d'"]);
    assert.throws(() => tachCauLenhSql("SELECT 'unfinished"), { code: "UNTERMINATED_SQL" });
    assert.throws(() => tachCauLenhSql("/* unfinished"), { code: "UNTERMINATED_SQL" });
});

test("test setup derives original 16 tables and seed without CREATE DATABASE or USE", () => {
    const nguon = docNguonSql();assert.equal(nguon.ddl.length, 16);assert.equal(nguon.seeds.length, 5);assert.equal(nguon.fingerprint.length, 64);
    assert.ok(nguon.ddl.every(cauSql => /^CREATE TABLE IF NOT EXISTS /.test(cauSql)));
    assert.ok([...nguon.ddl, ...nguon.seeds].every(cauSql => !/^(CREATE DATABASE|USE|DROP|TRUNCATE)/.test(cauSql)));
});

test("pure app factory cannot fall back to application DB; health uses only its explicit dependency", async () => {
    const nguon = readFileSync(new URL("../src/app-factory.js", import.meta.url), "utf8");assert.ok(!/from ["'].*config\/(?:co-so-du-lieu|database)/.test(nguon));
    assert.throws(() => dungUngDung(), /explicit database dependency/);
    let cacTruyVan = 0;
    const coSoDuLieu = { async query(cauSql) { assert.equal(cauSql, "SELECT 1");cacTruyVan++;return [[{ value: 1 }]]; } };
    const mayChu = dungUngDung({ database: coSoDuLieu }).listen(0, "127.0.0.1");await once(mayChu, "listening");
    try { const phanHoi = await fetch(`http://127.0.0.1:${mayChu.address().port}/api/health/db`);assert.equal(phanHoi.status, 200);assert.equal(cacTruyVan, 1); }
    finally { mayChu.closeAllConnections();await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
});
