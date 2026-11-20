import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import bcrypt from "bcryptjs";
import { dungUngDung } from "../src/app-factory.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";

// HTTP/crypto thật, model in-memory; mọi truy cập SQL đều bị chặn.
// Không import app.js, pool chính hoặc cấu hình DB của người dùng.
async function voiNguCanh(congViec) {
    const khoa = randomBytes(48).toString("base64url");
    const trangThai = { sqlCalls: 0, registrations: 0, loginEvents: 0, user: null };
    const camSql = () => { trangThai.sqlCalls++; throw new Error("AUTH_PREP_DATABASE_ACCESS_FORBIDDEN"); };
    const moHinh = {
        async dangKyDocGia(duLieu, maBam) {
            trangThai.registrations++;
            assert.equal(bcrypt.getRounds(maBam), 12);
            trangThai.user = { ...duLieu, user_id: "9007199254740993", password: maBam, status: "active", roles: ["reader"], permissions: ["book_view"], avatar: null };
            return trangThai.user;
        },
        async layThongTinDangNhap(email) { return trangThai.user?.email === email ? trangThai.user : null; },
        async layNguoiDungXacThuc(ma) { return trangThai.user?.user_id === ma ? trangThai.user : null; },
        async ghiNhanDangNhap() { trangThai.loginEvents++; },
    };
    const ungDung = dungUngDung({ database: { query: camSql, execute: camSql, getConnection: camSql }, authModel: moHinh, tokens: taoDichVuJwt({ getSecret: () => khoa }) });
    const mayChu = ungDung.listen(0, "127.0.0.1");
    await once(mayChu, "listening");
    const diaChiGoc = `http://127.0.0.1:${mayChu.address().port}`;
    const guiYeuCau = async (duongDan, { method = "GET", body, token, headers = {} } = {}) => {
        const phanHoi = await fetch(diaChiGoc + duongDan, {
            method, headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: phanHoi.status, headers: phanHoi.headers, body: phanHoi.status === 204 ? null : await phanHoi.json() };
    };
    try { await congViec(guiYeuCau, trangThai); }
    finally {
        mayChu.closeAllConnections();
        await new Promise(hoanThanh => mayChu.close(hoanThanh));
        trangThai.user = null;
        assert.equal(trangThai.sqlCalls, 0);
    }
}

test("auth prep: password whitespace survives registration/login; me and logout keep the existing contract", async () => {
    await voiNguCanh(async (gui, trangThai) => {
        const matKhau = ` ${randomBytes(24).toString("base64url")} `;
        const email = `${randomBytes(8).toString("hex")}@example.test`;
        const dangKy = await gui("/api/auth/register", { method: "POST", body: { name: "Synthetic auth prep reader", email, password: matKhau } });
        assert.equal(dangKy.status, 201);
        assert.equal(dangKy.headers.get("cache-control"), "no-store");
        assert.ok(!Object.hasOwn(dangKy.body.data, "password"));
        assert.ok(!Object.hasOwn(dangKy.body.data, "accessToken"));
        assert.ok(await bcrypt.compare(matKhau, trangThai.user.password));
        const sai = await gui("/api/auth/login", { method: "POST", body: { email, password: matKhau.trim() } });
        assert.equal(sai.status, 401);
        assert.equal(sai.body.error.code, "INVALID_CREDENTIALS");
        assert.equal(sai.headers.get("www-authenticate"), "Bearer");
        assert.equal(sai.headers.get("cache-control"), "no-store");
        assert.equal(trangThai.loginEvents, 0);
        const dung = await gui("/api/auth/login", { method: "POST", body: { email: ` ${email.toUpperCase()} `, password: matKhau } });
        assert.equal(dung.status, 200);
        assert.deepEqual(Object.keys(dung.body.data).sort(), ["accessToken", "expiresIn", "tokenType"]);
        assert.equal(dung.body.data.expiresIn, 900);
        assert.equal(dung.body.data.tokenType, "Bearer");
        assert.equal(trangThai.loginEvents, 1);
        const token = dung.body.data.accessToken;
        const toi = await gui("/api/auth/me", { token });
        assert.equal(toi.status, 200);
        assert.equal(toi.body.data.user_id, "9007199254740993");
        assert.deepEqual(toi.body.data.roles, ["reader"]);
        assert.ok(!JSON.stringify(toi.body).includes(matKhau));
        assert.ok(!JSON.stringify(toi.body).includes(trangThai.user.password));
        const dangXuat = await gui("/api/auth/logout", { method: "POST", token });
        assert.equal(dangXuat.status, 200);
        assert.equal(dangXuat.body.data, null);
        assert.equal((await gui("/api/auth/me", { token })).status, 200);
        assert.equal(trangThai.registrations, 1);
        assert.equal(trangThai.loginEvents, 1);
    });
});

test("auth prep: the sixth registration attempt is limited before any account or SQL operation", async () => {
    await voiNguCanh(async (gui, trangThai) => {
        for (let lan = 0; lan < 5; lan++) {
            const phanHoi = await gui("/api/auth/register", { method: "POST", body: {} });
            assert.equal(phanHoi.status, 400);
            assert.equal(phanHoi.body.error.code, "VALIDATION_ERROR");
        }
        const biChan = await gui("/api/auth/register", { method: "POST", body: {} });
        assert.equal(biChan.status, 429);
        assert.equal(biChan.body.error.code, "TOO_MANY_ATTEMPTS");
        assert.ok(Number(biChan.headers.get("retry-after")) > 0);
        assert.equal(biChan.headers.get("cache-control"), "no-store");
        assert.equal(trangThai.registrations, 0);
        assert.equal(trangThai.loginEvents, 0);
    });
});

test("auth prep: CORS permits Authorization preflight without cookies or authentication bypass", async () => {
    await voiNguCanh(async gui => {
        const phanHoi = await gui("/api/auth/me", { method: "OPTIONS", headers: {
            Origin: "http://127.0.0.1:5173", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization,content-type",
        } });
        assert.equal(phanHoi.status, 204);
        assert.equal(phanHoi.headers.get("access-control-allow-origin"), "*");
        assert.equal(phanHoi.headers.get("access-control-allow-credentials"), null);
        assert.match(phanHoi.headers.get("access-control-allow-headers"), /authorization/i);
        const sansToken = await gui("/api/auth/me", { headers: { Origin: "http://127.0.0.1:5173" } });
        assert.equal(sansToken.status, 401);
        assert.equal(sansToken.body.error.code, "AUTHENTICATION_REQUIRED");
        assert.equal(sansToken.headers.get("www-authenticate"), "Bearer");
    });
});
