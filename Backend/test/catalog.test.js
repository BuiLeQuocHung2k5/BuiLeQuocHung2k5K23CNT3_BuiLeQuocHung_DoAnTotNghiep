import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createApp } from "../src/app.js";
import pool from "../src/config/database.js";
import { createJwtService } from "../src/utils/jwt.js";
import { createCategoryModel } from "../src/models/category.model.js";
import { createBookCopyModel } from "../src/models/book-copy.model.js";
import { createCategoryService } from "../src/services/category.service.js";
import { createBookCopyService } from "../src/services/book-copy.service.js";
import { validateCategory, validateCopy, validateCopyQuery } from "../src/utils/catalog-validation.js";
import { HttpError } from "../src/utils/http-error.js";

const category = { category_id: "1", name: "Test category", description: null, created_at: "2026-01-01" };
const copy = { copy_id: "1", book_id: "1", isbn: null, barcode: "TEST-001", condition_status: "good", availability_status: "available", note: "INTERNAL_NOTE_FIXTURE", created_at: "2026-01-01", updated_at: "2026-01-01" };
const copyBody = { book_id: "1", barcode: "TEST-002" };
const replaceBody = { ...copyBody, condition_status: "good", availability_status: "available" };

async function withApp(overrides, run) {
    const key = randomBytes(48).toString("base64url"), tokens = createJwtService({ getSecret: () => key });
    const state = { categoryWrites: 0, copyWrites: 0, query: null };
    const principals = {
        admin: { user_id: "1", roles: ["admin"], permissions: ["copy_manage", "book_create", "book_update", "book_delete", "category_manage"] },
        librarian: { user_id: "2", roles: ["librarian"], permissions: ["copy_manage", "book_create", "book_update", "category_manage"] },
        reader: { user_id: "3", roles: ["reader"], permissions: ["book_view"] },
        fakeAdmin: { user_id: "4", roles: ["admin"], permissions: [] },
        unprovisionedAdmin: { user_id: "5", roles: ["admin"], permissions: ["book_create", "book_update", "book_delete", "copy_manage"] },
    };
    const authModel = { async getPrincipal(id) {
        const principal = Object.values(principals).find(p => p.user_id === id);
        if (!principal) return null;
        return { ...principal, status: "active", permissions: principal.permissions.filter(permission => overrides.categoryPermissionInstalled !== false || permission !== "category_manage") };
    } };
    const categoryModel = {
        async list(query) { state.query = query; return { items: [category], total: 1 }; },
        async findById(id) { return id === "1" ? category : null; },
        async create(data) { state.categoryWrites++; return { ...category, ...data }; },
        async replace(id, data) { state.categoryWrites++; return id === "1" ? { ...category, ...data } : null; },
        async remove(id) { state.categoryWrites++; return id === "1"; },
        ...overrides.categoryModel,
    };
    const bookCopyModel = {
        async list(query) { state.query = query; return { items: [copy], total: 1 }; },
        async findById(id) { return id === "1" ? copy : null; },
        async bookExists(id) { return id === "1"; },
        async create(data) { state.copyWrites++; return { ...copy, ...data, copy_id: "2" }; },
        async replace(id, data) { state.copyWrites++; return id === "1" ? { ...copy, ...data } : null; },
        async remove(id) { state.copyWrites++; return id === "1"; },
        ...overrides.bookCopyModel,
    };
    const server = createApp({ categoryModel, bookCopyModel, authModel, tokens }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(path, method = "GET", body, role) {
        const response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(role ? { Authorization: `Bearer ${tokens.issue(principals[role].user_id)}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, body: await response.json(), location: response.headers.get("location") };
    }
    try { await run(request, state); }
    finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test("category public list/detail, trailing slash, pagination and 400/404", async () => {
    await withApp({}, async (request, state) => {
        const list = await request("/api/categories/?page=2&limit=5&search=Test");
        assert.equal(list.status, 200);assert.equal(list.body.pagination.total, 1);
        assert.deepEqual(state.query, { page: 2, limit: 5, offset: 5, search: "Test" });
        assert.equal((await request("/api/categories")).status, 200);
        assert.equal((await request("/api/categories/1")).body.data.name, category.name);
        assert.equal((await request("/api/categories/999")).status, 404);
        for (const path of ["/api/categories/0", "/api/categories?limit=101", "/api/categories?page=0", "/api/categories?search=a&search=b", "/api/categories?unknown=1"]) assert.equal((await request(path)).status, 400);
    });
});

test("category writes require category_manage: admin/librarian allowed, reader and missing permission denied", async () => {
    await withApp({}, async (request, state) => {
        for (const [method, path] of [["POST", "/api/categories"], ["PUT", "/api/categories/1"], ["DELETE", "/api/categories/1"]]) {
            assert.equal((await request(path, method, method === "DELETE" ? undefined : { name: "Test" })).status, 401);
            for (const role of ["reader", "fakeAdmin", "unprovisionedAdmin"]) {
                const response = await request(path, method, method === "DELETE" ? undefined : { name: "Test" }, role);
                assert.equal(response.status, 403);assert.equal(response.body.error.code, "FORBIDDEN");
            }
            for (const role of ["admin", "librarian"]) assert.equal((await request(path, method, method === "DELETE" ? undefined : { name: "Test" }, role)).status, method === "POST" ? 201 : 200);
        }
        assert.equal(state.categoryWrites, 6);
    });
});

test("category validation follows name/TEXT constraints and does not accept server fields", () => {
    assert.deepEqual(validateCategory({ name: "  Test  " }), { name: "Test", description: null });
    assert.equal(validateCategory({ name: "😀".repeat(100), description: "a".repeat(65535) }).description.length, 65535);
    for (const body of [{ name: "" }, { name: "a".repeat(101) }, { name: "x", description: "a".repeat(65536) }, { name: "x", category_id: "1" }, { name: "\ud800" }, []]) assert.throws(() => validateCategory(body), { status: 400 });
});

test("category permission not installed in DB model denies even admin/librarian, with zero writes", async () => {
    await withApp({ categoryPermissionInstalled: false }, async (request, state) => {
        for (const role of ["admin", "librarian", "reader"]) for (const [method, path] of [["POST", "/api/categories"], ["PUT", "/api/categories/1"], ["DELETE", "/api/categories/1"]]) {
            assert.equal((await request(path, method, method === "DELETE" ? undefined : { name: "Test" }, role)).status, 403);
        }
        assert.equal(state.categoryWrites, 0);
        assert.equal((await request("/api/categories")).status, 200);
    });
});

test("category HTTP write lifecycle exposes existing validation, Location, full PUT and 404", async () => {
    await withApp({}, async request => {
        const created = await request("/api/categories", "POST", { name: "  Test  ", description: "Fixture" }, "librarian");
        assert.equal(created.status, 201);assert.equal(created.location, "/api/categories/1");assert.equal(created.body.data.name, "Test");
        const replaced = await request("/api/categories/1", "PUT", { name: "Replacement" }, "admin");
        assert.equal(replaced.status, 200);assert.equal(replaced.body.data.description, null);
        assert.equal((await request("/api/categories/1", "PUT", { name: "Replacement" }, "admin")).status, 200);
        for (const body of [{}, { name: " " }, { name: "x".repeat(101) }, { name: "Test", description: "a".repeat(65536) }, { name: "Test", category_id: "1" }]) {
            for (const [method,path] of [["POST", "/api/categories"], ["PUT", "/api/categories/1"]]) assert.equal((await request(path, method, body, "admin")).status, 400);
        }
        assert.equal((await request("/api/categories/0", "DELETE", undefined, "admin")).status, 400);
        assert.equal((await request("/api/categories/999", "PUT", { name: "Test" }, "admin")).status, 404);
        assert.equal((await request("/api/categories/999", "DELETE", undefined, "admin")).status, 404);
    });
});

test("category HTTP duplicate and referenced records are safe 409 errors", async () => {
    const duplicate = async () => { throw Object.assign(new Error("PRIVATE_SQL"), { code: "ER_DUP_ENTRY" }); };
    const referenced = async () => { throw Object.assign(new Error("PRIVATE_SQL"), { code: "ER_ROW_IS_REFERENCED_2" }); };
    await withApp({ categoryModel: { create: duplicate, replace: duplicate, remove: referenced } }, async request => {
        for (const [method,path] of [["POST", "/api/categories"], ["PUT", "/api/categories/1"], ["DELETE", "/api/categories/1"]]) {
            const result = await request(path, method, method === "DELETE" ? undefined : { name: "Test" }, "admin");
            assert.equal(result.status, 409);assert.ok(!JSON.stringify(result.body).includes("PRIVATE_SQL"));
        }
    });
});

test("category HTTP DELETE with actual model locks and blocks books before any DELETE SQL", async () => {
    const db = database([{ sql: /FROM DanhMuc .* FOR UPDATE$/, rows: [category] }, { sql: /FROM Sach .* FOR UPDATE$/, rows: [{ book_id: "1" }] }]);
    await withApp({ categoryModel: createCategoryModel(db.pool) }, async request => {
        const result = await request("/api/categories/1", "DELETE", undefined, "librarian");
        assert.equal(result.status, 409);assert.equal(result.body.error.code, "CATEGORY_IN_USE");
    });
    assert.ok(!db.calls.some(call => typeof call === "object" && call.sql.startsWith("DELETE")));
    assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);db.done();
});

test("copy list filters and nested route are public, paginated, and omit internal note", async () => {
    await withApp({}, async (request, state) => {
        const result = await request("/api/book-copies/?book_id=1&condition_status=good&availability_status=borrowed&search=TEST&page=2&limit=3");
        assert.equal(result.status, 200);assert.equal(result.body.pagination.total, 1);
        assert.equal(state.query.book_id, "1");assert.equal(state.query.availability_status, "borrowed");
        assert.ok(!JSON.stringify(result.body).includes("INTERNAL_NOTE_FIXTURE"));
        assert.ok(!Object.hasOwn(result.body.data[0], "note"));
        assert.equal((await request("/api/book-copies")).status, 200);
        const detail = await request("/api/book-copies/1");assert.equal(detail.status, 200);assert.ok(!Object.hasOwn(detail.body.data, "note"));
        assert.equal((await request("/api/book-copies/999")).status, 404);
        assert.equal((await request("/api/books/1/copies")).status, 200);assert.equal(state.query.book_id, "1");
        assert.equal((await request("/api/books/999/copies")).status, 404);
        assert.equal((await request("/api/books/1/copies?book_id=2")).status, 400);
    });
});

test("copy writes use exactly copy_manage for admin/librarian; reader and role-only admin denied", async () => {
    await withApp({}, async (request, state) => {
        for (const [method, path, body] of [["POST", "/api/book-copies", copyBody], ["PUT", "/api/book-copies/1", replaceBody], ["DELETE", "/api/book-copies/1", undefined]]) {
            assert.equal((await request(path, method, body)).status, 401);
            for (const role of ["reader", "fakeAdmin"]) assert.equal((await request(path, method, body, role)).status, 403);
            for (const role of ["admin", "librarian"]) assert.equal((await request(path, method, body, role)).status, method === "POST" ? 201 : 200);
        }
        assert.equal(state.copyWrites, 6);
        const created = await request("/api/book-copies", "POST", copyBody, "librarian");assert.equal(created.location, "/api/book-copies/2");
        assert.equal((await request("/api/book-copies/999", "PUT", replaceBody, "admin")).status, 404);
        assert.equal((await request("/api/book-copies/999", "DELETE", undefined, "admin")).status, 404);
    });
});

test("copy validation rejects unknown enums/fields/lengths/IDs and circulation state changes", async () => {
    assert.equal(validateCopy(copyBody).condition_status, "good");assert.equal(validateCopy(copyBody).availability_status, "available");
    for (const body of [{ ...copyBody, barcode: "" }, { ...copyBody, barcode: "x".repeat(51) }, { ...copyBody, isbn: "x".repeat(21) },
        { ...copyBody, book_id: "0" }, { ...copyBody, copy_id: "1" }, { ...copyBody, condition_status: "new" }, { ...copyBody, availability_status: "pending" },
        { ...copyBody, condition_status: null }, { ...copyBody, availability_status: null }, { ...copyBody, note: "a".repeat(65536) }]) assert.throws(() => validateCopy(body), { status: 400 });
    assert.throws(() => validateCopy(copyBody, true), { status: 400 });
    for (const status of ["borrowed", "lost"]) assert.throws(() => validateCopy({ ...copyBody, availability_status: status }), { status: 409 });
    assert.equal(validateCopy({ ...copyBody, book_id: "18446744073709551615" }).book_id, "18446744073709551615");
    for (const query of [{ book_id: "0" }, { availability_status: "bad" }, { condition_status: ["good", "damaged"] }]) assert.throws(() => validateCopyQuery(query), { status: 400 });
    await withApp({}, async request => {
        for (const body of [{ ...copyBody, barcode: "" }, { ...copyBody, condition_status: "new" }, { ...copyBody, availability_status: "bad" }]) assert.equal((await request("/api/book-copies", "POST", body, "admin")).status, 400);
        for (const status of ["borrowed", "lost"]) {
            assert.equal((await request("/api/book-copies", "POST", { ...copyBody, availability_status: status }, "admin")).status, 409);
            assert.equal((await request("/api/book-copies/1", "PUT", { ...replaceBody, availability_status: status }, "admin")).status, 409);
        }
        for (const path of ["/api/book-copies/0", "/api/book-copies?availability_status=invalid", "/api/book-copies?limit=101", "/api/book-copies?book_id=1&book_id=2"]) assert.equal((await request(path)).status, 400);
    });
});

test("copy DB constraint errors translate to 400/409 without SQL details", async () => {
    for (const [code, status] of [["ER_DUP_ENTRY", 409], ["ER_NO_REFERENCED_ROW_2", 400], ["ER_ROW_IS_REFERENCED_2", 409]]) {
        const failure = async () => { throw Object.assign(new Error("PRIVATE_SQL_DETAILS"), { code }); };
        await withApp({ bookCopyModel: { create: failure, replace: failure, remove: failure } }, async request => {
            for (const [method, path, body] of [["POST", "/api/book-copies", copyBody], ["PUT", "/api/book-copies/1", replaceBody], ["DELETE", "/api/book-copies/1", undefined]]) {
                const result = await request(path, method, body, "admin");assert.equal(result.status, status);assert.ok(!JSON.stringify(result.body).includes("PRIVATE_SQL_DETAILS"));
            }
        });
    }
});

test("copy HTTP returns 409 when model detects circulation/history conflicts", async () => {
    for (const code of ["COPY_CIRCULATION_LOCKED", "COPY_HAS_LOAN_HISTORY", "COPY_HAS_USAGE_HISTORY"]) {
        const conflict = async () => { throw new HttpError(409, code, "Fixture conflict"); };
        await withApp({ bookCopyModel: { replace: conflict, remove: conflict } }, async request => {
            const result = await request("/api/book-copies/1", "DELETE", undefined, "librarian");assert.equal(result.status, 409);assert.equal(result.body.error.code, code);
            assert.equal((await request("/api/book-copies/1", "PUT", replaceBody, "librarian")).status, 409);
        });
    }
});

function database(steps) {
    const calls = [];
    const connection = {
        async beginTransaction() { calls.push("begin"); }, async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); },
        async execute(sql, params) {
            calls.push({ sql, params });assert.ok(steps.length, "Unexpected query");const step = steps.shift();assert.match(sql, step.sql);
            if (step.error) throw step.error;
            return [step.rows];
        },
    };
    return { calls, pool: { async getConnection() { return connection; } }, done() { assert.equal(steps.length, 0); } };
}

test("category deletion locks parent and refuses referenced category before ON DELETE SET NULL", async () => {
    const db = database([{ sql: /FROM DanhMuc .* FOR UPDATE$/, rows: [category] }, { sql: /FROM Sach .* FOR UPDATE$/, rows: [{ book_id: "1" }] }]);
    await assert.rejects(createCategoryModel(db.pool).remove("1"), { status: 409, code: "CATEGORY_IN_USE" });
    assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);
    assert.ok(!db.calls.some(c => typeof c === "object" && c.sql.startsWith("DELETE")));db.done();
});

test("category model creates/replaces parameterized data, no-op update works, delete only unreferenced", async () => {
    let db = database([{ sql: /^INSERT INTO DanhMuc .* VALUES \(\?, \?\)$/, rows: { insertId: "1" } }, { sql: /FROM DanhMuc/, rows: [category] }]);
    assert.equal((await createCategoryModel(db.pool).create({ name: category.name, description: null })).category_id, "1");assert.deepEqual(db.calls[1].params, [category.name, null]);db.done();
    db = database([{ sql: /FOR UPDATE$/, rows: [category] }, { sql: /^UPDATE DanhMuc/, rows: { affectedRows: 0 } }, { sql: /FROM DanhMuc/, rows: [category] }]);
    assert.equal((await createCategoryModel(db.pool).replace("1", { name: category.name, description: null })).category_id, "1");db.done();
    db = database([{ sql: /FOR UPDATE$/, rows: [category] }, { sql: /FROM Sach .* FOR UPDATE$/, rows: [] }, { sql: /^DELETE FROM DanhMuc WHERE category_id = \?$/, rows: { affectedRows: 1 } }]);
    assert.equal(await createCategoryModel(db.pool).remove("1"), true);assert.deepEqual(db.calls.slice(-2), ["commit", "release"]);db.done();
});

test("category service catches duplicate/foreign-reference errors and handles missing records", async () => {
    const duplicate = Object.assign(new Error("PRIVATE_SQL"), { code: "ER_DUP_ENTRY" });
    await assert.rejects(createCategoryService({ async create() { throw duplicate; } }).create({ name: "Fixture" }), { status: 409, code: "DUPLICATE_VALUE" });
    await assert.rejects(createCategoryService({ async remove() { throw Object.assign(new Error(), { code: "ER_ROW_IS_REFERENCED_2" }); } }).remove("1"), { status: 409, code: "CATEGORY_IN_USE" });
    const model = { async findById() { return null; }, async replace() { return null; }, async remove() { return false; } };
    const service = createCategoryService(model);
    for (const action of [() => service.findById("1"), () => service.replace("1", {}), () => service.remove("1")]) await assert.rejects(action(), { status: 404 });
});

test("copy create checks and locks parent book, parameterizes UNIQUE fields", async () => {
    const data = validateCopy(copyBody);
    const db = database([{ sql: /FROM Sach .* FOR SHARE$/, rows: [{ book_id: "1" }] }, { sql: /^INSERT INTO BanSaoSach .* VALUES \(\?, \?, \?, \?, \?, \?\)$/, rows: { insertId: "18446744073709551615" } }, { sql: /FROM BanSaoSach/, rows: [{ ...copy, copy_id: "18446744073709551615" }] }]);
    const result = await createBookCopyModel(db.pool).create(data);assert.equal(result.copy_id, "18446744073709551615");
    assert.deepEqual(db.calls[2].params, ["1", null, "TEST-002", "good", "available", null]);assert.deepEqual(db.calls.slice(-2), ["commit", "release"]);db.done();
});

test("missing book aborts creation before INSERT", async () => {
    const db = database([{ sql: /FROM Sach .* FOR SHARE$/, rows: [] }]);
    await assert.rejects(createBookCopyModel(db.pool).create(validateCopy(copyBody)), { status: 400, code: "INVALID_REFERENCE" });
    assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);db.done();
});

test("duplicate barcode or ISBN causes rollback/release and safe 409", async () => {
    for (const field of ["barcode", "isbn"]) {
        const db = database([{ sql: /FOR SHARE$/, rows: [{ book_id: "1" }] }, { sql: /^INSERT INTO BanSaoSach/, error: Object.assign(new Error(`Private duplicate ${field}`), { code: "ER_DUP_ENTRY" }) }]);
        await assert.rejects(createBookCopyService(createBookCopyModel(db.pool)).create(validateCopy(copyBody)), { status: 409, code: "DUPLICATE_VALUE" });
        assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);db.done();
    }
});

test("borrowed/lost copies cannot be edited or deleted even with copy_manage", async () => {
    for (const status of ["borrowed", "lost"]) for (const action of ["replace", "remove"]) {
        const db = database([{ sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [{ ...copy, availability_status: status }] }]);
        await assert.rejects(createBookCopyModel(db.pool)[action]("1", validateCopy(replaceBody, true)), { status: 409, code: "COPY_CIRCULATION_LOCKED" });
        assert.deepEqual(db.calls.slice(-2), ["rollback", "release"]);db.done();
    }
});

test("open or inconsistent loan blocks editing even when availability says available", async () => {
    const db = database([{ sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [copy] }, { sql: /returned_at IS NULL OR status <> 'returned'.*FOR UPDATE$/, rows: [{ borrow_detail_id: "9" }] }]);
    await assert.rejects(createBookCopyModel(db.pool).replace("1", validateCopy(replaceBody, true)), { status: 409, code: "COPY_CIRCULATION_LOCKED" });db.done();
});

test("any loan history (including returned) blocks deletion", async () => {
    const db = database([{ sql: /FOR UPDATE$/, rows: [copy] }, { sql: /returned_at IS NULL/, rows: [] }, { sql: /FROM ChiTietPhieuMuon WHERE copy_id = \? LIMIT 1 FOR UPDATE$/, rows: [{ borrow_detail_id: "9" }] }]);
    await assert.rejects(createBookCopyModel(db.pool).remove("1"), { status: 409, code: "COPY_HAS_LOAN_HISTORY" });
    assert.ok(!db.calls.some(c => typeof c === "object" && c.sql.startsWith("DELETE")));db.done();
});

test("usage history blocks deletion instead of silently detaching history", async () => {
    const db = database([{ sql: /FOR UPDATE$/, rows: [copy] }, { sql: /returned_at IS NULL/, rows: [] }, { sql: /FROM ChiTietPhieuMuon/, rows: [] }, { sql: /FROM LichSuSuDung .* FOR UPDATE$/, rows: [{ usage_id: "8" }] }]);
    await assert.rejects(createBookCopyModel(db.pool).remove("1"), { status: 409, code: "COPY_HAS_USAGE_HISTORY" });db.done();
});

test("copy update cannot reassign book; safe updates retain SQL no-op semantics", async () => {
    let db = database([{ sql: /FOR UPDATE$/, rows: [copy] }, { sql: /returned_at IS NULL/, rows: [] }]);
    await assert.rejects(createBookCopyModel(db.pool).replace("1", validateCopy({ ...replaceBody, book_id: "2" }, true)), { status: 409, code: "COPY_BOOK_IMMUTABLE" });db.done();
    db = database([{ sql: /FOR UPDATE$/, rows: [copy] }, { sql: /returned_at IS NULL/, rows: [] }, { sql: /^UPDATE BanSaoSach SET isbn = \?, barcode = \?/, rows: { affectedRows: 0 } }, { sql: /FROM BanSaoSach/, rows: [copy] }]);
    assert.equal((await createBookCopyModel(db.pool).replace("1", validateCopy(replaceBody, true))).copy_id, "1");assert.equal(db.calls[3].params.at(-1), "1");db.done();
});

test("copy delete only when no circulation/history, and FK race rolls back", async () => {
    for (const fail of [false, true]) {
        const error = Object.assign(new Error("FK race"), { code: "ER_ROW_IS_REFERENCED_2" });
        const db = database([{ sql: /FOR UPDATE$/, rows: [copy] }, { sql: /returned_at IS NULL/, rows: [] }, { sql: /FROM ChiTietPhieuMuon/, rows: [] }, { sql: /FROM LichSuSuDung/, rows: [] }, { sql: /^DELETE FROM BanSaoSach WHERE copy_id = \?$/, rows: { affectedRows: 1 }, ...(fail ? { error } : {}) }]);
        const service = createBookCopyService(createBookCopyModel(db.pool));
        if (fail) await assert.rejects(service.remove("1"), { status: 409, code: "COPY_IN_USE" }); else await service.remove("1");
        assert.deepEqual(db.calls.slice(-2), [fail ? "rollback" : "commit", "release"]);db.done();
    }
});

test("missing rows never trigger UPDATE/DELETE; nested nonexistent book does not query copies", async () => {
    for (const createModel of [createCategoryModel, createBookCopyModel]) for (const action of ["replace", "remove"]) {
        const db = database([{ sql: /FOR UPDATE$/, rows: [] }]);
        const result = await createModel(db.pool)[action]("1", {});assert.ok(!result);db.done();
    }
    let called = false;
    const service = createBookCopyService({ async bookExists() { return false; }, async list() { called = true; } });
    await assert.rejects(service.list({ book_id: "9" }, true), { status: 404, code: "BOOK_NOT_FOUND" });assert.equal(called, false);
});

test("catalog lists use placeholder filters/search and safe numeric pagination", async () => {
    for (const createModel of [createCategoryModel, createBookCopyModel]) {
        const calls = [];
        const fakePool = {
            async execute(sql, params) { calls.push({ sql, params }); return [[{ total: "1" }]]; },
            async query(sql, params) { calls.push({ sql, params }); if (createModel === createBookCopyModel) assert.ok(!/\bnote\b/.test(sql)); return [[createModel === createCategoryModel ? category : copy]]; },
        };
        const query = { search: "%' OR 1=1 --_", limit: 5, offset: 10, book_id: "1", condition_status: "good", availability_status: "available" };
        const result = await createModel(fakePool).list(query);assert.equal(result.total, 1);
        for (const call of calls) { assert.ok(!call.sql.includes("OR 1=1")); assert.match(call.sql, /LIKE \? ESCAPE '='/); }
        assert.deepEqual(calls[1].params.slice(-2), [5, 10]);
        if (createModel === createBookCopyModel) { assert.match(calls[0].sql, /book_id = \? AND condition_status = \? AND availability_status = \?/);assert.deepEqual(calls[0].params.slice(0, 3), ["1", "good", "available"]); }
    }
});

test("public copy detail does not SELECT internal note at all", async () => {
    const model = createBookCopyModel({ async execute(sql, params) {
        assert.ok(!/\bnote\b/.test(sql));assert.deepEqual(params, ["1"]);
        const { note, ...publicRow } = copy;return [[publicRow]];
    } });
    assert.ok(!Object.hasOwn(await model.findById("1"), "note"));
});

test.after(async () => { await pool.end(); });
