import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createApp } from "../src/app.js";
import pool from "../src/config/database.js";
import { createJwtService } from "../src/utils/jwt.js";
import { createBorrowModel } from "../src/models/borrow.model.js";
import { validateBorrow, validateReturn } from "../src/utils/borrow-validation.js";

const requestBody = { user_id: "30", copy_ids: ["2", "1"], due_date: "2035-01-01T12:00:00Z" };
const borrowData = validateBorrow(requestBody);
const header = { borrow_id: "1", user_id: "30", status: "borrowed", borrow_date: "2026-11-06 00:00:00", due_date: "2035-01-01 12:00:00", note: null, created_at: "2026-11-06 00:00:00" };
const detail = id => ({ borrow_detail_id: String(100 + Number(id)), borrow_id: "1", copy_id: String(id), returned_at: null, condition_before: "good", condition_after: null, status: "borrowed" });
const copy = (id, status = "available") => ({ copy_id: String(id), condition_status: "good", availability_status: status });
const joined = (id, overrides = {}) => ({ ...header, ...detail(id), status: header.status, detail_status: "borrowed", ...overrides });

async function withApp(overrides, run) {
    const key = randomBytes(48).toString("base64url"), tokens = createJwtService({ getSecret: () => key });
    const principals = {
        admin: { user_id: "10", roles: ["admin"], permissions: ["borrow_manage", "return_process"] },
        librarian: { user_id: "20", roles: ["librarian"], permissions: ["borrow_manage", "return_process"] },
        reader: { user_id: "30", roles: ["reader"], permissions: ["book_view"] },
        fakeAdmin: { user_id: "40", roles: ["admin"], permissions: [] },
        returnOnly: { user_id: "50", roles: ["staff"], permissions: ["return_process"] },
        borrowOnly: { user_id: "60", roles: ["staff"], permissions: ["borrow_manage"] },
    };
    const state = { writes: 0, query: null, scope: undefined };
    const authModel = { async getPrincipal(id) { const user = Object.values(principals).find(user => user.user_id === id); return user ? { ...user, status: "active" } : null; } };
    const records = [header, { ...header, borrow_id: "2", user_id: "99" }];
    const model = {
        async list(query) { state.query = query; const items = records.filter(record => query.user_id === undefined || query.user_id === record.user_id); return { items, total: items.length }; },
        async findById(id, scope) { state.scope = scope; return records.find(record => record.borrow_id === id && (scope === null || record.user_id === scope)) ?? null; },
        async create(data) { state.writes++; return { ...header, ...data, borrow_id: "3" }; },
        async returnCopies(id) { state.writes++; return { ...header, borrow_id: id, status: "returned" }; },
        ...overrides,
    };
    const server = createApp({ authModel, tokens, borrowModel: model }).listen(0, "127.0.0.1");
    await once(server, "listening");const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (path, method = "GET", body, role) => {
        const response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(role ? { Authorization: `Bearer ${tokens.issue(principals[role].user_id)}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, body: await response.json(), location: response.headers.get("location") };
    };
    try { await run(request, state); } finally { server.closeAllConnections();await new Promise(resolve => server.close(resolve)); }
}

test("circulation routes require JWT; write permissions are separate and no role-name bypass", async () => {
    await withApp({}, async request => {
        for (const [path, method, body] of [["/api/borrows", "GET"], ["/api/borrows/1", "GET"], ["/api/borrows", "POST", requestBody], ["/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }]]) assert.equal((await request(path, method, body)).status, 401);
        for (const role of ["reader", "fakeAdmin"]) {
            assert.equal((await request("/api/borrows", "POST", requestBody, role)).status, 403);
            assert.equal((await request("/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }, role)).status, 403);
        }
        assert.equal((await request("/api/borrows", "POST", requestBody, "returnOnly")).status, 403);
        assert.equal((await request("/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }, "borrowOnly")).status, 403);
        for (const role of ["admin", "librarian"]) {
            const created = await request("/api/borrows", "POST", requestBody, role);assert.equal(created.status, 201);assert.equal(created.location, "/api/borrows/3");
            assert.equal((await request("/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }, role)).status, 200);
        }
    });
});

test("reader list and detail are ownership-scoped, forged user_id is denied and other IDs are 404", async () => {
    await withApp({}, async (request, state) => {
        const result = await request("/api/borrows/?page=1&limit=5", "GET", undefined, "reader");assert.equal(result.status, 200);assert.equal(result.body.data.length, 1);assert.equal(state.query.user_id, "30");
        assert.equal((await request("/api/borrows/1", "GET", undefined, "reader")).status, 200);assert.equal(state.scope, "30");
        assert.equal((await request("/api/borrows/2", "GET", undefined, "reader")).status, 404);
        assert.equal((await request("/api/borrows?user_id=99", "GET", undefined, "reader")).status, 403);
        assert.equal((await request("/api/borrows?user_id=30", "GET", undefined, "reader")).status, 403);
        assert.equal((await request("/api/borrows", "GET", undefined, "fakeAdmin")).status, 403);
        assert.equal((await request("/api/borrows", "GET", undefined, "returnOnly")).status, 403);
        assert.equal((await request("/api/borrows", "GET", undefined, "admin")).body.data.length, 2);
        assert.equal((await request("/api/borrows?user_id=99", "GET", undefined, "librarian")).body.data.length, 1);
    });
});

test("borrow validation rejects dates, duplicate/missing copies and client-controlled states", () => {
    for (const body of [{ ...requestBody, copy_ids: [] }, { ...requestBody, copy_ids: ["1", 1] }, { ...requestBody, copy_ids: ["0"] },
        { ...requestBody, copy_ids: Array.from({ length: 101 }, (_, i) => String(i + 1)) }, { ...requestBody, user_id: "0" },
        { ...requestBody, due_date: "2035-02-30T12:00:00Z" }, { ...requestBody, due_date: "2020-01-01T00:00:00Z" },
        { ...requestBody, due_date: "2035-01-01" }, { ...requestBody, due_date: "2035-01-01T12:00:00+07:00" },
        { ...requestBody, status: "returned" }, { ...requestBody, borrow_date: "2030-01-01" }, { ...requestBody, note: "a".repeat(65536) }]) assert.throws(() => validateBorrow(body), { status: 400 });
    assert.deepEqual(borrowData.copy_ids, ["2", "1"]);assert.equal(borrowData.due_date, "2035-01-01 12:00:00");
});

test("return validation supports explicit all or selected copies, never accepts statuses/user_id", () => {
    assert.deepEqual(validateReturn({ return_all: true, condition_after: "good" }), { return_all: true, condition_after: "good" });
    assert.equal(validateReturn({ items: [{ copy_id: "1", condition_after: "damaged" }] }).items[0].condition_after, "damaged");
    for (const body of [{}, { items: [] }, { items: [{ copy_id: "1", condition_after: "bad" }] }, { items: [{ copy_id: "1", condition_after: "good" }, { copy_id: 1, condition_after: "good" }] },
        { return_all: true }, { return_all: false }, { return_all: true, condition_after: "good", items: [] }, { return_all: true, condition_after: "good", user_id: "1" },
        { items: [{ copy_id: "1", condition_after: "good", status: "returned" }] }]) assert.throws(() => validateReturn(body), { status: 400 });
});

test("HTTP validation and query errors happen before model writes", async () => {
    await withApp({}, async (request, state) => {
        for (const body of [{ ...requestBody, copy_ids: [] }, { ...requestBody, copy_ids: ["1", "1"] }, { ...requestBody, status: "borrowed" }, { ...requestBody, due_date: "invalid" }]) assert.equal((await request("/api/borrows", "POST", body, "admin")).status, 400);
        assert.equal((await request("/api/borrows/1/return", "POST", { items: [] }, "admin")).status, 400);
        for (const path of ["/api/borrows?limit=101", "/api/borrows?status=invalid", "/api/borrows?user_id=0", "/api/borrows?search=secret", "/api/borrows/0"]) assert.equal((await request(path, "GET", undefined, "admin")).status, 400);
        assert.equal(state.writes, 0);
    });
});

function database(steps) {
    const calls = [];
    const connection = {
        async beginTransaction() { calls.push("begin"); }, async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); },
        async execute(sql, params) { calls.push({ sql, params });assert.ok(steps.length, "Unexpected SQL");const step = steps.shift();assert.match(sql, step.sql);if (step.error) throw step.error;return [step.rows]; },
    };
    return { calls, model: createBorrowModel({ async getConnection() { return connection; } }), done() { assert.equal(steps.length, 0); } };
}

function createSteps(ids = ["1", "2"]) {
    return [{ sql: /FROM NguoiDung .* FOR SHARE$/, rows: [{ user_id: "30", status: "active" }] },
        ...ids.map(id => ({ sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [copy(id)] })),
        ...ids.map(() => ({ sql: /FROM ChiTietPhieuMuon .* FOR UPDATE$/, rows: [] })),
        { sql: /^SELECT \(CAST\(\? AS DATETIME\)/, rows: [{ valid_due_date: "1" }] },
        { sql: /^INSERT INTO PhieuMuon/, rows: { insertId: "1" } },
        ...ids.flatMap(() => [{ sql: /^INSERT INTO ChiTietPhieuMuon/, rows: { affectedRows: 1 } }, { sql: /^UPDATE BanSaoSach SET availability_status = 'borrowed'/, rows: { affectedRows: 1 } }]),
        ...ids.map(() => ({ sql: /^INSERT INTO LichSuSuDung/, rows: { affectedRows: 1 } })),
        { sql: /FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon/, rows: ids.map(id => joined(id)) }];
}

test("create single/multiple borrow atomically locks sorted IDs and stores condition_before", async () => {
    for (const ids of [["1"], ["1", "2"], ["2", "10"]]) {
        const db = database(createSteps(ids));const result = await db.model.create({ ...borrowData, copy_ids: [...ids].reverse() });
        assert.equal(result.details.length, ids.length);assert.equal(result.borrow_id, "1");
        const locks = db.calls.filter(c => typeof c === "object" && c.sql.includes("FROM BanSaoSach"));assert.deepEqual(locks.map(c => c.params[0]), ids);
        for (const call of db.calls.filter(c => typeof c === "object" && c.sql.startsWith("INSERT INTO ChiTietPhieuMuon"))) assert.equal(call.params[2], "good");
        assert.deepEqual(db.calls.slice(-2), ["commit", "release"]);db.done();
    }
});

test("missing/inactive borrower rolls back before locking copies", async () => {
    for (const status of [null, "inactive", "locked"]) {
        const db = database([{ sql: /FROM NguoiDung .* FOR SHARE$/, rows: status ? [{ status }] : [] }]);
        await assert.rejects(db.model.create(borrowData), { status: status ? 409 : 404, code: status ? "BORROWER_INACTIVE" : "BORROWER_NOT_FOUND" });
        assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);db.done();
    }
});

test("missing copy, borrowed/maintenance/lost/damaged copy or stale loan roll back without INSERT", async () => {
    const cases = [null, copy("1", "borrowed"), copy("1", "maintenance"), copy("1", "lost"), { ...copy("1"), condition_status: "damaged" }, copy("1")];
    for (const [i, fixture] of cases.entries()) {
        const steps = [{ sql: /FOR SHARE$/, rows: [{ status: "active" }] }, { sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: fixture ? [fixture] : [] }];
        if (i === 5) steps.push({ sql: /FROM ChiTietPhieuMuon/, rows: [{ borrow_detail_id: "5" }] });
        const db = database(steps);
        await assert.rejects(db.model.create({ ...borrowData, copy_ids: ["1"] }), { status: fixture ? 409 : 404 });
        assert.ok(!db.calls.some(c => typeof c === "object" && c.sql.startsWith("INSERT")));assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);db.done();
    }
});

test("one invalid copy in a batch or due date expiring while waiting aborts whole create", async () => {
    let db = database([{ sql: /FOR SHARE$/, rows: [{ status: "active" }] }, { sql: /FOR UPDATE$/, rows: [copy("1")] }, { sql: /FOR UPDATE$/, rows: [] }]);
    await assert.rejects(db.model.create(borrowData), { status: 404 });assert.ok(!db.calls.some(c => typeof c === "object" && c.sql.startsWith("INSERT")));db.done();
    const steps = createSteps(["1"]);const cutoff = steps.findIndex(s => /CAST/.test(s.sql.source));steps.splice(cutoff, steps.length, { sql: /CAST/, rows: [{ valid_due_date: 0 }] });db = database(steps);
    await assert.rejects(db.model.create({ ...borrowData, copy_ids: ["1"] }), { status: 400, code: "INVALID_DUE_DATE" });db.done();
});

test("failure after detail INSERT or copy UPDATE rolls back rather than committing a partial loan", async () => {
    for (const sql of [/^INSERT INTO ChiTietPhieuMuon/, /^UPDATE BanSaoSach/]) {
        const steps = createSteps(["1"]);
        // Select the matching statement by explicit step order for this one-copy fixture.
        const target = sql.source.includes("INSERT") ? 5 : 6;
        steps.splice(target, steps.length, { sql, error: Object.assign(new Error("Private failure"), { code: "ER_LOCK_DEADLOCK" }) });
        const db = database(steps);await assert.rejects(db.model.create({ ...borrowData, copy_ids: ["1"] }), { code: "ER_LOCK_DEADLOCK" });
        assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);assert.ok(!db.calls.includes("commit"));db.done();
    }
});

function returnSteps(rows, selected, endRows = []) {
    const ids = [...new Set(rows.map(row => row.copy_id))].sort((a, b) => Number(a) - Number(b));
    return [{ sql: /FROM PhieuMuon .* FOR UPDATE$/, rows: [{ borrow_id: "1", user_id: "30", status: "borrowed" }] },
        { sql: /FROM ChiTietPhieuMuon WHERE borrow_id = \?$/, rows },
        ...ids.map(id => ({ sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [copy(id, "borrowed")] })),
        { sql: /FROM ChiTietPhieuMuon .* ORDER BY copy_id FOR UPDATE$/, rows },
        ...selected.map(id => ({ sql: /FROM ChiTietPhieuMuon WHERE copy_id = \?.*FOR UPDATE$/, rows: [rows.find(row => row.copy_id === id)] })),
        ...selected.flatMap(() => [{ sql: /^UPDATE ChiTietPhieuMuon/, rows: { affectedRows: 1 } }, { sql: /^UPDATE BanSaoSach/, rows: { affectedRows: 1 } }]),
        { sql: /^UPDATE PhieuMuon SET status = \?/, rows: { affectedRows: 1 } },
        ...selected.map(() => ({ sql: /^INSERT INTO LichSuSuDung/, rows: { affectedRows: 1 } })),
        { sql: /FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon/, rows: endRows.length ? endRows : rows.map(row => joined(row.copy_id)) }];
}

test("partial return updates detail and copy together, damaged -> maintenance, header partially_returned", async () => {
    const db = database(returnSteps([detail("1"), detail("2")], ["1"]));
    await db.model.returnCopies("1", { items: [{ copy_id: "1", condition_after: "damaged" }] });
    const writes = db.calls.filter(c => typeof c === "object" && c.sql.startsWith("UPDATE"));
    assert.deepEqual(writes[0].params, ["damaged", "101"]);assert.deepEqual(writes[1].params, ["damaged", "maintenance", "1"]);assert.deepEqual(writes[2].params, ["partially_returned", "1"]);
    assert.deepEqual(db.calls.slice(-2), ["commit", "release"]);db.done();
});

test("return all and finish a previously partial loan; preserve already returned details", async () => {
    for (const partial of [false, true]) {
        const rows = [partial ? { ...detail("1"), status: "returned", returned_at: "2026-11-06 01:00:00" } : detail("1"), detail("2")];
        const selected = partial ? ["2"] : ["1", "2"];
        const db = database(returnSteps(rows, selected));await db.model.returnCopies("1", { return_all: true, condition_after: "good" });
        const writes = db.calls.filter(c => typeof c === "object" && c.sql.startsWith("UPDATE"));
        assert.equal(writes.length, selected.length * 2 + 1);assert.deepEqual(writes.at(-1).params, ["returned", "1"]);
        for (const write of writes.filter(c => c.sql.startsWith("UPDATE BanSaoSach"))) assert.equal(write.params[1], "available");db.done();
    }
});

test("missing/completed/cancelled loan never changes data", async () => {
    for (const status of [null, "returned", "cancelled"]) {
        const db = database([{ sql: /FROM PhieuMuon .* FOR UPDATE$/, rows: status ? [{ borrow_id: "1", status }] : [] }]);
        await assert.rejects(db.model.returnCopies("1", { return_all: true, condition_after: "good" }), { status: status ? 409 : 404 });db.done();
    }
});

test("repeat return and copy from another loan fail before writes", async () => {
    for (const repeat of [false, true]) {
        const rows = [repeat ? { ...detail("1"), status: "returned", returned_at: "2026-11-06 00:00:00" } : detail("1")];
        const steps = returnSteps(rows, []);steps.splice(4);
        const db = database(steps);
        await assert.rejects(db.model.returnCopies("1", { items: [{ copy_id: repeat ? "1" : "99", condition_after: "good" }] }), { status: repeat ? 409 : 400, code: repeat ? "ALREADY_RETURNED" : "COPY_NOT_IN_BORROW" });
        assert.ok(!db.calls.some(c => typeof c === "object" && c.sql.startsWith("UPDATE")));db.done();
    }
});

test("inconsistent circulation or duplicate open loan is rejected, not silently repaired", async () => {
    for (const duplicate of [false, true]) {
        const steps = returnSteps([detail("1")], ["1"]);
        if (duplicate) steps[4].rows = [detail("1"), { ...detail("1"), borrow_detail_id: "999", borrow_id: "2" }];
        else steps[2].rows = [copy("1", "available")];
        steps.splice(duplicate ? 5 : 4);
        const db = database(steps);await assert.rejects(db.model.returnCopies("1", { items: [{ copy_id: "1", condition_after: "good" }] }), { status: 409, code: "RETURN_STATE_CONFLICT" });db.done();
    }
});

test("partial return batch with one invalid member or write failure rolls back entirely", async () => {
    let steps = returnSteps([detail("1"), detail("2")], ["1"]);steps.splice(6);let db = database(steps);
    await assert.rejects(db.model.returnCopies("1", { items: [{ copy_id: "1", condition_after: "good" }, { copy_id: "99", condition_after: "good" }] }), { status: 400 });
    assert.ok(!db.calls.some(c => typeof c === "object" && c.sql.startsWith("UPDATE")));db.done();
    steps = returnSteps([detail("1")], ["1"]);steps.splice(6, steps.length, { sql: /^UPDATE BanSaoSach/, error: Object.assign(new Error("Private failure"), { code: "ER_LOCK_DEADLOCK" }) });db = database(steps);
    await assert.rejects(db.model.returnCopies("1", { items: [{ copy_id: "1", condition_after: "good" }] }), { code: "ER_LOCK_DEADLOCK" });assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);db.done();
});

test("reader SQL scopes count, list and joined detail in the database before returning any rows", async () => {
    const calls = [];
    const model = createBorrowModel({ async execute(sql, params) { calls.push({ sql, params });return sql.includes("COUNT(*)") ? [[{ total: "0" }]] : [[]]; }, async query(sql, params) { calls.push({ sql, params });return [[]]; } });
    await model.list({ user_id: "30", status: "borrowed", limit: 5, offset: 0 });assert.equal(await model.findById("2", "30"), null);
    for (const call of calls) { assert.ok(call.sql.includes("p.user_id = ?"));assert.ok(call.params.includes("30"));assert.ok(!call.sql.includes("password")); }
    assert.deepEqual(calls.at(-1).params, ["2", "30"]);
});

test("HTTP with real circulation model propagates unavailable copy and repeat return as 409, rolling back", async () => {
    let db = database([{ sql: /FROM NguoiDung/, rows: [{ status: "active" }] }, { sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [copy("1", "borrowed")] }]);
    await withApp(db.model, async request => {
        const result = await request("/api/borrows", "POST", { ...requestBody, copy_ids: ["1"] }, "admin");
        assert.equal(result.status, 409);assert.equal(result.body.error.code, "COPY_NOT_BORROWABLE");
    });assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);db.done();
    db = database([{ sql: /FROM PhieuMuon .* FOR UPDATE$/, rows: [{ borrow_id: "1", status: "returned" }] }]);
    await withApp(db.model, async request => {
        const result = await request("/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }, "librarian");
        assert.equal(result.status, 409);assert.equal(result.body.error.code, "BORROW_NOT_RETURNABLE");
    });db.done();
});

test("empty/duplicate/changed loan details fail closed instead of inventing or deleting history", async () => {
    for (const rows of [[], [detail("1"), { ...detail("1"), borrow_detail_id: "999" }]]) {
        const db = database([{ sql: /FROM PhieuMuon .* FOR UPDATE$/, rows: [{ status: "borrowed" }] }, { sql: /FROM ChiTietPhieuMuon/, rows }]);
        await assert.rejects(db.model.returnCopies("1", { return_all: true, condition_after: "good" }), { status: 409, code: "BORROW_REQUIRES_REVIEW" });db.done();
    }
    const steps = returnSteps([detail("1")], []);steps[3].rows = [{ ...detail("1"), copy_id: "2" }];steps.splice(4);
    const db = database(steps);await assert.rejects(db.model.returnCopies("1", { return_all: true, condition_after: "good" }), { status: 409, code: "BORROW_CHANGED" });db.done();
});

test("two simulated concurrent borrowers compete for the same copy: only one commits", async () => {
    let tail = Promise.resolve(), state = "available", commits = 0;
    const fakePool = { async getConnection() {
        let unlock, pending = false;
        return {
            async beginTransaction() {},
            async execute(sql) {
                if (sql.includes("FROM NguoiDung")) return [[{ status: "active" }]];
                if (sql.includes("FROM BanSaoSach")) { const previous = tail;tail = new Promise(resolve => { unlock = resolve; });await previous;return [[copy("1", state)]]; }
                if (sql.includes("FROM ChiTietPhieuMuon")) return [[]];
                if (sql.includes("CAST(")) return [[{ valid_due_date: 1 }]];
                if (sql.startsWith("INSERT INTO PhieuMuon")) return [{ insertId: "1" }];
                if (sql.startsWith("UPDATE BanSaoSach")) pending = true;
                if (sql.includes("FROM PhieuMuon p LEFT JOIN")) return [[joined("1")]];
                return [{ affectedRows: 1 }];
            },
            async commit() { if (pending) { state = "borrowed";commits++; }unlock?.(); },
            async rollback() { unlock?.(); }, release() {},
        };
    } };
    const model = createBorrowModel(fakePool);
    const results = await Promise.allSettled([model.create({ ...borrowData, copy_ids: ["1"] }), model.create({ ...borrowData, copy_ids: ["1"], user_id: "40" })]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);assert.equal(commits, 1);assert.equal(state, "borrowed");
    assert.equal(results.find(result => result.status === "rejected").reason.code, "COPY_NOT_BORROWABLE");
});

test.after(async () => { await pool.end(); });
