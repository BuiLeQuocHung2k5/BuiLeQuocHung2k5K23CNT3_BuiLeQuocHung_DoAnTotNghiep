import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { taoUngDung } from "../src/app.js";
import boKetNoi from "../src/config/co-so-du-lieu.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";
import { LoiHttp } from "../src/utils/loi-http.js";
import { taoMoHinhXacThuc } from "../src/models/xac-thuc.model.js";
import { kiemTraDangKy } from "../src/utils/kiem-tra-xac-thuc.js";

// Chỉ dùng tài khoản giả lập; khóa JWT tạo ngẫu nhiên và không được in ra.
const MAT_KHAU = "test-only-password-2026";
const maBamMatKhau = await bcrypt.hash(MAT_KHAU, 12);
const DU_LIEU_DANG_KY = { name: "Test reader", email: "new@example.test", password: MAT_KHAU };

function taoNguCanhKiemThu() {
    const khoa = randomBytes(48).toString("base64url");
    const dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const cacNguoiDung = new Map([
        ["1", { user_id: "1", name: "Test reader", email: "reader@example.test", status: "active", roles: ["reader"], permissions: ["book_view"], password: maBamMatKhau }],
        ["2", { user_id: "2", name: "Test librarian", email: "librarian@example.test", status: "active", roles: ["librarian"], permissions: ["book_view", "book_create", "book_update"], password: maBamMatKhau }],
        ["3", { user_id: "3", name: "Test admin", email: "admin@example.test", status: "active", roles: ["admin"], permissions: ["book_create", "book_update", "book_delete"], password: maBamMatKhau }],
        ["4", { user_id: "4", email: "inactive@example.test", status: "inactive", roles: ["admin"], permissions: ["book_delete"], password: maBamMatKhau }],
        ["5", { user_id: "5", email: "locked@example.test", status: "locked", roles: [], permissions: [], password: maBamMatKhau }],
    ]);
    const trangThaiKiemThu = { writes: 0, registrations: 0, readerExists: true, principalReads: 0, loginEvents: [] };
    const moHinhXacThuc = {
        async layNguoiDungXacThuc(ma) { trangThaiKiemThu.principalReads++; return cacNguoiDung.get(ma) ?? null; },
        async layThongTinDangNhap(thuDienTu) { return [...cacNguoiDung.values()].find(nguoiDung => nguoiDung.email === thuDienTu) ?? null; },
        async ghiNhanDangNhap(ma) { trangThaiKiemThu.loginEvents.push(String(ma)); },
        async dangKyDocGia(duLieu, maBam) {
            if (!trangThaiKiemThu.readerExists) throw new LoiHttp(503, "REGISTRATION_NOT_CONFIGURED", "Missing reader fixture");
            if ([...cacNguoiDung.values()].some(nguoiDung => nguoiDung.email === duLieu.email)) throw new LoiHttp(409, "EMAIL_ALREADY_EXISTS", "Duplicate fixture email");
            assert.ok(!Object.hasOwn(duLieu, "password"));
            assert.equal(bcrypt.getRounds(maBam), 12);
            assert.ok(await bcrypt.compare(MAT_KHAU, maBam));
            trangThaiKiemThu.registrations++;
            const nguoiDung = { ...duLieu, user_id: "6", status: "active", roles: ["reader"], permissions: ["book_view"], password: maBam };
            cacNguoiDung.set("6", nguoiDung);
            return nguoiDung;
        },
    };
    const moHinhSach = {
        async lietKe() { return { books: [], total: 0 }; },
        async layTheoMa() { return { book_id: "1", title: "Fixture" }; },
        async taoMoi(duLieu) { trangThaiKiemThu.writes++; return { book_id: "1", ...duLieu }; },
        async thayThe(ma, duLieu) { trangThaiKiemThu.writes++; return { book_id: ma, ...duLieu }; },
        async xoa() { trangThaiKiemThu.writes++; return "deleted"; },
    };
    return { key: khoa, tokens: dichVuToken, users: cacNguoiDung, state: trangThaiKiemThu, authModel: moHinhXacThuc, bookModel: moHinhSach };
}

async function voiUngDungKiemThu(nguCanhTest, congViec) {
    const mayChu = taoUngDung({ authModel: nguCanhTest.authModel, bookModel: nguCanhTest.bookModel, tokens: nguCanhTest.tokens }).listen(0, "127.0.0.1");
    await once(mayChu, "listening");
    const diaChiGoc = `http://127.0.0.1:${mayChu.address().port}`;
    const guiYeuCau = async (duongDan, { method: phuongThuc = "GET", body: noiDung, token: tokenTruyCapMau, headers: cacThongTinPhieu = {} } = {}) => {
        const phanHoi = await fetch(diaChiGoc + duongDan, {
            method: phuongThuc, headers: { ...(noiDung !== undefined ? { "Content-Type": "application/json" } : {}), ...(tokenTruyCapMau ? { Authorization: `Bearer ${tokenTruyCapMau}` } : {}), ...cacThongTinPhieu },
            ...(noiDung !== undefined ? { body: JSON.stringify(noiDung) } : {}),
        });
        return { status: phanHoi.status, body: await phanHoi.json(), cache: phanHoi.headers.get("cache-control") };
    };
    try { await congViec(guiYeuCau); }
    finally { mayChu.closeAllConnections(); await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
}

function xacNhanKhongLoThongTinDangNhap(giaTri) {
    const vanBan = JSON.stringify(giaTri);
    assert.ok(!vanBan.includes(maBamMatKhau));
    assert.ok(!vanBan.includes('"password"'));
    assert.ok(!vanBan.includes('"passwordHash"'));
}

test("register hashes password, normalizes email, assigns reader and returns no credentials", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        const ketQua = await guiYeuCau("/api/auth/register", { method: "POST", body: { ...DU_LIEU_DANG_KY, email: " NEW@EXAMPLE.TEST " } });
        assert.equal(ketQua.status, 201);
        assert.equal(ketQua.body.data.email, DU_LIEU_DANG_KY.email);
        assert.deepEqual(ketQua.body.data.roles, ["reader"]);
        assert.deepEqual(ketQua.body.data.permissions, ["book_view"]);
        assert.equal(ketQua.cache, "no-store");
        xacNhanKhongLoThongTinDangNhap(ketQua.body);
        assert.equal(nguCanhTest.state.registrations, 1);
    });
});

test("duplicate registration email -> 409; missing reader role -> 503", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        const biTrung = await guiYeuCau("/api/auth/register", { method: "POST", body: { ...DU_LIEU_DANG_KY, email: "reader@example.test" } });
        assert.equal(biTrung.status, 409);
        assert.equal(biTrung.body.error.code, "EMAIL_ALREADY_EXISTS");
        nguCanhTest.state.readerExists = false;
        const khongTonTai = await guiYeuCau("/api/auth/register", { method: "POST", body: DU_LIEU_DANG_KY });
        assert.equal(khongTonTai.status, 503);
        assert.equal(nguCanhTest.state.registrations, 0);
    });
});

test("register rejects privilege injection and malformed schema fields", () => {
    for (const tenTruong of ["roles", "role_id", "permissions", "status", "avatar", "user_id"]) {
        assert.throws(() => kiemTraDangKy({ ...DU_LIEU_DANG_KY, [tenTruong]: "admin" }), { status: 400 });
    }
    for (const noiDung of [{ ...DU_LIEU_DANG_KY, name: "" }, { ...DU_LIEU_DANG_KY, name: "x".repeat(101) }, { ...DU_LIEU_DANG_KY, email: "invalid" },
        { ...DU_LIEU_DANG_KY, password: "short" }, { ...DU_LIEU_DANG_KY, password: "a".repeat(73) }, { ...DU_LIEU_DANG_KY, password: "😀".repeat(19) },
        { ...DU_LIEU_DANG_KY, phone: "1".repeat(21) }, { ...DU_LIEU_DANG_KY, password: "\ud800" }, []]) assert.throws(() => kiemTraDangKy(noiDung), { status: 400 });
    assert.equal(kiemTraDangKy({ ...DU_LIEU_DANG_KY, password: "a".repeat(72) }).password.length, 72);
});

test("HTTP rejects role injection and unsupported content type before account creation", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        const duocTiem = await guiYeuCau("/api/auth/register", { method: "POST", body: { ...DU_LIEU_DANG_KY, roles: ["admin"] } });
        assert.equal(duocTiem.status, 400);
        assert.equal(duocTiem.body.error.code, "VALIDATION_ERROR");
        const kieuNoiDung = await guiYeuCau("/api/auth/register", { method: "POST", body: DU_LIEU_DANG_KY, headers: { "Content-Type": "text/plain" } });
        assert.equal(kieuNoiDung.status, 415);
        assert.equal(nguCanhTest.state.registrations, 0);
    });
});

test("login issues short minimal JWT, me reloads DB roles; logout is explicitly stateless", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        const ketQuaDangNhap = await guiYeuCau("/api/auth/login", { method: "POST", body: { email: "reader@example.test", password: MAT_KHAU } });
        assert.equal(ketQuaDangNhap.status, 200);
        assert.equal(ketQuaDangNhap.body.data.expiresIn, 900);
        assert.equal(ketQuaDangNhap.cache, "no-store");
        const tokenTruyCapMau = ketQuaDangNhap.body.data.accessToken;
        const noiDungToken = jwt.verify(tokenTruyCapMau, nguCanhTest.key, { algorithms: ["HS256"], issuer: "libriflow-api", audience: "libriflow-client" });
        assert.deepEqual(Object.keys(noiDungToken).sort(), ["aud", "exp", "iat", "iss", "sub"]);
        assert.equal(noiDungToken.sub, "1");
        assert.equal(noiDungToken.exp - noiDungToken.iat, 900);
        const duLieuCuaToi = await guiYeuCau("/api/auth/me", { token: tokenTruyCapMau });
        assert.equal(duLieuCuaToi.status, 200);
        xacNhanKhongLoThongTinDangNhap(duLieuCuaToi.body);
        assert.deepEqual(duLieuCuaToi.body.data.roles, ["reader"]);
        const ketQuaDangXuat = await guiYeuCau("/api/auth/logout", { method: "POST", token: tokenTruyCapMau });
        assert.equal(ketQuaDangXuat.status, 200);
        assert.match(ketQuaDangXuat.body.message, /chưa được thu hồi/);
        assert.equal((await guiYeuCau("/api/auth/me", { token: tokenTruyCapMau })).status, 200);
    });
});

test("wrong password, unknown email, malformed stored hash return same 401", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        const ketQuaSai = await guiYeuCau("/api/auth/login", { method: "POST", body: { email: "reader@example.test", password: "wrong-test-password" } });
        const khongTonTai = await guiYeuCau("/api/auth/login", { method: "POST", body: { email: "absent@example.test", password: MAT_KHAU } });
        nguCanhTest.users.get("1").password = "plaintext-fixture-never-accepted";
        const saiDinhDang = await guiYeuCau("/api/auth/login", { method: "POST", body: { email: "reader@example.test", password: MAT_KHAU } });
        for (const r of [ketQuaSai, khongTonTai, saiDinhDang]) { assert.equal(r.status, 401); assert.equal(r.body.error.code, "INVALID_CREDENTIALS"); }
        assert.deepEqual(ketQuaSai.body, khongTonTai.body);
        assert.deepEqual(ketQuaSai.body, saiDinhDang.body);
    });
});

test("inactive and locked accounts rejected on login and with valid existing JWT", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        for (const [ma, thuDienTu] of [["4", "inactive@example.test"], ["5", "locked@example.test"]]) {
            assert.equal((await guiYeuCau("/api/auth/login", { method: "POST", body: { email: thuDienTu, password: MAT_KHAU } })).status, 403);
            const duLieuCuaToi = await guiYeuCau("/api/auth/me", { token: nguCanhTest.tokens.phatHanhToken(ma) });
            assert.equal(duLieuCuaToi.status, 403);
            assert.equal(duLieuCuaToi.body.error.code, "ACCOUNT_INACTIVE");
        }
    });
});

test("missing/malformed/expired/wrong-signature/wrong-algorithm/wrong-audience JWT -> 401", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        assert.equal((await guiYeuCau("/api/auth/me")).status, 401);
        const khoaSai = randomBytes(48).toString("base64url");
        const tuyChon = { subject: "1", issuer: "libriflow-api", audience: "libriflow-client", expiresIn: 900 };
        const cacTruongHop = ["not.a.token", jwt.sign({}, khoaSai, tuyChon), jwt.sign({}, nguCanhTest.key, { ...tuyChon, expiresIn: -1 }),
            jwt.sign({}, nguCanhTest.key, { ...tuyChon, algorithm: "HS384" }), jwt.sign({}, nguCanhTest.key, { ...tuyChon, audience: "other" }),
            jwt.sign({}, nguCanhTest.key, { ...tuyChon, subject: "0" }), jwt.sign({}, nguCanhTest.key, { ...tuyChon, noTimestamp: true }),
            jwt.sign({}, nguCanhTest.key, { ...tuyChon, expiresIn: 3600 }), jwt.sign({}, nguCanhTest.key, { ...tuyChon, issuer: "other" }),
            jwt.sign({}, nguCanhTest.key, { subject: "1", issuer: "libriflow-api", audience: "libriflow-client" })];
        for (const tokenTruyCapMau of cacTruongHop) assert.equal((await guiYeuCau("/api/auth/me", { token: tokenTruyCapMau })).status, 401);
        assert.equal(nguCanhTest.state.principalReads, 0);
        const daHetHan = await guiYeuCau("/api/auth/me", { token: cacTruongHop[2] });
        assert.equal(daHetHan.body.error.code, "TOKEN_EXPIRED");
    });
});

test("RBAC protects each write; public GET remains available; role label gives no implicit privilege", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    const cacPhuongThuc = [["POST", "/api/books", "book_create"], ["PUT", "/api/books/1", "book_update"], ["DELETE", "/api/books/1", "book_delete"]];
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        assert.equal((await guiYeuCau("/api/books")).status, 200);
        assert.equal((await guiYeuCau("/api/books/1")).status, 200);
        for (const [phuongThuc, duongDan] of cacPhuongThuc) {
            const noiDung = phuongThuc === "DELETE" ? undefined : { title: "Fixture", author: "Fixture author" };
            assert.equal((await guiYeuCau(duongDan, { method: phuongThuc, body: noiDung })).status, 401);
            assert.equal((await guiYeuCau(duongDan, { method: phuongThuc, body: noiDung, token: nguCanhTest.tokens.phatHanhToken("1") })).status, 403);
            const cacTruongChoPhep = await guiYeuCau(duongDan, { method: phuongThuc, body: noiDung, token: nguCanhTest.tokens.phatHanhToken("3") });
            assert.equal(cacTruongChoPhep.status, phuongThuc === "POST" ? 201 : 200);
        }
        assert.equal(nguCanhTest.state.writes, 3);
        // Kiểm tra đúng quyền từng thao tác, không chỉ thử admin có mọi quyền.
        for (const [phuongThucChoPhep, duongDanChoPhep, quyen] of cacPhuongThuc) {
            nguCanhTest.users.get("1").permissions = [quyen];
            for (const [phuongThuc, duongDan] of cacPhuongThuc) {
                const noiDung = phuongThuc === "DELETE" ? undefined : { title: "Fixture", author: "Fixture author" };
                const ketQua = await guiYeuCau(duongDan, { method: phuongThuc, body: noiDung, token: nguCanhTest.tokens.phatHanhToken("1") });
                assert.equal(ketQua.status, phuongThuc === phuongThucChoPhep && duongDan === duongDanChoPhep ? (phuongThuc === "POST" ? 201 : 200) : 403);
            }
        }
        nguCanhTest.users.get("1").permissions = ["book_view"];
        assert.equal((await guiYeuCau("/api/books/1", { method: "DELETE", token: nguCanhTest.tokens.phatHanhToken("2") })).status, 403);
        nguCanhTest.users.get("3").permissions = [];
        assert.equal((await guiYeuCau("/api/books/1", { method: "DELETE", token: nguCanhTest.tokens.phatHanhToken("3") })).status, 403);
        const vaiTroGiaMao = jwt.sign({ roles: ["admin"], permissions: ["book_delete"] }, nguCanhTest.key, { subject: "1", issuer: "libriflow-api", audience: "libriflow-client", expiresIn: 900 });
        assert.equal((await guiYeuCau("/api/books/1", { method: "DELETE", token: vaiTroGiaMao })).status, 403);
    });
});

test("permission/status changes and deleted accounts take effect on next request", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        const tokenTruyCapMau = nguCanhTest.tokens.phatHanhToken("3");
        nguCanhTest.users.get("3").status = "locked";
        assert.equal((await guiYeuCau("/api/books/1", { method: "DELETE", token: tokenTruyCapMau })).status, 403);
        nguCanhTest.users.delete("3");
        assert.equal((await guiYeuCau("/api/auth/me", { token: tokenTruyCapMau })).status, 401);
    });
});

test("missing/short JWT_SECRET fails closed before any registration or login lookup", async () => {
    for (const khoa of [undefined, "short"]) {
        const nguCanhTest = taoNguCanhKiemThu();nguCanhTest.tokens = taoDichVuJwt({ getSecret: () => khoa });
        nguCanhTest.authModel.layThongTinDangNhap = async () => { throw new Error("Should not query credentials"); };
        await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
            for (const [duongDan, noiDung] of [["register", DU_LIEU_DANG_KY], ["login", { email: DU_LIEU_DANG_KY.email, password: MAT_KHAU }]]) {
                const ketQua = await guiYeuCau(`/api/auth/${duongDan}`, { method: "POST", body: noiDung });
                assert.equal(ketQua.status, 503);
                assert.equal(ketQua.body.error.code, "JWT_NOT_CONFIGURED");
            }
            assert.equal(nguCanhTest.state.registrations, 0);
            assert.equal((await guiYeuCau("/api/books")).status, 200);
        });
    }
});

test("login rate limited per IP after 10 attempts", async () => {
    const nguCanhTest = taoNguCanhKiemThu();
    await voiUngDungKiemThu(nguCanhTest, async guiYeuCau => {
        for (let i = 0; i < 10; i++) assert.equal((await guiYeuCau("/api/auth/login", { method: "POST", body: {} })).status, 400);
        const ketQua = await guiYeuCau("/api/auth/login", { method: "POST", body: {} });
        assert.equal(ketQua.status, 429);assert.equal(ketQua.body.error.code, "TOO_MANY_ATTEMPTS");
    });
});

test("auth model atomically inserts only hashed password and fixed reader relation", async () => {
    const cacLanGoi = [];
    const cacDong = [{ user_id: "99", name: "Test reader", email: DU_LIEU_DANG_KY.email, status: "active", role_name: "reader", permission_name: "book_view" }];
    const ketNoi = {
        async beginTransaction() { cacLanGoi.push("begin"); }, async commit() { cacLanGoi.push("commit"); }, async rollback() { cacLanGoi.push("rollback"); }, release() { cacLanGoi.push("release"); },
        async execute(cauSql, thamSo) {
            cacLanGoi.push({ sql: cauSql, params: thamSo });
            if (cauSql.startsWith("SELECT role_id")) { assert.deepEqual(thamSo, ["reader"]); return [[{ role_id: "7", name: "reader" }]]; }
            if (cauSql.startsWith("INSERT INTO NguoiDung (")) { assert.equal(thamSo[2], maBamMatKhau); assert.equal(thamSo[4], "active"); return [{ insertId: "99" }]; }
            if (cauSql.startsWith("INSERT INTO NguoiDung_VaiTro")) { assert.deepEqual(thamSo, ["99", "7"]); return [{ affectedRows: 1 }]; }
            assert.ok(!cauSql.includes("u.password"));return [cacDong];
        },
    };
    const moHinh = taoMoHinhXacThuc({ async getConnection() { return ketNoi; } });
    const nguoiDung = await moHinh.dangKyDocGia({ name: DU_LIEU_DANG_KY.name, email: DU_LIEU_DANG_KY.email, phone: null }, maBamMatKhau);
    assert.deepEqual(nguoiDung.roles, ["reader"]);assert.deepEqual(nguoiDung.permissions, ["book_view"]);
    assert.deepEqual(cacLanGoi.slice(-2), ["commit", "release"]);
    assert.ok(!cacLanGoi.some(c => typeof c === "object" && c.params.includes(MAT_KHAU)));
});

test("auth model missing reader or duplicate email rolls back and never commits", async () => {
    for (const biTrung of [false, true]) {
        const cacLanGoi = [];
        const ketNoi = {
            async beginTransaction() {}, async commit() { cacLanGoi.push("commit"); }, async rollback() { cacLanGoi.push("rollback"); }, release() { cacLanGoi.push("release"); },
            async execute(cauSql) {
                if (cauSql.startsWith("SELECT role_id")) return [biTrung ? [{ role_id: "1", name: "reader" }] : []];
                throw Object.assign(new Error("private SQL detail"), { code: "ER_DUP_ENTRY" });
            },
        };
        const moHinh = taoMoHinhXacThuc({ async getConnection() { return ketNoi; } });
        await assert.rejects(moHinh.dangKyDocGia(DU_LIEU_DANG_KY, maBamMatKhau), { code: biTrung ? "EMAIL_ALREADY_EXISTS" : "REGISTRATION_NOT_CONFIGURED" });
        assert.deepEqual(cacLanGoi, ["rollback", "release"]);
    }
});

test("RBAC model joins current DB assignments, deduplicates permissions, never selects hashes", async () => {
    const moHinh = taoMoHinhXacThuc({ async execute(cauSql, thamSo) {
        assert.ok(!/password/i.test(cauSql));assert.deepEqual(thamSo, ["1"]);
        for (const bang of ["NguoiDung_VaiTro", "VaiTro_QuyenHan", "QuyenHan"]) assert.ok(cauSql.includes(bang));
        return [[{ user_id: "1", status: "active", role_name: "reader", permission_name: "book_view" },
            { user_id: "1", status: "active", role_name: "reader", permission_name: "book_view" }]];
    } });
    const ketQua = await moHinh.layNguoiDungXacThuc("1");assert.deepEqual(ketQua.roles, ["reader"]);assert.deepEqual(ketQua.permissions, ["book_view"]);
});

test.after(async () => { await boKetNoi.end(); });
