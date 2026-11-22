import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { napCauHinhKiemThu, moCoSoDuLieuKiemThu } from "./an-toan.mjs";
import { dungUngDung } from "../src/app-factory.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";

// Chỉ chạy tường minh trên DB đã qua UUID/grants/marker/fingerprint guard.
// Không dùng model mock cho các scenario MySQL; không import pool chính.
const coSoDuLieu = await moCoSoDuLieuKiemThu(napCauHinhKiemThu());

test("real MySQL: isolated authentication and JWT lifecycle", { timeout: 120000 }, async t => {
    const runId = randomBytes(12).toString("hex");
    const tienTo = `auth_${runId.slice(0, 16)}`;
    const khoa = randomBytes(48).toString("base64url");
    const matKhau = randomBytes(6).toString("hex");
    const dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const bangKe = { purpose: "BE-AUTH-SETUP-01", users: [], scenarios: [] };
    const taiKhoan = {};
    const cacMaBam = new Set();
    let mayChu, daDangKyRun = false, daXong = false, coLoi = false;
    const dong = async (sql, params = []) => (await coSoDuLieu.execute(sql, params))[0];
    const dem = async (sql, params = []) => Number(Object.values((await dong(sql, params))[0])[0]);
    const luu = () => coSoDuLieu.execute("UPDATE __libriflow_integration_runs SET manifest = ? WHERE run_id = ?", [JSON.stringify(bangKe), runId]);
    t.after(async () => {
        try {
            // Chỉ account do run này tạo; không DELETE/TRUNCATE hoặc sửa role permissions.
            for (const user of bangKe.users) {
                if (user.id) await coSoDuLieu.execute("UPDATE NguoiDung SET status = ? WHERE user_id = ? AND email = ?", ["inactive", user.id, user.email]);
                else await coSoDuLieu.execute("UPDATE NguoiDung SET status = ? WHERE name = ? AND email = ?", ["inactive", user.name, user.email]);
            }
            if (daDangKyRun) await coSoDuLieu.execute("UPDATE __libriflow_integration_runs SET status = ?, finished_at = UTC_TIMESTAMP(), manifest = ? WHERE run_id = ?", [daXong && !coLoi ? "passed" : "failed", JSON.stringify(bangKe), runId]);
        } finally {
            if (mayChu) { mayChu.closeAllConnections(); await new Promise(resolve => mayChu.close(resolve)); }
            await coSoDuLieu.end();
        }
    });
    await coSoDuLieu.execute("INSERT INTO __libriflow_integration_runs (run_id, status, started_at, manifest) VALUES (?, 'running', UTC_TIMESTAMP(), ?)", [runId, JSON.stringify(bangKe)]);
    daDangKyRun = true;
    mayChu = dungUngDung({ database: coSoDuLieu, tokens: dichVuToken }).listen(0, "127.0.0.1");
    await once(mayChu, "listening");
    const base = `http://127.0.0.1:${mayChu.address().port}`;
    const gui = async (url, { method = "GET", body, token, headers = {}, baseUrl = base } = {}) => {
        const response = await fetch(baseUrl + url, { method, headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
        return { status: response.status, body: await response.json(), headers: response.headers };
    };
    function kiemTra(phanHoi, status, code) {
        assert.equal(phanHoi.status, status);
        assert.equal(phanHoi.body.success, status < 400);
        if (code) assert.equal(phanHoi.body.error.code, code);
        assert.ok(!JSON.stringify(phanHoi.body).includes(matKhau));
        for (const maBam of cacMaBam) assert.ok(!JSON.stringify(phanHoi.body).includes(maBam));
        return phanHoi.body.data;
    }
    async function scenario(ten, congViec) {
        await t.test(ten, async () => {
            try { await congViec(); bangKe.scenarios.push({ name: ten, status: "passed" }); }
            catch { coLoi = true; bangKe.scenarios.push({ name: ten, status: "failed" }); throw new Error(`AUTH_SCENARIO_FAILED: ${ten}`); }
            finally { await luu(); }
        });
    }

    await scenario("register and login two owned users through real SQL and bcrypt", async () => {
        for (const loai of ["reader", "staff"]) {
            const email = `${tienTo}_${loai}@example.test`;
            const fixture = { id: null, name: `${tienTo}_${loai}`, email, purpose: loai };
            bangKe.users.push(fixture);
            await luu();
            const user = kiemTra(await gui("/api/auth/register", { method: "POST", body: { name: fixture.name, email, password: matKhau } }), 201);
            fixture.id = user.user_id;
            await luu();
            assert.deepEqual(user.roles, ["reader"]);
            assert.ok(!Object.hasOwn(user, "password") && !Object.hasOwn(user, "accessToken"));
            if (loai === "staff") await coSoDuLieu.execute("INSERT INTO NguoiDung_VaiTro (user_id, role_id) SELECT u.user_id, r.role_id FROM NguoiDung u CROSS JOIN VaiTro r WHERE u.user_id = ? AND u.email = ? AND u.name = ? AND r.name = ?", [user.user_id, email, `${tienTo}_${loai}`, "librarian"]);
            const [stored] = await dong("SELECT password FROM NguoiDung WHERE user_id = ? AND email = ?", [user.user_id, email]);
            cacMaBam.add(stored.password);
            assert.ok(!JSON.stringify(user).includes(stored.password));
            assert.ok(await bcrypt.compare(matKhau, stored.password));
            assert.equal(bcrypt.getRounds(stored.password), 12);
            const login = await gui("/api/auth/login", { method: "POST", body: { email, password: matKhau } });
            const data = kiemTra(login, 200);
            assert.equal(data.expiresIn, 900);
            assert.equal(data.tokenType, "Bearer");
            assert.equal(login.headers.get("cache-control"), "no-store");
            const claims = jwt.verify(data.accessToken, khoa, { algorithms: ["HS256"], issuer: "libriflow-api", audience: "libriflow-client" });
            assert.deepEqual(Object.keys(claims).sort(), ["aud", "exp", "iat", "iss", "sub"]);
            assert.equal(claims.sub, user.user_id);
            assert.equal(claims.exp - claims.iat, 900);
            taiKhoan[loai] = { id: user.user_id, email, token: data.accessToken };
        }
    });
    if (!taiKhoan.reader || !taiKhoan.staff) throw new Error("AUTH_BOOTSTRAP_FAILED_DEPENDENT_SCENARIOS_STOPPED");

    await scenario("current user returns live roles and safe profile without hashes", async () => {
        for (const loai of ["reader", "staff"]) {
            const user = kiemTra(await gui("/api/auth/me", { token: taiKhoan[loai].token }), 200);
            assert.equal(user.user_id, taiKhoan[loai].id);
            assert.ok(user.roles.includes(loai === "staff" ? "librarian" : "reader"));
            assert.ok(!Object.hasOwn(user, "password"));
            assert.ok(!Object.hasOwn(user, "accessToken"));
            assert.equal(user.permissions.includes("report_view"), loai === "staff");
        }
    });
    await scenario("wrong or unknown credentials and invalid login fields are rejected", async () => {
        kiemTra(await gui("/api/auth/login", { method: "POST", body: { email: taiKhoan.reader.email, password: randomBytes(24).toString("base64url") } }), 401, "INVALID_CREDENTIALS");
        kiemTra(await gui("/api/auth/login", { method: "POST", body: { email: `${tienTo}_absent@example.test`, password: matKhau } }), 401, "INVALID_CREDENTIALS");
        for (const body of [{ password: matKhau }, { email: taiKhoan.reader.email }, { email: "invalid", password: matKhau }]) kiemTra(await gui("/api/auth/login", { method: "POST", body }), 400, "VALIDATION_ERROR");
    });
    await scenario("missing or malformed authorization headers fail before SQL principal lookup", async () => {
        kiemTra(await gui("/api/auth/me"), 401, "AUTHENTICATION_REQUIRED");
        kiemTra(await gui("/api/auth/me", { headers: { Authorization: "Basic invalid" } }), 401, "AUTHENTICATION_REQUIRED");
        kiemTra(await gui("/api/auth/me", { token: "malformed" }), 401, "AUTHENTICATION_REQUIRED");
    });
    await scenario("JWT rejects wrong signature expiry issuer audience and tampered payload", async () => {
        const opts = { algorithm: "HS256", subject: taiKhoan.reader.id, issuer: "libriflow-api", audience: "libriflow-client", expiresIn: 900 };
        const parts = taiKhoan.reader.token.split(".");
        const payload = JSON.parse(Buffer.from(parts[1], "base64url"));
        payload.sub = taiKhoan.staff.id;
        const tampered = [parts[0], Buffer.from(JSON.stringify(payload)).toString("base64url"), parts[2]].join(".");
        for (const token of [jwt.sign({}, randomBytes(48).toString("base64url"), opts), jwt.sign({}, khoa, { ...opts, issuer: "other" }), jwt.sign({}, khoa, { ...opts, audience: "other" }), tampered]) kiemTra(await gui("/api/auth/me", { token }), 401, "INVALID_TOKEN");
        kiemTra(await gui("/api/auth/me", { token: jwt.sign({}, khoa, { ...opts, expiresIn: -1 }) }), 401, "TOKEN_EXPIRED");
        const missingId = "18446744073709551615";
        assert.equal(await dem("SELECT COUNT(*) AS total FROM NguoiDung WHERE user_id = ?", [missingId]), 0);
        kiemTra(await gui("/api/auth/me", { token: dichVuToken.phatHanhToken(missingId) }), 401, "INVALID_TOKEN");
    });
    await scenario("reader denied staff permitted and forged role claims do not bypass DB RBAC", async () => {
        kiemTra(await gui("/api/statistics/overview"), 401, "AUTHENTICATION_REQUIRED");
        kiemTra(await gui("/api/statistics/overview", { token: taiKhoan.reader.token }), 403, "FORBIDDEN");
        kiemTra(await gui("/api/statistics/overview", { token: taiKhoan.staff.token }), 200);
        const roleClaims = jwt.sign({ roles: ["admin"], permissions: ["report_view"] }, khoa, { subject: taiKhoan.reader.id, issuer: "libriflow-api", audience: "libriflow-client", expiresIn: 900 });
        kiemTra(await gui("/api/statistics/overview", { token: roleClaims }), 403, "FORBIDDEN");
    });
    await scenario("inactive and locked owned account rejected with previously valid JWT", async () => {
        try {
            for (const status of ["inactive", "locked"]) {
                await coSoDuLieu.execute("UPDATE NguoiDung SET status = ? WHERE user_id = ? AND email = ?", [status, taiKhoan.reader.id, taiKhoan.reader.email]);
                kiemTra(await gui("/api/auth/me", { token: taiKhoan.reader.token }), 403, "ACCOUNT_INACTIVE");
                kiemTra(await gui("/api/auth/login", { method: "POST", body: { email: taiKhoan.reader.email, password: matKhau } }), 403, "ACCOUNT_INACTIVE");
            }
        } finally { await coSoDuLieu.execute("UPDATE NguoiDung SET status = ? WHERE user_id = ? AND email = ?", ["active", taiKhoan.reader.id, taiKhoan.reader.email]); }
    });
    await scenario("logout remains stateless and GET or logout add no login events", async () => {
        assert.equal(await dem("SELECT COUNT(*) AS total FROM LichSuSuDung WHERE user_id IN (?, ?) AND action_type = ?", [taiKhoan.reader.id, taiKhoan.staff.id, "login"]), 2);
        for (const loai of ["reader", "staff"]) {
            const out = await gui("/api/auth/logout", { method: "POST", token: taiKhoan[loai].token });
            kiemTra(out, 200);
            assert.equal(out.body.data, null);
            kiemTra(await gui("/api/auth/me", { token: taiKhoan[loai].token }), 200);
        }
        assert.equal(await dem("SELECT COUNT(*) AS total FROM LichSuSuDung WHERE user_id IN (?, ?) AND action_type = ?", [taiKhoan.reader.id, taiKhoan.staff.id, "login"]), 2);
    });
    await scenario("missing JWT configuration returns 503 before SQL", async () => {
        let calls = 0;
        const proxy = {
            async query(...args) { calls++; return coSoDuLieu.query(...args); },
            async execute(...args) { calls++; return coSoDuLieu.execute(...args); },
            async getConnection() { calls++; return coSoDuLieu.getConnection(); },
        };
        const server = dungUngDung({ database: proxy, tokens: taoDichVuJwt({ getSecret: () => undefined }) }).listen(0, "127.0.0.1");
        await once(server, "listening");
        try {
            kiemTra(await gui("/api/auth/login", { baseUrl: `http://127.0.0.1:${server.address().port}`, method: "POST", body: { email: taiKhoan.reader.email, password: matKhau } }), 503, "JWT_NOT_CONFIGURED");
            assert.equal(calls, 0);
        } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    });
    await scenario("simulated DB connection failure returns sanitized 503", async () => {
        const fail = () => { throw Object.assign(new Error("INJECTED_CONNECTION_FAILURE"), { code: "ECONNREFUSED" }); };
        const server = dungUngDung({ database: { query: fail, execute: fail, getConnection: fail }, tokens: dichVuToken }).listen(0, "127.0.0.1");
        await once(server, "listening");
        try {
            const response = await gui("/api/auth/login", { baseUrl: `http://127.0.0.1:${server.address().port}`, method: "POST", body: { email: taiKhoan.reader.email, password: matKhau } });
            kiemTra(response, 503, "DATABASE_UNAVAILABLE");
            assert.ok(!JSON.stringify(response.body).includes("INJECTED_CONNECTION_FAILURE"));
            assert.ok(!Object.hasOwn(response.body, "data"));
        } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    });
    daXong = true;
});
