import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import pool from "../src/config/database.js";
import { createBookModel } from "../src/models/book.model.js";
import { validateBookBody, validateId } from "../src/utils/book-validation.js";
import { randomBytes } from "node:crypto";
import { createJwtService } from "../src/utils/jwt.js";

const fixture = { book_id: "1", category_id: null, series_id: null, title: "LibriFlow", author: "Test author", publisher: null, description: null, publication_year: 2026, created_at: "2026-01-01", updated_at: "2026-01-01" };
const validBody = { title: "New book", author: "Test author" };

async function withApp(model, work) {
    const key = randomBytes(48).toString("base64url");
    const tokens = createJwtService({ getSecret: () => key });
    const authModel = { async getPrincipal() { return { user_id: "1", status: "active", roles: ["admin"], permissions: ["book_create", "book_update", "book_delete"] }; } };
    const token = tokens.issue("1");
    const server = createApp({ bookModel: model, authModel, tokens }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(path, method = "GET", body, headers = {}) {
        const response = await fetch(base + path, {
            method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(method !== "GET" ? { Authorization: `Bearer ${token}` } : {}), ...headers },
            ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
        });
        return { status: response.status, body: await response.json(), location: response.headers.get("location") };
    }
    try { await work(request); }
    finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test("HTTP book lifecycle through real router/controller/service with isolated model", async (t) => {
    const records = new Map([["1", { ...fixture }]]);
    let query;
    const model = {
        async list(input) { query = input; return { books: [...records.values()], total: records.size }; },
        async findById(id) { return records.get(id) ?? null; },
        async create(data) { const book = { ...fixture, ...data, book_id: "2" }; records.set("2", book); return book; },
        async replace(id, data) { if (!records.has(id)) return null; const book = { ...records.get(id), ...data }; records.set(id, book); return book; },
        async remove(id) { if (!records.has(id)) return "missing"; if (id === "1") return "referenced"; records.delete(id); return "deleted"; },
    };
    await withApp(model, async (request) => {
        await t.test("GET collection and trailing slash; pagination/search", async () => {
            const response = await request("/api/books/?page=2&limit=5&search=hello");
            assert.equal(response.status, 200);
            assert.deepEqual(response.body.pagination, { page: 2, limit: 5, total: 1, totalPages: 1 });
            assert.deepEqual(query, { page: 2, limit: 5, offset: 5, search: "hello" });
            assert.equal((await request("/api/books")).status, 200);
        });
        await t.test("GET detail, missing and invalid ID", async () => {
            assert.equal((await request("/api/books/1")).body.data.title, fixture.title);
            assert.equal((await request("/api/books/999")).status, 404);
            for (const id of ["0", "-1", "1.5", "abc", "18446744073709551616"]) assert.equal((await request(`/api/books/${id}`)).status, 400);
            assert.equal((await request("/api/books/%E0%A4%A")).body.error.code, "INVALID_URL");
        });
        await t.test("POST valid body -> 201 and Location", async () => {
            const response = await request("/api/books", "POST", validBody);
            assert.equal(response.status, 201);
            assert.equal(response.location, "/api/books/2");
            assert.equal(response.body.data.category_id, null);
        });
        await t.test("PUT replacement and unchanged update; absent book -> 404", async () => {
            const body = { ...validBody, title: "Replacement", publisher: "Publisher" };
            const response = await request("/api/books/2", "PUT", body);
            assert.equal(response.status, 200);
            assert.equal(response.body.data.title, "Replacement");
            assert.equal((await request("/api/books/2", "PUT", body)).status, 200);
            assert.equal((await request("/api/books/999", "PUT", validBody)).status, 404);
        });
        await t.test("DELETE referenced -> 409; unreferenced -> 200; repeat -> 404", async () => {
            assert.equal((await request("/api/books/1", "DELETE")).status, 409);
            assert.equal((await request("/api/books/2", "DELETE")).status, 200);
            assert.equal((await request("/api/books/2", "DELETE")).status, 404);
        });
        await t.test("health preserved and unknown route returns JSON", async () => {
            assert.equal((await request("/api/health")).body.message, "LibriFlow Backend is running");
            assert.equal((await request("/api/not-found")).body.error.code, "ROUTE_NOT_FOUND");
        });
        await t.test("invalid queries/body rejected before persistence", async () => {
            for (const suffix of ["?page=0", "?limit=101", "?page=1&page=2", "?search=a&search=b", "?sort=title", "?page=9007199254740991&limit=100"]) {
                assert.equal((await request(`/api/books${suffix}`)).status, 400, suffix);
            }
            for (const body of [{}, { title: "x" }, { ...validBody, title: " " }, { ...validBody, title: "x".repeat(256) },
                { ...validBody, isbn: "unused" }, { ...validBody, book_id: "1" }, { ...validBody, publication_year: -1 },
                { ...validBody, publication_year: "2026" }, { ...validBody, category_id: 0 }, { ...validBody, description: "a".repeat(65536) }, []]) {
                const response = await request("/api/books", "POST", body);
                assert.equal(response.status, 400);
                assert.equal(response.body.success, false);
            }
            assert.equal((await request("/api/books", "POST", "{broken")).body.error.code, "INVALID_JSON");
            assert.equal((await request("/api/books", "POST", "hello", { "Content-Type": "text/plain" })).status, 415);
            assert.equal((await request("/api/books", "POST", { ...validBody, description: "a".repeat(270000) })).status, 413);
        });
    });
});

test("validation follows SQL boundaries and preserves unsigned BIGINT", () => {
    assert.equal(validateId("18446744073709551615"), "18446744073709551615");
    assert.throws(() => validateId(Number.MAX_SAFE_INTEGER + 1));
    const result = validateBookBody({ ...validBody, title: "😀".repeat(255), category_id: "18446744073709551615", publication_year: 65535, description: "a".repeat(65535) });
    assert.equal(result.category_id, "18446744073709551615");
    assert.equal(validateBookBody({ ...validBody, publication_year: 0 }).publication_year, 0);
    assert.throws(() => validateBookBody({ ...validBody, description: "😀".repeat(16384) }));
    assert.throws(() => validateBookBody({ ...validBody, title: "\ud800" }));
    assert.equal(validateBookBody(validBody).series_id, null);
});

test("database errors map to safe JSON without leaking SQL", async (t) => {
    for (const [code, status, apiCode] of [
        ["ER_DUP_ENTRY", 409, "DUPLICATE_VALUE"], ["ER_NO_REFERENCED_ROW_2", 400, "INVALID_REFERENCE"],
        ["ER_ROW_IS_REFERENCED_2", 409, "BOOK_IN_USE"], ["ER_DATA_TOO_LONG", 400, "INVALID_DATA"],
        ["ER_CHECK_CONSTRAINT_VIOLATED", 400, "INVALID_DATA"], ["ECONNREFUSED", 503, "DATABASE_UNAVAILABLE"],
        ["ER_LOCK_DEADLOCK", 503, "DATABASE_UNAVAILABLE"], ["UNEXPECTED", 500, "INTERNAL_ERROR"],
    ]) await t.test(code, async () => {
        const failure = async () => { throw Object.assign(new Error("SECRET_SQL_DETAILS"), { code, sql: "SECRET_SQL_DETAILS" }); };
        await withApp({ create: failure }, async (request) => {
            const response = await request("/api/books", "POST", validBody);
            assert.equal(response.status, status);
            assert.equal(response.body.error.code, apiCode);
            assert.ok(!JSON.stringify(response).includes("SECRET_SQL_DETAILS"));
        });
    });
});

function scriptedConnection(steps) {
    const calls = [];
    const connection = {
        async beginTransaction() { calls.push("begin"); },
        async commit() { calls.push("commit"); },
        async rollback() { calls.push("rollback"); },
        release() { calls.push("release"); },
        async execute(sql, params) {
            calls.push({ sql, params });
            assert.ok(steps.length, "Unexpected query");
            const step = steps.shift();
            assert.match(sql, step.sql);
            if (step.error) throw step.error;
            return [step.result];
        },
    };
    return { connection, calls, model: createBookModel({ async getConnection() { return connection; } }) };
}

test("model SQL is parameterized; search escapes wildcard characters", async () => {
    const calls = [];
    const model = createBookModel({
        async execute(sql, params) { calls.push({ sql, params }); return [[{ total: "1" }]]; },
        async query(sql, params) { calls.push({ sql, params }); return [[{ ...fixture, book_id: "18446744073709551615" }]]; },
    });
    const result = await model.list({ search: "x%' OR 1=1 --_", limit: 5, offset: 10 });
    assert.equal(result.books[0].book_id, "18446744073709551615");
    assert.equal(result.total, 1);
    for (const call of calls) { assert.ok(!call.sql.includes("OR 1=1")); assert.match(call.sql, /LIKE \? ESCAPE '='/); }
    assert.equal(calls[0].params[0], "%x=%' OR 1==1 --=_%");
    assert.deepEqual(calls[1].params.slice(-2), [5, 10]);
});

test("model deletes only book, locks parent, and commits", async () => {
    const { model, calls } = scriptedConnection([
        { sql: /SELECT .* FROM Sach .* FOR UPDATE$/, result: [fixture] },
        { sql: /SELECT copy_id FROM BanSaoSach/, result: [] },
        { sql: /^DELETE FROM Sach WHERE book_id = \?$/, result: { affectedRows: 1 } },
    ]);
    assert.equal(await model.remove("1"), "deleted");
    assert.equal(calls[0], "begin");
    assert.deepEqual(calls.slice(-2), ["commit", "release"]);
    for (const call of calls.filter(c => typeof c === "object")) assert.deepEqual(call.params, ["1"]);
});

test("model does not delete missing/referenced books", async (t) => {
    for (const referenced of [false, true]) await t.test(referenced ? "has copies" : "missing", async () => {
        const steps = [{ sql: /FOR UPDATE$/, result: referenced ? [fixture] : [] }];
        if (referenced) steps.push({ sql: /FROM BanSaoSach/, result: [{ copy_id: "10" }] });
        const { model, calls } = scriptedConnection(steps);
        assert.equal(await model.remove("1"), referenced ? "referenced" : "missing");
        assert.ok(!calls.some(c => typeof c === "object" && c.sql.startsWith("DELETE")));
    });
});

test("model rolls back concurrent FK failure and releases connection", async () => {
    const error = Object.assign(new Error("FK race"), { code: "ER_ROW_IS_REFERENCED_2" });
    const { model, calls } = scriptedConnection([
        { sql: /FOR UPDATE$/, result: [fixture] }, { sql: /FROM BanSaoSach/, result: [] },
        { sql: /^DELETE FROM Sach/, error },
    ]);
    await assert.rejects(model.remove("1"), error);
    assert.deepEqual(calls.slice(-2), ["rollback", "release"]);
    assert.ok(!calls.includes("commit"));
});

test("model insert/read preserves large insertId; update no-op is successful", async () => {
    const data = validateBookBody(validBody);
    const large = "18446744073709551615";
    const created = scriptedConnection([
        { sql: /^INSERT INTO Sach .* VALUES \(\?, \?, \?, \?, \?, \?, \?\)$/, result: { insertId: large } },
        { sql: /WHERE book_id = \?$/, result: [{ ...fixture, ...data, book_id: large }] },
    ]);
    assert.equal((await created.model.create(data)).book_id, large);
    assert.deepEqual(created.calls[1].params, [null, null, data.title, data.author, null, null, null]);
    assert.deepEqual(created.calls[2].params, [large]);
    const updated = scriptedConnection([
        { sql: /FOR UPDATE$/, result: [fixture] }, { sql: /^UPDATE Sach SET .* WHERE book_id = \?$/, result: { affectedRows: 0 } },
        { sql: /WHERE book_id = \?$/, result: [fixture] },
    ]);
    assert.equal((await updated.model.replace("1", data)).book_id, "1");
    assert.equal(updated.calls[2].params.at(-1), "1");
});

test.after(async () => { await pool.end(); });
