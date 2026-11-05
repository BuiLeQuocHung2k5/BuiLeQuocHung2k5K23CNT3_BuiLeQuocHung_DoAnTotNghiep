import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import pool from "../src/config/database.js";
import { createJwtService } from "../src/utils/jwt.js";
import { HttpError } from "../src/utils/http-error.js";
import { createAuthModel } from "../src/models/auth.model.js";
import { validateRegister } from "../src/utils/auth-validation.js";

// Synthetic credentials only; JWT signing keys are random and never printed.
const password = "test-only-password-2026";
const passwordHash = await bcrypt.hash(password, 12);
const registration = { name: "Test reader", email: "new@example.test", password };

function context() {
    const key = randomBytes(48).toString("base64url");
    const tokens = createJwtService({ getSecret: () => key });
    const users = new Map([
        ["1", { user_id: "1", name: "Test reader", email: "reader@example.test", status: "active", roles: ["reader"], permissions: ["book_view"], password: passwordHash }],
        ["2", { user_id: "2", name: "Test librarian", email: "librarian@example.test", status: "active", roles: ["librarian"], permissions: ["book_view", "book_create", "book_update"], password: passwordHash }],
        ["3", { user_id: "3", name: "Test admin", email: "admin@example.test", status: "active", roles: ["admin"], permissions: ["book_create", "book_update", "book_delete"], password: passwordHash }],
        ["4", { user_id: "4", email: "inactive@example.test", status: "inactive", roles: ["admin"], permissions: ["book_delete"], password: passwordHash }],
        ["5", { user_id: "5", email: "locked@example.test", status: "locked", roles: [], permissions: [], password: passwordHash }],
    ]);
    const state = { writes: 0, registrations: 0, readerExists: true, principalReads: 0 };
    const authModel = {
        async getPrincipal(id) { state.principalReads++; return users.get(id) ?? null; },
        async findCredentials(email) { return [...users.values()].find(user => user.email === email) ?? null; },
        async registerReader(data, hash) {
            if (!state.readerExists) throw new HttpError(503, "REGISTRATION_NOT_CONFIGURED", "Missing reader fixture");
            if ([...users.values()].some(user => user.email === data.email)) throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "Duplicate fixture email");
            assert.ok(!Object.hasOwn(data, "password"));
            assert.equal(bcrypt.getRounds(hash), 12);
            assert.ok(await bcrypt.compare(password, hash));
            state.registrations++;
            const user = { ...data, user_id: "6", status: "active", roles: ["reader"], permissions: ["book_view"], password: hash };
            users.set("6", user);
            return user;
        },
    };
    const bookModel = {
        async list() { return { books: [], total: 0 }; },
        async findById() { return { book_id: "1", title: "Fixture" }; },
        async create(data) { state.writes++; return { book_id: "1", ...data }; },
        async replace(id, data) { state.writes++; return { book_id: id, ...data }; },
        async remove() { state.writes++; return "deleted"; },
    };
    return { key, tokens, users, state, authModel, bookModel };
}

async function withApp(ctx, work) {
    const server = createApp({ authModel: ctx.authModel, bookModel: ctx.bookModel, tokens: ctx.tokens }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (path, { method = "GET", body, token, headers = {} } = {}) => {
        const response = await fetch(base + path, {
            method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
    };
    try { await work(request); }
    finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

function noCredentials(value) {
    const text = JSON.stringify(value);
    assert.ok(!text.includes(passwordHash));
    assert.ok(!text.includes('"password"'));
    assert.ok(!text.includes('"passwordHash"'));
}

test("register hashes password, normalizes email, assigns reader and returns no credentials", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        const result = await request("/api/auth/register", { method: "POST", body: { ...registration, email: " NEW@EXAMPLE.TEST " } });
        assert.equal(result.status, 201);
        assert.equal(result.body.data.email, registration.email);
        assert.deepEqual(result.body.data.roles, ["reader"]);
        assert.deepEqual(result.body.data.permissions, ["book_view"]);
        assert.equal(result.cache, "no-store");
        noCredentials(result.body);
        assert.equal(ctx.state.registrations, 1);
    });
});

test("duplicate registration email -> 409; missing reader role -> 503", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        const duplicate = await request("/api/auth/register", { method: "POST", body: { ...registration, email: "reader@example.test" } });
        assert.equal(duplicate.status, 409);
        assert.equal(duplicate.body.error.code, "EMAIL_ALREADY_EXISTS");
        ctx.state.readerExists = false;
        const missing = await request("/api/auth/register", { method: "POST", body: registration });
        assert.equal(missing.status, 503);
        assert.equal(ctx.state.registrations, 0);
    });
});

test("register rejects privilege injection and malformed schema fields", () => {
    for (const field of ["roles", "role_id", "permissions", "status", "avatar", "user_id"]) {
        assert.throws(() => validateRegister({ ...registration, [field]: "admin" }), { status: 400 });
    }
    for (const body of [{ ...registration, name: "" }, { ...registration, name: "x".repeat(101) }, { ...registration, email: "invalid" },
        { ...registration, password: "short" }, { ...registration, password: "a".repeat(73) }, { ...registration, password: "😀".repeat(19) },
        { ...registration, phone: "1".repeat(21) }, { ...registration, password: "\ud800" }, []]) assert.throws(() => validateRegister(body), { status: 400 });
    assert.equal(validateRegister({ ...registration, password: "a".repeat(72) }).password.length, 72);
});

test("HTTP rejects role injection and unsupported content type before account creation", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        const injected = await request("/api/auth/register", { method: "POST", body: { ...registration, roles: ["admin"] } });
        assert.equal(injected.status, 400);
        assert.equal(injected.body.error.code, "VALIDATION_ERROR");
        const media = await request("/api/auth/register", { method: "POST", body: registration, headers: { "Content-Type": "text/plain" } });
        assert.equal(media.status, 415);
        assert.equal(ctx.state.registrations, 0);
    });
});

test("login issues short minimal JWT, me reloads DB roles; logout is explicitly stateless", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        const login = await request("/api/auth/login", { method: "POST", body: { email: "reader@example.test", password } });
        assert.equal(login.status, 200);
        assert.equal(login.body.data.expiresIn, 900);
        assert.equal(login.cache, "no-store");
        const token = login.body.data.accessToken;
        const payload = jwt.verify(token, ctx.key, { algorithms: ["HS256"], issuer: "libriflow-api", audience: "libriflow-client" });
        assert.deepEqual(Object.keys(payload).sort(), ["aud", "exp", "iat", "iss", "sub"]);
        assert.equal(payload.sub, "1");
        assert.equal(payload.exp - payload.iat, 900);
        const me = await request("/api/auth/me", { token });
        assert.equal(me.status, 200);
        noCredentials(me.body);
        assert.deepEqual(me.body.data.roles, ["reader"]);
        const logout = await request("/api/auth/logout", { method: "POST", token });
        assert.equal(logout.status, 200);
        assert.match(logout.body.message, /chưa được thu hồi/);
        assert.equal((await request("/api/auth/me", { token })).status, 200);
    });
});

test("wrong password, unknown email, malformed stored hash return same 401", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        const wrong = await request("/api/auth/login", { method: "POST", body: { email: "reader@example.test", password: "wrong-test-password" } });
        const missing = await request("/api/auth/login", { method: "POST", body: { email: "absent@example.test", password } });
        ctx.users.get("1").password = "plaintext-fixture-never-accepted";
        const malformed = await request("/api/auth/login", { method: "POST", body: { email: "reader@example.test", password } });
        for (const r of [wrong, missing, malformed]) { assert.equal(r.status, 401); assert.equal(r.body.error.code, "INVALID_CREDENTIALS"); }
        assert.deepEqual(wrong.body, missing.body);
        assert.deepEqual(wrong.body, malformed.body);
    });
});

test("inactive and locked accounts rejected on login and with valid existing JWT", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        for (const [id, email] of [["4", "inactive@example.test"], ["5", "locked@example.test"]]) {
            assert.equal((await request("/api/auth/login", { method: "POST", body: { email, password } })).status, 403);
            const me = await request("/api/auth/me", { token: ctx.tokens.issue(id) });
            assert.equal(me.status, 403);
            assert.equal(me.body.error.code, "ACCOUNT_INACTIVE");
        }
    });
});

test("missing/malformed/expired/wrong-signature/wrong-algorithm/wrong-audience JWT -> 401", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        assert.equal((await request("/api/auth/me")).status, 401);
        const wrongKey = randomBytes(48).toString("base64url");
        const options = { subject: "1", issuer: "libriflow-api", audience: "libriflow-client", expiresIn: 900 };
        const cases = ["not.a.token", jwt.sign({}, wrongKey, options), jwt.sign({}, ctx.key, { ...options, expiresIn: -1 }),
            jwt.sign({}, ctx.key, { ...options, algorithm: "HS384" }), jwt.sign({}, ctx.key, { ...options, audience: "other" }),
            jwt.sign({}, ctx.key, { ...options, subject: "0" }), jwt.sign({}, ctx.key, { ...options, noTimestamp: true }),
            jwt.sign({}, ctx.key, { ...options, expiresIn: 3600 }), jwt.sign({}, ctx.key, { ...options, issuer: "other" }),
            jwt.sign({}, ctx.key, { subject: "1", issuer: "libriflow-api", audience: "libriflow-client" })];
        for (const token of cases) assert.equal((await request("/api/auth/me", { token })).status, 401);
        assert.equal(ctx.state.principalReads, 0);
        const expired = await request("/api/auth/me", { token: cases[2] });
        assert.equal(expired.body.error.code, "TOKEN_EXPIRED");
    });
});

test("RBAC protects each write; public GET remains available; role label gives no implicit privilege", async () => {
    const ctx = context();
    const methods = [["POST", "/api/books", "book_create"], ["PUT", "/api/books/1", "book_update"], ["DELETE", "/api/books/1", "book_delete"]];
    await withApp(ctx, async request => {
        assert.equal((await request("/api/books")).status, 200);
        assert.equal((await request("/api/books/1")).status, 200);
        for (const [method, path] of methods) {
            const body = method === "DELETE" ? undefined : { title: "Fixture", author: "Fixture author" };
            assert.equal((await request(path, { method, body })).status, 401);
            assert.equal((await request(path, { method, body, token: ctx.tokens.issue("1") })).status, 403);
            const allowed = await request(path, { method, body, token: ctx.tokens.issue("3") });
            assert.equal(allowed.status, method === "POST" ? 201 : 200);
        }
        assert.equal(ctx.state.writes, 3);
        // Check the exact permission mapping, not just an admin with all permissions.
        for (const [allowedMethod, allowedPath, permission] of methods) {
            ctx.users.get("1").permissions = [permission];
            for (const [method, path] of methods) {
                const body = method === "DELETE" ? undefined : { title: "Fixture", author: "Fixture author" };
                const result = await request(path, { method, body, token: ctx.tokens.issue("1") });
                assert.equal(result.status, method === allowedMethod && path === allowedPath ? (method === "POST" ? 201 : 200) : 403);
            }
        }
        ctx.users.get("1").permissions = ["book_view"];
        assert.equal((await request("/api/books/1", { method: "DELETE", token: ctx.tokens.issue("2") })).status, 403);
        ctx.users.get("3").permissions = [];
        assert.equal((await request("/api/books/1", { method: "DELETE", token: ctx.tokens.issue("3") })).status, 403);
        const forgedRole = jwt.sign({ roles: ["admin"], permissions: ["book_delete"] }, ctx.key, { subject: "1", issuer: "libriflow-api", audience: "libriflow-client", expiresIn: 900 });
        assert.equal((await request("/api/books/1", { method: "DELETE", token: forgedRole })).status, 403);
    });
});

test("permission/status changes and deleted accounts take effect on next request", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        const token = ctx.tokens.issue("3");
        ctx.users.get("3").status = "locked";
        assert.equal((await request("/api/books/1", { method: "DELETE", token })).status, 403);
        ctx.users.delete("3");
        assert.equal((await request("/api/auth/me", { token })).status, 401);
    });
});

test("missing/short JWT_SECRET fails closed before any registration or login lookup", async () => {
    for (const key of [undefined, "short"]) {
        const ctx = context();ctx.tokens = createJwtService({ getSecret: () => key });
        ctx.authModel.findCredentials = async () => { throw new Error("Should not query credentials"); };
        await withApp(ctx, async request => {
            for (const [path, body] of [["register", registration], ["login", { email: registration.email, password }]]) {
                const result = await request(`/api/auth/${path}`, { method: "POST", body });
                assert.equal(result.status, 503);
                assert.equal(result.body.error.code, "JWT_NOT_CONFIGURED");
            }
            assert.equal(ctx.state.registrations, 0);
            assert.equal((await request("/api/books")).status, 200);
        });
    }
});

test("login rate limited per IP after 10 attempts", async () => {
    const ctx = context();
    await withApp(ctx, async request => {
        for (let i = 0; i < 10; i++) assert.equal((await request("/api/auth/login", { method: "POST", body: {} })).status, 400);
        const result = await request("/api/auth/login", { method: "POST", body: {} });
        assert.equal(result.status, 429);assert.equal(result.body.error.code, "TOO_MANY_ATTEMPTS");
    });
});

test("auth model atomically inserts only hashed password and fixed reader relation", async () => {
    const calls = [];
    const rows = [{ user_id: "99", name: "Test reader", email: registration.email, status: "active", role_name: "reader", permission_name: "book_view" }];
    const connection = {
        async beginTransaction() { calls.push("begin"); }, async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); },
        async execute(sql, params) {
            calls.push({ sql, params });
            if (sql.startsWith("SELECT role_id")) { assert.deepEqual(params, ["reader"]); return [[{ role_id: "7", name: "reader" }]]; }
            if (sql.startsWith("INSERT INTO NguoiDung (")) { assert.equal(params[2], passwordHash); assert.equal(params[4], "active"); return [{ insertId: "99" }]; }
            if (sql.startsWith("INSERT INTO NguoiDung_VaiTro")) { assert.deepEqual(params, ["99", "7"]); return [{ affectedRows: 1 }]; }
            assert.ok(!sql.includes("u.password"));return [rows];
        },
    };
    const model = createAuthModel({ async getConnection() { return connection; } });
    const user = await model.registerReader({ name: registration.name, email: registration.email, phone: null }, passwordHash);
    assert.deepEqual(user.roles, ["reader"]);assert.deepEqual(user.permissions, ["book_view"]);
    assert.deepEqual(calls.slice(-2), ["commit", "release"]);
    assert.ok(!calls.some(c => typeof c === "object" && c.params.includes(password)));
});

test("auth model missing reader or duplicate email rolls back and never commits", async () => {
    for (const duplicate of [false, true]) {
        const calls = [];
        const connection = {
            async beginTransaction() {}, async commit() { calls.push("commit"); }, async rollback() { calls.push("rollback"); }, release() { calls.push("release"); },
            async execute(sql) {
                if (sql.startsWith("SELECT role_id")) return [duplicate ? [{ role_id: "1", name: "reader" }] : []];
                throw Object.assign(new Error("private SQL detail"), { code: "ER_DUP_ENTRY" });
            },
        };
        const model = createAuthModel({ async getConnection() { return connection; } });
        await assert.rejects(model.registerReader(registration, passwordHash), { code: duplicate ? "EMAIL_ALREADY_EXISTS" : "REGISTRATION_NOT_CONFIGURED" });
        assert.deepEqual(calls, ["rollback", "release"]);
    }
});

test("RBAC model joins current DB assignments, deduplicates permissions, never selects hashes", async () => {
    const model = createAuthModel({ async execute(sql, params) {
        assert.ok(!/password/i.test(sql));assert.deepEqual(params, ["1"]);
        for (const table of ["NguoiDung_VaiTro", "VaiTro_QuyenHan", "QuyenHan"]) assert.ok(sql.includes(table));
        return [[{ user_id: "1", status: "active", role_name: "reader", permission_name: "book_view" },
            { user_id: "1", status: "active", role_name: "reader", permission_name: "book_view" }]];
    } });
    const result = await model.getPrincipal("1");assert.deepEqual(result.roles, ["reader"]);assert.deepEqual(result.permissions, ["book_view"]);
});

test.after(async () => { await pool.end(); });
