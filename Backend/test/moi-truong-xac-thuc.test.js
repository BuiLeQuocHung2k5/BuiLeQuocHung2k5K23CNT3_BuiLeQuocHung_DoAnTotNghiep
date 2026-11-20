import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { docKeHoachXacThuc } from "../integration/ke-hoach-xac-thuc.mjs";

test("auth environment plan reads metadata/counts only and exposes no connection identity or credentials", async () => {
    const calls = [];
    const database = { async query(sql) {
        calls.push(sql);
        assert.match(sql, /^SELECT /);
        if (sql.includes("@@server_uuid")) return [[{ database_name: "private-main-name", server_uuid: "private-identity", data_directory: "private-data-path", port: 3306, version: "8.0.40" }]];
        if (sql.includes("information_schema")) return [[{ TABLE_NAME: "NguoiDung", COLUMN_NAME: "user_id" }]];
        return [[{ total: 0 }]];
    } };
    const result = await docKeHoachXacThuc(database, true);
    assert.equal(calls.length, 18);
    assert.equal(result.approvalRequired, true);
    assert.equal(result.databaseWrites, 0);
    assert.equal(result.provisioningStarted, false);
    assert.equal(result.proposed.accounts.length, 2);
    assert.deepEqual(result.proposed.runtimePrivileges, ["SELECT", "INSERT", "UPDATE"]);
    assert.doesNotMatch(JSON.stringify(result), /private-main-name|private-identity|private-data-path/);
});

test("auth environment plan refuses unverified main identity before scanning counts", async () => {
    let calls = 0;
    await assert.rejects(docKeHoachXacThuc({ async query() { calls++; return [[{ database_name: "main" }]]; } }, true), { code: "MAIN_IDENTITY_UNVERIFIED" });
    assert.equal(calls, 1);
});

test("auth isolated runner refuses incomplete provision flags before starting MySQL", () => {
    for (const [flag, code] of [["--auth-only", "EXPLICIT_PROVISION_APPROVAL_REQUIRED"], ["--allow-create-isolated", "AUTH_ONLY_MODE_REQUIRED"]]) {
        const child = spawnSync(process.execPath, [fileURLToPath(new URL("../integration/instance-isolee.mjs", import.meta.url)), flag], { encoding: "utf8", windowsHide: true, timeout: 15000 });
        assert.equal(child.status, 2);
        assert.ok(child.stderr.includes(code));
        assert.equal(child.stdout, "");
    }
});
