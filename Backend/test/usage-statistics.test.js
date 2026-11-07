import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { buildApp } from "../src/app-factory.js";
import { createJwtService } from "../src/utils/jwt.js";
import { dateRange, validateUsageQuery, validateStatisticsQuery, validateUsageEvent } from "../src/utils/analytics-validation.js";
import { createUsageHistoryService } from "../src/services/usage-history.service.js";
import { createUsageHistoryModel } from "../src/models/usage-history.model.js";
import { createStatisticsModel } from "../src/models/statistics.model.js";
import { createAuthService } from "../src/services/auth.service.js";
import { createAuthModel } from "../src/models/auth.model.js";
import { createBorrowModel } from "../src/models/borrow.model.js";

const period = { start_date: "2026-11-01", end_date: "2026-11-03" };
const range = dateRange(period), queryString = "start_date=2026-11-01&end_date=2026-11-03";

async function withApp(work, overrides = {}) {
    const key = randomBytes(48).toString("base64url"), tokens = createJwtService({ getSecret: () => key });
    const principals = {
        admin: { user_id: "10", roles: ["admin"], permissions: ["report_view"] },
        librarian: { user_id: "20", roles: ["librarian"], permissions: ["report_view"] },
        reader: { user_id: "30", roles: ["reader"], permissions: ["book_view"] },
        otherReader: { user_id: "31", roles: ["reader"], permissions: ["book_view"] },
        fakeAdmin: { user_id: "40", roles: ["admin"], permissions: [] },
        forecastOnly: { user_id: "50", roles: ["staff"], permissions: ["forecast_view"] },
    };
    const records = [{ usage_id: "1", user_id: "30", copy_id: null, action_type: "login", action_date: "2026-11-01 00:00:00" }, { usage_id: "2", user_id: "31", copy_id: "1", action_type: "borrow", action_date: "2026-11-01 01:00:00" }, { usage_id: "3", user_id: "10", copy_id: null, action_type: "login", action_date: "2026-11-01 02:00:00" }];
    const state = { queries: [], calls: 0 };
    const usageHistoryModel = { async list(query) { state.queries.push(query); const rows = records.filter(r => query.user_id === undefined || r.user_id === query.user_id).filter(r => query.action_type === undefined || r.action_type === query.action_type); return { items: rows.slice(query.offset, query.offset + query.limit), total: rows.length }; } };
    const statisticsModel = {
        async overview(query) { state.calls++; state.queries.push(query); return { books_total: 2, copies_total: 3, users_total: 2, borrows_total: 2, borrows_in_period: 2, borrowed_copies_in_period: 3, returned_copies_in_period: 1 }; },
        async borrows(query) { state.calls++; state.queries.push(query); return [{ period_start: "2026-11-01", borrow_count: 2, borrowed_copy_count: 3 }]; },
        async users(query) { state.calls++; state.queries.push(query); return { items: [{ user_id: "30", borrow_count: 2, active_days: 1, usage_event_count: 4, login_count: 1, borrow_copy_events: 2, return_copy_events: 1 }], total: 1 }; },
    };
    const database = { async query() { throw new Error("Unexpected default database access"); } };
    const authModel = { async getPrincipal(id) { const principal = Object.values(principals).find(p => p.user_id === id); return principal ? { ...principal, status: "active" } : null; } };
    const server = buildApp({ database, tokens, authModel, usageHistoryModel, statisticsModel, ...overrides }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const request = async (path, role, method = "GET") => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: role ? { Authorization: `Bearer ${tokens.issue(principals[role].user_id)}` } : {} });
        return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
    };
    try { await work(request, state); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test("usage and all administrative statistics endpoints require JWT", async () => {
    await withApp(async request => {
        for (const path of ["/api/usage-history", "/api/usage-history/me", "/api/statistics/overview", "/api/statistics/borrows", "/api/statistics/users"]) assert.equal((await request(path)).status, 401);
    });
});

test("reader history is SQL-scoped through service query; paging and event filter work", async () => {
    await withApp(async (request, state) => {
        const response = await request(`/api/usage-history/?${queryString}&page=1&limit=1&action_type=login`, "reader");
        assert.equal(response.status, 200); assert.equal(response.body.data.length, 1); assert.equal(response.body.data[0].user_id, "30"); assert.equal(response.body.pagination.total, 1); assert.equal(state.queries[0].user_id, "30"); assert.equal(response.cache, "no-store");
        assert.equal((await request(`/api/usage-history?${queryString}&user_id=31`, "reader")).status, 403);
        assert.equal((await request(`/api/usage-history?${queryString}&user_id=30`, "reader")).status, 403);
    });
});

test("report_view allows whole history; me always means JWT owner even for administrators", async () => {
    await withApp(async (request, state) => {
        for (const role of ["admin", "librarian"]) assert.equal((await request(`/api/usage-history?${queryString}`, role)).body.data.length, 3);
        const me = await request(`/api/usage-history/me?${queryString}`, "admin"); assert.deepEqual(me.body.data.map(r => r.user_id), ["10"]); assert.equal(state.queries.at(-1).user_id, "10");
        assert.equal((await request(`/api/usage-history/me?${queryString}&user_id=31`, "admin")).status, 403);
        assert.equal((await request(`/api/usage-history?${queryString}&user_id=31`, "librarian")).body.data[0].user_id, "31");
        assert.equal((await request(`/api/usage-history/me?${queryString}`, "forecastOnly")).status, 200);
        for (const role of ["fakeAdmin", "forecastOnly"]) assert.equal((await request("/api/usage-history", role)).status, 403);
    });
});

test("administrative statistics require exact report_view, fail closed with role label/forecast_view", async () => {
    await withApp(async (request, state) => {
        for (const endpoint of ["overview", "borrows", "users"]) {
            for (const role of ["reader", "fakeAdmin", "forecastOnly"]) assert.equal((await request(`/api/statistics/${endpoint}`, role)).status, 403);
            assert.equal(state.calls, 0);
        }
        for (const role of ["admin", "librarian"]) for (const endpoint of ["overview", "borrows", "users"]) {
            const response = await request(`/api/statistics/${endpoint}?${queryString}`, role); assert.equal(response.status, 200); assert.equal(response.cache, "no-store");
        }
    });
});

test("statistics HTTP returns known mock totals and paginated activity without private profile fields", async () => {
    await withApp(async request => {
        const overview = await request(`/api/statistics/overview?${queryString}`, "admin"); assert.equal(overview.body.data.borrows_in_period, 2); assert.equal(overview.body.data.borrowed_copies_in_period, 3);
        const borrows = await request(`/api/statistics/borrows?${queryString}&group_by=week&user_id=30`, "librarian"); assert.equal(borrows.body.period.group_by, "week"); assert.equal(borrows.body.data[0].borrow_count, 2);
        const users = await request(`/api/statistics/users?${queryString}&page=1&limit=10`, "admin"); assert.equal(users.body.pagination.total, 1); assert.equal(users.body.data[0].active_days, 1); assert.ok(!/email|password|phone|avatar/.test(JSON.stringify(users.body)));
    });
});

test("bad dates, unbounded ranges, unknown fields and invalid pagination are 400 before model reads", async () => {
    await withApp(async (request, state) => {
        for (const path of ["/api/statistics/overview?start_date=2026-02-30", "/api/statistics/overview?start_date=2025-01-01&end_date=2026-11-01", "/api/statistics/overview?user_id=30", "/api/statistics/borrows?group_by=year", "/api/statistics/borrows?user_id=0", "/api/statistics/users?limit=101", "/api/statistics/users?page=0", "/api/usage-history?action_type=visit", "/api/usage-history?search=x", "/api/usage-history?limit=0", "/api/usage-history?start_date=2026-11-02&end_date=2026-11-01"]) assert.equal((await request(path, "admin")).status, 400);
        assert.equal(state.queries.length, 0);
    });
});

test("new APIs are read-only and empty pages return zero totals", async () => {
    await withApp(async request => {
        const response = await request(`/api/usage-history/me?${queryString}&page=3&limit=1`, "reader"); assert.deepEqual(response.body.data, []); assert.equal(response.body.pagination.total, 1);
        assert.equal((await request("/api/usage-history", "admin", "POST")).status, 404);
        assert.equal((await request("/api/statistics/overview", "admin", "POST")).status, 404);
    });
    await withApp(async request => {
        const usage = await request(`/api/usage-history/me?${queryString}`, "reader"), users = await request(`/api/statistics/users?${queryString}`, "admin");
        assert.deepEqual(usage.body.data, []); assert.equal(usage.body.pagination.total, 0); assert.equal(users.body.pagination.totalPages, 0);
    }, { usageHistoryModel: { async list() { return { items: [], total: 0 }; } }, statisticsModel: { async users() { return { items: [], total: 0 }; } } });
});

test("UTC range uses inclusive calendar dates, exclusive SQL upper bound, leap days and bounded defaults", () => {
    assert.equal(range.from, "2026-11-01 00:00:00"); assert.equal(range.until, "2026-11-04 00:00:00"); assert.equal(range.days, 3);
    assert.equal(dateRange({ start_date: "2024-02-29", end_date: "2024-02-29" }).days, 1);
    assert.equal(dateRange({}, Date.parse("2026-11-07T01:00:00Z")).start_date, "2026-10-09");
    assert.equal(dateRange({ start_date: "2024-01-01", end_date: "2024-12-31" }).days, 366);
    for (const invalid of [{ start_date: "2024-01-01", end_date: "2025-01-01" }, { start_date: "2026-02-29" }, { end_date: "2026-11-07T00:00:00Z" }, { end_date: ["2026-11-07"] }, { end_date: "9999-12-31" }]) assert.throws(() => dateRange(invalid), { status: 400 });
    assert.equal(validateStatisticsQuery({ ...period, group_by: "month" }, "borrows").group_by, "month");
    assert.throws(() => validateUsageQuery({ ...period, page: "9007199254740991", limit: "100" }, "30"), { status: 400 });
});

test("usage service only accepts safe structured internal events and never arbitrary JSON/secrets", async () => {
    const received = [], connection = {};
    const service = createUsageHistoryService({ async record(event, conn) { received.push({ event, conn }); } });
    await service.record({ user_id: "30", action_type: "login" });
    await service.record({ user_id: "30", copy_id: "21", borrow_id: "1", action_type: "borrow" }, connection);
    assert.equal(received[0].event.copy_id, null); assert.deepEqual(JSON.parse(received[1].event.details), { source: "libriflow-api", version: 1, borrow_id: "1" }); assert.equal(received[1].conn, connection);
    for (const event of [{ user_id: "0", action_type: "login" }, { user_id: "30", action_type: "visit" }, { user_id: "30", action_type: "login", copy_id: "21" }, { user_id: "30", action_type: "return", copy_id: "21" }, { user_id: "30", action_type: "borrow", copy_id: "21", borrow_id: "1", details: { password: "forbidden" } }, { user_id: "30", action_type: "login", token: "forbidden" }, { user_id: "30", action_type: "login", action_date: "now" }]) assert.throws(() => validateUsageEvent(event), { status: 400 });
});

test("usage recorder uses the provided transaction connection and parameterized INSERT", async () => {
    let poolWrites = 0, calls = [];
    const pool = { async execute() { poolWrites++; throw new Error("Must use transaction"); } };
    const connection = { async execute(sql, params) { calls.push({ sql, params }); return [{ affectedRows: 1 }]; } };
    const service = createUsageHistoryService(createUsageHistoryModel(pool)); await service.record({ user_id: "30", copy_id: "21", borrow_id: "1", action_type: "return" }, connection);
    assert.equal(poolWrites, 0); assert.equal(calls.length, 1); assert.match(calls[0].sql, /^INSERT INTO LichSuSuDung/); assert.match(calls[0].sql, /UTC_TIMESTAMP/); assert.deepEqual(calls[0].params.slice(0, 3), ["30", "21", "return"]);
});

test("usage SQL applies owner/range to count and page and never selects details or private profile", async () => {
    const calls = [], pool = {
        async execute(sql, params) { calls.push({ sql, params }); return [[{ total: "1" }]]; },
        async query(sql, params) { calls.push({ sql, params }); return [[{ usage_id: "9007199254740993", user_id: "30", copy_id: null, action_type: "login", action_date: "2026-11-01 00:00:00", details: "private" }]]; },
    };
    const result = await createUsageHistoryModel(pool).list({ ...range, user_id: "30", action_type: "login", page: 1, limit: 10, offset: 0 }); assert.equal(result.items[0].usage_id, "9007199254740993"); assert.equal(result.items[0].copy_id, null); assert.ok(!Object.hasOwn(result.items[0], "details"));
    for (const c of calls) { assert.match(c.sql, /l.user_id = \?/); assert.match(c.sql, /l.action_date >= \?/); assert.match(c.sql, /l.action_date < \?/); assert.ok(!/details|NguoiDung|password|email/.test(c.sql)); assert.deepEqual(c.params.slice(0, 4), [range.from, range.until, "30", "login"]); }
});

const password = "usage-test-only-password", passwordHash = await bcrypt.hash(password, 4);
test("successful login signs token then records exactly one user event without credentials", async () => {
    const calls = [];
    const model = { async findCredentials() { return { user_id: "30", status: "active", password: passwordHash }; }, async recordLogin(id) { calls.push(["record", id]); } };
    const tokens = { assertConfigured() {}, issue(id) { calls.push(["issue", id]); return "synthetic-token"; } };
    const result = await createAuthService(model, tokens).login({ email: "fixture@example.test", password }); assert.equal(result.accessToken, "synthetic-token"); assert.deepEqual(calls, [["issue", "30"], ["record", "30"]]);
    let params;
    await createAuthModel({ async execute(sql, values) { assert.match(sql, /^INSERT INTO LichSuSuDung/); params = values; return [{ affectedRows: 1 }]; } }).recordLogin("30");
    assert.deepEqual(params.slice(0, 3), ["30", null, "login"]); assert.ok(!JSON.stringify(params).includes(password));
});

test("wrong credentials, disabled user or signing failure never writes login history", async () => {
    for (const failure of ["wrong", "disabled", "signing"]) {
        let records = 0;
        const model = { async findCredentials() { return { user_id: "30", status: failure === "disabled" ? "locked" : "active", password: passwordHash }; }, async recordLogin() { records++; } };
        const tokens = { assertConfigured() {}, issue() { throw new Error("signing failed"); } };
        await assert.rejects(createAuthService(model, tokens).login({ email: "fixture@example.test", password: failure === "wrong" ? "wrong" : password })); assert.equal(records, 0);
    }
});

test("login history failure fails the request without returning a token or hiding the database failure", async () => {
    const error = Object.assign(new Error("private"), { code: "ER_LOCK_DEADLOCK" });
    const model = { async findCredentials() { return { user_id: "30", status: "active", password: passwordHash }; }, async recordLogin() { throw error; } };
    await assert.rejects(createAuthService(model, { assertConfigured() {}, issue() { return "not-returned"; } }).login({ email: "fixture@example.test", password }), error);
});

function circulation({ returning = false, failEventAt = 0, invalidCopy = false } = {}) {
    let committed = { events: [], copies: [{ copy_id: "1", availability_status: returning ? "borrowed" : "available", condition_status: "good" }, { copy_id: "2", availability_status: returning ? "borrowed" : "available", condition_status: "good" }], details: returning ? ["1", "2"].map((id, i) => ({ borrow_detail_id: String(i + 11), borrow_id: "1", copy_id: id, status: "borrowed", returned_at: null, condition_before: "good", condition_after: null })) : [], header: returning ? { borrow_id: "1", user_id: "30", status: "borrowed" } : null };
    let working, events = 0; const calls = [];
    const connection = {
        async beginTransaction() { working = structuredClone(committed); calls.push("begin"); },
        async commit() { committed = working; calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); },
        async execute(sql, params) {
            calls.push(sql);
            if (sql.includes("FROM NguoiDung")) return [[{ user_id: "30", status: "active" }]];
            if (sql.includes("FROM BanSaoSach")) return [invalidCopy && params[0] === "2" ? [] : working.copies.filter(c => c.copy_id === params[0])];
            if (sql.includes("FROM ChiTietPhieuMuon WHERE copy_id")) return [working.details.filter(d => d.copy_id === params[0] && (d.returned_at === null || d.status !== "returned"))];
            if (sql.includes("FROM ChiTietPhieuMuon WHERE borrow_id")) return [structuredClone(working.details)];
            if (sql.startsWith("SELECT (CAST")) return [[{ valid_due_date: 1 }]];
            if (sql.startsWith("INSERT INTO PhieuMuon")) { working.header = { borrow_id: "1", user_id: params[0], status: "borrowed" }; return [{ insertId: "1" }]; }
            if (sql.startsWith("INSERT INTO ChiTietPhieuMuon")) { working.details.push({ borrow_detail_id: String(working.details.length + 11), borrow_id: params[0], copy_id: params[1], condition_before: params[2], status: "borrowed", returned_at: null }); return [{ affectedRows: 1 }]; }
            if (sql.startsWith("UPDATE BanSaoSach SET availability_status")) { working.copies.find(c => c.copy_id === params[0]).availability_status = "borrowed"; return [{ affectedRows: 1 }]; }
            if (sql.startsWith("UPDATE ChiTietPhieuMuon")) { Object.assign(working.details.find(d => d.borrow_detail_id === params[1]), { status: "returned", condition_after: params[0], returned_at: "2026-11-07 00:00:00" }); return [{ affectedRows: 1 }]; }
            if (sql.startsWith("UPDATE BanSaoSach SET condition_status")) { Object.assign(working.copies.find(c => c.copy_id === params[2]), { condition_status: params[0], availability_status: params[1] }); return [{ affectedRows: 1 }]; }
            if (sql.startsWith("UPDATE PhieuMuon")) { working.header.status = params[0]; return [{ affectedRows: 1 }]; }
            if (sql.startsWith("INSERT INTO LichSuSuDung")) { events++; if (failEventAt === events) throw Object.assign(new Error("private insert failure"), { code: "ER_LOCK_DEADLOCK" }); working.events.push({ user_id: params[0], copy_id: params[1], action_type: params[2], details: JSON.parse(params[3]) }); return [{ affectedRows: 1 }]; }
            if (sql.includes("FROM PhieuMuon p LEFT JOIN")) return [working.details.map(d => ({ ...working.header, borrow_detail_id: d.borrow_detail_id, copy_id: d.copy_id, detail_status: d.status, returned_at: d.returned_at ?? null, condition_before: d.condition_before, condition_after: d.condition_after }))];
            if (sql.includes("FROM PhieuMuon WHERE")) return [[working.header]];
            throw new Error(`Unexpected statement: ${sql}`);
        },
    };
    return { model: createBorrowModel({ async getConnection() { return connection; } }), state: () => committed, calls };
}
const borrow = { user_id: "30", copy_ids: ["2", "1"], due_date: "2035-01-01 12:00:00", note: null };

test("multi-copy borrow stores one event per copy for borrower in the same committed transaction", async () => {
    const db = circulation(); await db.model.create(borrow);
    assert.deepEqual(db.state().events.map(e => [e.user_id, e.copy_id, e.action_type, e.details.borrow_id]), [["30", "1", "borrow", "1"], ["30", "2", "borrow", "1"]]); assert.equal(db.calls.filter(c => c === "commit").length, 1);
});

test("history INSERT failure after earlier event rolls back all loan/copy/history changes", async () => {
    const db = circulation({ failEventAt: 2 }); const original = structuredClone(db.state());
    await assert.rejects(db.model.create(borrow), { code: "ER_LOCK_DEADLOCK" }); assert.deepEqual(db.state(), original); assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]); assert.ok(!db.calls.includes("commit"));
});

test("invalid borrow never records usage", async () => {
    const db = circulation({ invalidCopy: true }); await assert.rejects(db.model.create(borrow), { status: 404 }); assert.equal(db.state().events.length, 0); assert.ok(!db.calls.some(sql => sql.startsWith("INSERT INTO LichSuSuDung")));
});

test("partial then complete return records only newly returned copies, repeat return emits nothing", async () => {
    const db = circulation({ returning: true }); await db.model.returnCopies("1", { items: [{ copy_id: "1", condition_after: "damaged" }] });
    assert.equal(db.state().header.status, "partially_returned"); assert.deepEqual(db.state().events.map(e => [e.user_id, e.copy_id, e.action_type]), [["30", "1", "return"]]);
    await db.model.returnCopies("1", { return_all: true, condition_after: "good" }); assert.equal(db.state().header.status, "returned"); assert.deepEqual(db.state().events.map(e => e.copy_id), ["1", "2"]);
    await assert.rejects(db.model.returnCopies("1", { return_all: true, condition_after: "good" }), { status: 409 }); assert.equal(db.state().events.length, 2);
});

test("return history failure restores copies, details, header and earlier events through rollback", async () => {
    const db = circulation({ returning: true, failEventAt: 2 }), original = structuredClone(db.state());
    await assert.rejects(db.model.returnCopies("1", { return_all: true, condition_after: "good" }), { code: "ER_LOCK_DEADLOCK" }); assert.deepEqual(db.state(), original); assert.ok(!db.calls.includes("commit")); assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);
});

test("overview maps real aggregate counts, uses one SELECT and distinguishes global totals from period flows", async () => {
    const calls = [], raw = { books_total: "2", copies_total: "3", users_total: "2", borrows_total: "2", borrows_in_period: "2", borrowed_copies_in_period: "3", returned_copies_in_period: "1" };
    const model = createStatisticsModel({ async execute(sql, params) { calls.push({ sql, params }); return [[raw]]; } });
    assert.deepEqual(await model.overview(range), Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Number(v)]))); assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].params, [range.from, range.until, range.from, range.until, range.from, range.until]); assert.match(calls[0].sql, /status <> 'cancelled'/); assert.match(calls[0].sql, /returned_at >= \?/);
});

test("borrow series counts receipts distinctly from copies and safely groups day/week/month", async () => {
    for (const grouping of ["day", "week", "month"]) {
        let call;
        const model = createStatisticsModel({ async execute(sql, params) { call = { sql, params }; return [[{ period_start: grouping === "month" ? "2026-11" : "2026-11-01", borrow_count: "2", borrowed_copy_count: "3" }]]; } });
        const rows = await model.borrows({ ...range, group_by: grouping, user_id: "30" }); assert.equal(rows[0].borrow_count, 2); assert.equal(rows[0].borrowed_copy_count, 3); assert.match(call.sql, /COUNT\(DISTINCT p.borrow_id\)/); assert.match(call.sql, /COUNT\(d.borrow_detail_id\)/); assert.match(call.sql, /LIMIT 400/); assert.deepEqual(call.params, [range.from, range.until, "30"]);
        if (grouping === "week") assert.match(call.sql, /WEEKDAY/);
    }
});

test("user activity preaggregates loans and structured events separately to avoid multiplying counts", async () => {
    const calls = [], aggregate = { user_id: "30", borrow_count: "2", usage_event_count: "4", active_days: "1", login_count: "1", borrow_copy_events: "2", return_copy_events: "1" };
    const pool = { async execute(sql, params) { calls.push({ sql, params }); return [[{ total: "1" }]]; }, async query(sql, params) { calls.push({ sql, params }); return [[aggregate]]; } };
    const result = await createStatisticsModel(pool).users({ ...range, user_id: "30", page: 1, limit: 10, offset: 0 }); assert.equal(result.items[0].borrow_count, 2); assert.equal(result.items[0].active_days, 1); assert.equal(result.items[0].usage_event_count, 4);
    for (const call of calls) { assert.match(call.sql, /LEFT JOIN \(SELECT user_id, COUNT\(\*\) AS borrow_count/); assert.match(call.sql, /COUNT\(DISTINCT DATE\(l.action_date\)\)/); assert.match(call.sql, /JSON_EXTRACT/); assert.match(call.sql, /libriflow-api/); assert.match(call.sql, /AND u.user_id = \?/); assert.deepEqual(call.params.slice(0, 5), [range.from, range.until, range.from, range.until, "30"]); assert.ok(!/email|phone|password|NhatKyHeThong|DuBaoTanSuat/.test(call.sql)); }
});

test("empty statistics results are actual zero counts or empty series, never synthetic history", async () => {
    const model = createStatisticsModel({ async execute(sql) { if (sql.includes("AS books_total")) return [[{ books_total: "0", copies_total: "0", users_total: "0", borrows_total: "0", borrows_in_period: "0", borrowed_copies_in_period: "0", returned_copies_in_period: "0" }]]; if (sql.startsWith("SELECT COUNT(*) AS total")) return [[{ total: "0" }]]; return [[]]; }, async query() { return [[]]; } });
    assert.equal((await model.overview(range)).borrows_total, 0); assert.deepEqual(await model.borrows({ ...range, group_by: "day" }), []); assert.deepEqual(await model.users({ ...range, limit: 10, offset: 0 }), { items: [], total: 0 });
});

test("aggregate counts exceeding JS safe integer range are rejected instead of silently rounding", async () => {
    const model = createStatisticsModel({ async execute() { return [[{ books_total: "9007199254740993" }]]; } }); await assert.rejects(model.overview(range), /Unsupported aggregate count/);
});
