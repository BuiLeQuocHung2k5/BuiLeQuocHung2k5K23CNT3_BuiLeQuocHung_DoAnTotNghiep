import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { buildApp } from "../src/app-factory.js";
import { createJwtService } from "../src/utils/jwt.js";
import { createFineModel } from "../src/models/fine.model.js";
import { createOverdueModel } from "../src/models/overdue.model.js";
import { calculateFine } from "../src/utils/fine-policy.js";
import { validateFine, validatePayment } from "../src/utils/fine-validation.js";

const header = { borrow_id: "1", status: "returned", due_date: "2026-11-01 00:00:00", borrow_date: "2026-10-01 00:00:00" };
const detail = { borrow_detail_id: "11", borrow_id: "1", copy_id: "21", status: "returned", returned_at: "2026-11-02 00:00:01", condition_before: "good", condition_after: "good", late_seconds: "86401", valid_timeline: 1 };
const rule = { fine_rule_id: "2", rule_type: "late", amount: "1.25", unit: "per_day", is_active: 1 };
const fine = { fine_id: "5", borrow_detail_id: "11", fine_rule_id: "2", fine_type: "late", amount: "2.50", reason: null, assessed_at: "2026-11-03 00:00:00", payment_status: "unpaid", paid_at: null, borrow_id: "1", copy_id: "21", user_id: "30" };
const body = { borrow_detail_id: "11", fine_rule_id: "2" };

async function withApp(overrides, work) {
    const key = randomBytes(48).toString("base64url"), tokens = createJwtService({ getSecret: () => key });
    const principals = {
        admin: { user_id: "10", roles: ["admin"], permissions: ["fine_manage", "borrow_manage"] },
        librarian: { user_id: "20", roles: ["librarian"], permissions: ["fine_manage", "borrow_manage"] },
        reader: { user_id: "30", roles: ["reader"], permissions: ["book_view"] },
        fakeAdmin: { user_id: "40", roles: ["admin"], permissions: [] },
        fineOnly: { user_id: "50", roles: ["staff"], permissions: ["fine_manage"] },
        borrowOnly: { user_id: "60", roles: ["staff"], permissions: ["borrow_manage"] },
    };
    const state = { queries: [], owners: [], writes: 0 };
    const records = [fine, { ...fine, fine_id: "6", user_id: "99" }];
    const fineModel = {
        async list(query) { state.queries.push(query); const items = records.filter(r => query.user_id === undefined || r.user_id === query.user_id); return { items, total: items.length }; },
        async findById(id, owner) { state.owners.push(owner); return records.find(r => r.fine_id === id && (owner === null || owner === r.user_id)) ?? null; },
        async create(data) { state.writes++; return { ...fine, ...data }; },
        async pay(id) { state.writes++; return { ...fine, fine_id: id, payment_status: "paid", paid_at: "2026-11-07 00:00:00" }; },
    };
    const overdueModel = {
        async list(query) { state.queries.push(query); return { items: [], total: 0, as_of: "2026-11-07 00:00:00" }; },
        async findByBorrow(id, owner) { state.owners.push(owner); return id === "1" && (owner === null || owner === "30") ? { borrow_id: id, is_overdue: false, details: [] } : null; },
    };
    const database = { async query() { throw new Error("Unexpected database access"); } };
    const authModel = { async getPrincipal(id) { const p = Object.values(principals).find(p => p.user_id === id); return p ? { ...p, status: "active" } : null; } };
    const server = buildApp({ database, tokens, authModel, fineModel, overdueModel, ...overrides }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const request = async (path, method = "GET", data, role) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { ...(data !== undefined ? { "Content-Type": "application/json" } : {}), ...(role ? { Authorization: `Bearer ${tokens.issue(principals[role].user_id)}` } : {}) }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
        return { status: response.status, body: await response.json(), location: response.headers.get("location") };
    };
    try { await work(request, state); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test("all fine/overdue endpoints require JWT", async () => {
    await withApp({}, async request => {
        for (const [path, method, data] of [["/api/overdues", "GET"], ["/api/borrows/1/overdue", "GET"], ["/api/fines", "GET"], ["/api/fines/5", "GET"], ["/api/fines", "POST", body], ["/api/fines/5/payment", "PATCH", { payment_status: "paid" }]]) assert.equal((await request(path, method, data)).status, 401);
    });
});

test("only fine_manage grants writes; admin/librarian allowed, missing grant and reader fail closed", async () => {
    await withApp({}, async (request, state) => {
        for (const role of ["reader", "fakeAdmin", "borrowOnly"]) {
            assert.equal((await request("/api/fines", "POST", body, role)).status, 403);
            assert.equal((await request("/api/fines/5/payment", "PATCH", { payment_status: "paid" }, role)).status, 403);
        }
        assert.equal(state.writes, 0);
        for (const role of ["admin", "librarian", "fineOnly"]) {
            const result = await request("/api/fines", "POST", body, role);
            assert.equal(result.status, 201); assert.equal(result.location, "/api/fines/5");
            assert.equal((await request("/api/fines/5/payment", "PATCH", { payment_status: "paid" }, role)).status, 200);
        }
    });
});

test("reader fines are scoped, other user IDs are hidden and filtering user_id is forbidden", async () => {
    await withApp({}, async (request, state) => {
        const response = await request("/api/fines/?page=1&limit=2&payment_status=unpaid", "GET", undefined, "reader");
        assert.equal(response.status, 200); assert.equal(response.body.data.length, 1); assert.equal(response.body.pagination.total, 1); assert.equal(state.queries[0].user_id, "30");
        assert.equal((await request("/api/fines/5", "GET", undefined, "reader")).status, 200); assert.equal(state.owners.at(-1), "30");
        assert.equal((await request("/api/fines/6", "GET", undefined, "reader")).status, 404);
        assert.equal((await request("/api/fines?user_id=30", "GET", undefined, "reader")).status, 403);
        assert.equal((await request("/api/fines", "GET", undefined, "fakeAdmin")).status, 403);
        assert.equal((await request("/api/fines", "GET", undefined, "borrowOnly")).status, 403);
        assert.equal((await request("/api/fines", "GET", undefined, "admin")).body.data.length, 2);
    });
});

test("overdue scope uses borrow_manage or reader ownership, not fine_manage or role label", async () => {
    await withApp({}, async (request, state) => {
        assert.equal((await request("/api/overdues?borrow_id=1", "GET", undefined, "reader")).status, 200); assert.equal(state.queries[0].user_id, "30");
        assert.equal((await request("/api/borrows/1/overdue", "GET", undefined, "reader")).status, 200); assert.equal(state.owners.at(-1), "30");
        assert.equal((await request("/api/borrows/2/overdue", "GET", undefined, "reader")).status, 404);
        assert.equal((await request("/api/overdues?user_id=99", "GET", undefined, "reader")).status, 403);
        for (const role of ["fakeAdmin", "fineOnly"]) assert.equal((await request("/api/overdues", "GET", undefined, role)).status, 403);
        assert.equal((await request("/api/overdues?user_id=99", "GET", undefined, "borrowOnly")).status, 200);
    });
});

test("fine validation accepts only server-priced fields and payment only unpaid-to-paid intent", () => {
    assert.deepEqual(validateFine(body), { ...body, reason: null });
    for (const invalid of [{}, { ...body, borrow_detail_id: "0" }, { ...body, fine_rule_id: -1 }, { ...body, amount: -1 }, { ...body, amount: "10.00" }, { ...body, fine_type: "late" }, { ...body, user_id: "1" }, { ...body, paid_at: "now" }, { ...body, payment_status: "paid" }, { ...body, reason: "x".repeat(256) }]) assert.throws(() => validateFine(invalid), { status: 400 });
    assert.deepEqual(validatePayment({ payment_status: "paid" }), { payment_status: "paid" });
    for (const invalid of [{}, { payment_status: "unpaid" }, { payment_status: "waived" }, { payment_status: "paid", amount: 0 }, { payment_status: "paid", paid_at: "now" }]) assert.throws(() => validatePayment(invalid), { status: 400 });
});

test("HTTP rejects invalid body/query/ID before persistence and returns scoped 404", async () => {
    await withApp({}, async (request, state) => {
        assert.equal((await request("/api/fines", "POST", { ...body, amount: -1 }, "admin")).status, 400);
        assert.equal((await request("/api/fines/5/payment", "PATCH", { payment_status: "waived" }, "admin")).status, 400);
        for (const path of ["/api/fines?limit=101", "/api/fines?fine_type=invalid", "/api/fines?payment_status=invalid", "/api/fines?search=x", "/api/fines?borrow_detail_id=0", "/api/fines/0", "/api/overdues?status=overdue", "/api/borrows/0/overdue", "/api/borrows/1/overdue?user_id=99"]) assert.equal((await request(path, "GET", undefined, "admin")).status, 400);
        assert.equal((await request("/api/fines/999", "GET", undefined, "admin")).status, 404); assert.equal(state.writes, 0);
    });
});

test("late per_day rounds positive seconds up to complete 24-hour units, using exact cents", () => {
    for (const [seconds, expected] of [["1", "1.25"], ["86400", "1.25"], ["86401", "2.50"], ["172800", "2.50"]]) assert.equal(calculateFine(rule, { ...detail, late_seconds: seconds }, header), expected);
    assert.equal(calculateFine({ ...rule, amount: "0.10" }, { ...detail, late_seconds: "172801" }, header), "0.30");
    assert.equal(calculateFine({ ...rule, unit: "fixed" }, detail, header), "1.25");
    assert.equal(calculateFine({ ...rule, amount: "0.00" }, detail, header), "0.00");
});

test("on-time and unreturned loans cannot create final late fines", () => {
    for (const seconds of ["0", "-1", null, "bad"]) assert.throws(() => calculateFine(rule, { ...detail, late_seconds: seconds }, header), { status: 409, code: "NOT_LATE" });
    for (const changed of [{ ...detail, status: "borrowed", returned_at: null }, { ...detail, returned_at: null }, { ...detail, status: "lost" }]) assert.throws(() => calculateFine(rule, changed, header), { code: "FINE_REQUIRES_RETURN" });
    for (const status of ["borrowed", "overdue", "cancelled"]) assert.throws(() => calculateFine(rule, detail, { ...header, status }), { code: "FINE_REQUIRES_RETURN" });
});

test("damage requires fixed active configuration and confirmed good-to-damaged return", () => {
    const damage = { ...rule, rule_type: "damage", unit: "fixed", amount: "50.05" };
    assert.equal(calculateFine(damage, { ...detail, condition_after: "damaged" }, { ...header, status: "partially_returned" }), "50.05");
    for (const changed of [detail, { ...detail, condition_before: "damaged", condition_after: "damaged" }]) assert.throws(() => calculateFine(damage, changed, header), { code: "DAMAGE_NOT_CONFIRMED" });
    assert.throws(() => calculateFine({ ...damage, unit: "per_day" }, detail, header), { code: "FINE_RULE_UNSUPPORTED" });
});

test("inactive/unsupported rules, invalid timeline and negative/overflow amounts fail closed", () => {
    assert.throws(() => calculateFine({ ...rule, is_active: 0 }, detail, header), { code: "FINE_RULE_INACTIVE" });
    for (const type of ["lost", "other"]) assert.throws(() => calculateFine({ ...rule, rule_type: type }, detail, header), { code: "FINE_RULE_UNSUPPORTED" });
    assert.throws(() => calculateFine(rule, { ...detail, valid_timeline: 0 }, header), { code: "FINE_STATE_CONFLICT" });
    for (const amount of ["-1.00", "1.234", "10000000000.00", "NaN"]) assert.throws(() => calculateFine({ ...rule, amount }, detail, header), { code: "INVALID_FINE_RULE_AMOUNT" });
    assert.throws(() => calculateFine({ ...rule, amount: "9999999999.99" }, detail, header), { code: "FINE_AMOUNT_OUT_OF_RANGE" });
    assert.equal(calculateFine({ ...rule, amount: "9999999999.99", unit: "fixed" }, detail, header), "9999999999.99");
});

function database(steps) {
    const calls = [];
    const connection = {
        async beginTransaction() { calls.push("begin"); }, async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); },
        async execute(sql, params) { calls.push({ sql, params }); const next = steps.shift(); assert.ok(next, "Unexpected SQL"); assert.match(sql, next.sql); if (next.params) assert.deepEqual(params, next.params); if (next.error) throw next.error; return [next.rows]; },
    };
    return { calls, model: createFineModel({ async getConnection() { return connection; } }), done() { assert.equal(steps.length, 0); } };
}
function createSteps(changes = {}) {
    return [
        { sql: /^SELECT borrow_id FROM ChiTietPhieuMuon/, rows: [{ borrow_id: "1" }] },
        { sql: /FROM PhieuMuon .*FOR SHARE$/, rows: [header] },
        { sql: /FROM ChiTietPhieuMuon .*FOR UPDATE$/, rows: [{ ...detail, ...changes }] },
        { sql: /FROM QuyDinhPhat .*FOR SHARE$/, rows: [rule] },
        { sql: /FROM Phat .*FOR UPDATE$/, rows: [] },
        { sql: /^INSERT INTO Phat/, rows: { insertId: "5" }, params: ["11", "2", "late", "2.50", null] },
        { sql: /FROM Phat f JOIN ChiTietPhieuMuon/, rows: [fine] },
    ];
}

test("fine create locks parent/detail/rule, uses calculated string amount and commits only Phat", async () => {
    const db = database(createSteps()); const result = await db.model.create(validateFine(body));
    assert.equal(result.amount, "2.50"); assert.equal(result.fine_id, "5"); assert.deepEqual(db.calls.slice(-2), ["commit", "release"]);
    const writes = db.calls.filter(c => c.sql && /^(INSERT|UPDATE|DELETE)/.test(c.sql)); assert.equal(writes.length, 1); assert.match(writes[0].sql, /^INSERT INTO Phat/);
    db.done();
});

test("missing detail/header/rule stops creation with 404 and rollback", async () => {
    for (const index of [0, 1, 3]) {
        const steps = createSteps(); steps[index].rows = []; steps.splice(index + 1); const db = database(steps);
        await assert.rejects(db.model.create(validateFine(body)), { status: 404 }); assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]); db.done();
    }
});

test("duplicate fine blocks another rule or any paid/waived prior record of the same type", async () => {
    const steps = createSteps(); steps[4].rows = [{ fine_id: "9" }]; steps.splice(5); const db = database(steps);
    await assert.rejects(db.model.create(validateFine(body)), { status: 409, code: "DUPLICATE_FINE" });
    const duplicateQuery = db.calls.find(c => c.sql && /FROM Phat WHERE/.test(c.sql)); assert.deepEqual(duplicateQuery.params, ["11", "late"]); assert.ok(!duplicateQuery.sql.includes("payment_status"));
    assert.ok(!db.calls.some(c => c.sql?.startsWith("INSERT"))); assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]); db.done();
});

test("moved detail, inactive rule and unsupported lost configuration abort before INSERT", async () => {
    for (const scenario of ["moved", "inactive", "lost"]) {
        const steps = createSteps();
        if (scenario === "moved") { steps[2].rows[0].borrow_id = "99"; steps.splice(3); }
        else { steps[3].rows = [{ ...rule, ...(scenario === "lost" ? { rule_type: "lost" } : { is_active: 0 }) }]; steps.splice(4); }
        const db = database(steps); await assert.rejects(db.model.create(validateFine(body)), { status: 409 }); assert.ok(!db.calls.includes("commit")); db.done();
    }
});

test("fine INSERT or subsequent read failure rolls back and never commits", async () => {
    for (const index of [5, 6]) {
        const steps = createSteps(); steps[index].error = Object.assign(new Error("Private SQL data"), { code: "ER_LOCK_DEADLOCK" }); steps.splice(index + 1);
        const db = database(steps); await assert.rejects(db.model.create(validateFine(body)), { code: "ER_LOCK_DEADLOCK" }); assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]); assert.ok(!db.calls.includes("commit")); db.done();
    }
});

test("payment locks fine, timestamps server-side and leaves loan history untouched", async () => {
    const db = database([{ sql: /FROM Phat .*FOR UPDATE$/, rows: [fine] }, { sql: /^UPDATE Phat SET payment_status = 'paid', paid_at = UTC_TIMESTAMP\(\)/, params: ["5"], rows: { affectedRows: 1 } }, { sql: /FROM Phat f JOIN/, rows: [{ ...fine, payment_status: "paid", paid_at: "2026-11-07 00:00:00" }] }]);
    const result = await db.model.pay("5"); assert.equal(result.payment_status, "paid"); assert.deepEqual(db.calls.slice(-2), ["commit", "release"]); db.done();
});

test("missing, repeated, waived or inconsistent payment cannot be recorded again", async () => {
    for (const row of [null, { ...fine, payment_status: "paid" }, { ...fine, payment_status: "waived" }, { ...fine, paid_at: "2026-11-07 00:00:00" }]) {
        const db = database([{ sql: /FROM Phat .*FOR UPDATE$/, rows: row ? [row] : [] }]);
        await assert.rejects(db.model.pay("5"), { status: row ? 409 : 404 }); assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]); db.done();
    }
});

test("payment write failure rolls back", async () => {
    const db = database([{ sql: /FROM Phat .*FOR UPDATE$/, rows: [fine] }, { sql: /^UPDATE Phat/, error: new Error("private") }]);
    await assert.rejects(db.model.pay("5")); assert.ok(!db.calls.includes("commit")); assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]); db.done();
});

test("fine HTTP propagates missing configuration, duplicate and repeated payment without SQL leaks", async () => {
    let steps = createSteps(); steps[3].rows = []; steps.splice(4); let db = database(steps);
    await withApp({ fineModel: db.model }, async request => { const response = await request("/api/fines", "POST", body, "admin"); assert.equal(response.status, 404); assert.equal(response.body.error.code, "FINE_RULE_NOT_FOUND"); }); db.done();
    steps = createSteps(); steps[4].rows = [{ fine_id: "5" }]; steps.splice(5); db = database(steps);
    await withApp({ fineModel: db.model }, async request => assert.equal((await request("/api/fines", "POST", body, "librarian")).status, 409)); db.done();
    db = database([{ sql: /FROM Phat .*FOR UPDATE$/, rows: [{ ...fine, payment_status: "paid" }] }]);
    await withApp({ fineModel: db.model }, async request => assert.equal((await request("/api/fines/5/payment", "PATCH", { payment_status: "paid" }, "admin")).status, 409)); db.done();
    db = database([{ sql: /SELECT borrow_id/, error: Object.assign(new Error("Private SQL data"), { code: "ER_LOCK_DEADLOCK" }) }]);
    await withApp({ fineModel: db.model }, async request => { const response = await request("/api/fines", "POST", body, "admin"); assert.equal(response.status, 503); assert.ok(!JSON.stringify(response.body).includes("Private")); }); db.done();
});

test("SQL scopes fine COUNT/list/detail by JWT owner before returning rows, preserving nullable rule", async () => {
    const calls = [], pool = {
        async execute(sql, params) { calls.push({ sql, params }); return sql.includes("COUNT(*)") ? [[{ total: "0" }]] : [[{ ...fine, fine_rule_id: null }]]; },
        async query(sql, params) { calls.push({ sql, params }); return [[]]; },
    };
    const model = createFineModel(pool); await model.list({ user_id: "30", fine_type: "late", payment_status: "unpaid", limit: 5, offset: 0 });
    assert.equal((await model.findById("5", "30")).fine_rule_id, null);
    for (const c of calls) { assert.match(c.sql, /p.user_id = \?/); assert.ok(c.params.includes("30")); assert.ok(!/password|email|phone/.test(c.sql)); }
});

const overdueRow = { borrow_id: "1", due_date: "2026-11-01 00:00:00", status: "borrowed", borrow_detail_id: "11", copy_id: "21", detail_status: "borrowed", returned_at: null, days_overdue: "2", past_due: 1 };
async function overdueSummary(rows, owner = "30") {
    const calls = [];
    const model = createOverdueModel({ async query(sql) { assert.match(sql, /^SELECT/); return [[{ as_of: "2026-11-03 00:00:01" }]]; }, async execute(sql, params) { calls.push({ sql, params }); assert.match(sql, /^SELECT/); return [rows]; } });
    return { result: await model.findByBorrow("1", owner), calls };
}

test("overdue summary does not trust stored overdue status when due date is in the future", async () => {
    for (const status of ["borrowed", "overdue"]) { const { result } = await overdueSummary([{ ...overdueRow, status, past_due: 0 }]); assert.equal(result.is_overdue, false); assert.equal(result.overdue_count, 0); }
});

test("past-due unreturned borrowed detail is overdue without any database UPDATE", async () => {
    const { result, calls } = await overdueSummary([overdueRow]); assert.equal(result.is_overdue, true); assert.equal(result.details[0].days_overdue, 2);
    assert.match(calls[0].sql, /p.user_id = \?/); assert.deepEqual(calls[0].params, ["2026-11-03 00:00:01", "2026-11-03 00:00:01", "1", "30"]);
});

test("fully returned/cancelled or empty loan is not currently overdue even if originally late", async () => {
    for (const changed of [{ status: "returned" }, { status: "cancelled" }, { detail_status: "returned", returned_at: "2026-11-02 00:00:00" }, { borrow_detail_id: null }, { detail_status: "lost" }]) assert.equal((await overdueSummary([{ ...overdueRow, ...changed }])).result.is_overdue, false);
    assert.equal((await overdueSummary([])).result, null);
});

test("partially returned loan reports only remaining borrowed, unreturned details", async () => {
    const { result } = await overdueSummary([{ ...overdueRow, status: "partially_returned" }, { ...overdueRow, status: "partially_returned", borrow_detail_id: "12", copy_id: "22", detail_status: "returned", returned_at: "2026-11-02 00:00:00" }]);
    assert.equal(result.overdue_count, 1); assert.deepEqual(result.details.map(d => d.copy_id), ["21"]);
});

test("overdue list filters deadline/open states in SQL, scopes both count and page and freezes clock", async () => {
    const calls = [], asOf = "2026-11-03 00:00:01";
    const model = createOverdueModel({
        async execute(sql, params) { calls.push({ sql, params }); return [[{ total: "1" }]]; },
        async query(sql, params) { calls.push({ sql, params }); return sql.includes("UTC_TIMESTAMP") ? [[{ as_of: asOf }]] : [[{ ...overdueRow, user_id: "30" }]]; },
    });
    const result = await model.list({ user_id: "30", borrow_id: "1", limit: 5, offset: 0 }); assert.equal(result.total, 1); assert.equal(result.as_of, asOf);
    for (const c of calls.slice(1)) { assert.match(c.sql, /d.status = 'borrowed' AND d.returned_at IS NULL AND p.due_date < \?/); assert.match(c.sql, /p.user_id = \?/); assert.ok(c.params.includes("30")); assert.ok(c.params.includes(asOf)); }
    assert.deepEqual(calls.at(-1).params, [asOf, asOf, "30", "1", 5, 0]); assert.ok(calls.every(c => c.sql.startsWith("SELECT")));
});

test("simulated simultaneous fine creation on one detail permits one assessment only", async () => {
    let tail = Promise.resolve(), exists = false, commits = 0;
    const pool = { async getConnection() {
        let unlock, pending = false;
        return {
            async beginTransaction() {},
            async execute(sql) {
                if (sql.startsWith("SELECT borrow_id FROM ChiTietPhieuMuon")) return [[{ borrow_id: "1" }]];
                if (sql.includes("FROM PhieuMuon WHERE")) return [[header]];
                if (sql.includes("FROM ChiTietPhieuMuon WHERE")) { const previous = tail; tail = new Promise(resolve => { unlock = resolve; }); await previous; return [[detail]]; }
                if (sql.includes("FROM QuyDinhPhat")) return [[rule]];
                if (sql.includes("FROM Phat WHERE")) return [exists ? [{ fine_id: "5" }] : []];
                if (sql.startsWith("INSERT INTO Phat")) { pending = true; return [{ insertId: "5" }]; }
                if (sql.includes("FROM Phat f JOIN")) return [[fine]];
                throw new Error("Unexpected SQL");
            },
            async commit() { if (pending) { exists = true; commits++; } unlock?.(); }, async rollback() { unlock?.(); }, release() {},
        };
    } };
    const model = createFineModel(pool), result = await Promise.allSettled([model.create(validateFine(body)), model.create(validateFine(body))]);
    assert.equal(result.filter(r => r.status === "fulfilled").length, 1); assert.equal(commits, 1); assert.equal(result.find(r => r.status === "rejected").reason.code, "DUPLICATE_FINE");
});

test("fine foreign key race rolls back and returns resource-specific safe 400", async () => {
    const steps = createSteps(); steps[5].error = Object.assign(new Error("Private FK statement"), { code: "ER_NO_REFERENCED_ROW_2" }); steps.splice(6);
    const db = database(steps);
    await withApp({ fineModel: db.model }, async request => {
        const response = await request("/api/fines", "POST", body, "admin"); assert.equal(response.status, 400); assert.equal(response.body.error.code, "INVALID_FINE_REFERENCE"); assert.ok(!JSON.stringify(response.body).includes("Private"));
    });
    assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]); db.done();
});

test("simulated simultaneous payment records paid_at only once", async () => {
    let tail = Promise.resolve(), paid = false, commits = 0;
    const model = createFineModel({ async getConnection() {
        let unlock, pending = false;
        return {
            async beginTransaction() {},
            async execute(sql) {
                if (sql.includes("FROM Phat WHERE")) { const previous = tail; tail = new Promise(resolve => { unlock = resolve; }); await previous; return [[{ ...fine, payment_status: paid ? "paid" : "unpaid" }]]; }
                if (sql.startsWith("UPDATE Phat")) { pending = true; return [{ affectedRows: 1 }]; }
                if (sql.includes("FROM Phat f JOIN")) return [[{ ...fine, payment_status: "paid" }]];
                throw new Error("Unexpected SQL");
            },
            async commit() { if (pending) { paid = true; commits++; } unlock?.(); }, async rollback() { unlock?.(); }, release() {},
        };
    } });
    const results = await Promise.allSettled([model.pay("5"), model.pay("5")]); assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal(commits, 1); assert.equal(results.find(r => r.status === "rejected").reason.code, "FINE_NOT_PAYABLE");
});
