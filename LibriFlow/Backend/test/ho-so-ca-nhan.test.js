import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync, gzipSync } from "node:zlib";
import { dungUngDung } from "../src/app-factory.js";
import { taoMoHinhXacThuc } from "../src/models/xac-thuc.model.js";
import { GIOI_HAN_AVATAR, kiemTraAnhDaiDien } from "../src/utils/anh-dai-dien.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";

function khoiPng(loai, noiDung) {
    const ten = Buffer.from(loai);
    const doDai = Buffer.alloc(4);
    const maKiemTra = Buffer.alloc(4);
    doDai.writeUInt32BE(noiDung.length);
    maKiemTra.writeUInt32BE(crc32(Buffer.concat([ten, noiDung])));
    return Buffer.concat([doDai, ten, noiDung, maKiemTra]);
}

const ANH = Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    khoiPng("IHDR", Buffer.from("00000001000000010806000000", "hex")),
    khoiPng("IDAT", deflateSync(Buffer.from([0, 93, 64, 55, 255]))),
    khoiPng("IEND", Buffer.alloc(0)),
]);
const ANH_WEBP = Buffer.from("UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=", "base64");

async function voiNguCanh(t, congViec) {
    const thuMuc = await mkdtemp(join(tmpdir(), ".libriflow-profile-"));
    const cacTaiKhoan = new Map(["9", "10", "11"].map(ma => [ma, {
        user_id: ma, status: ma === "11" ? "inactive" : "active", roles: ["reader"], permissions: ["book_view"],
        phone: null, avatar: null, password: "test-only-hash",
    }]));
    const dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const khoa = randomBytes(48).toString("hex");
    const cacCapNhat = [];
    let gayLoiCapNhat = false;
    const moHinh = {
        async layNguoiDungXacThuc(ma) { return cacTaiKhoan.get(ma); },
        async capNhatHoSo(ma, truong, giaTri) {
            if (gayLoiCapNhat) throw Error("Synthetic storage failure");
            cacCapNhat.push([ma, truong, giaTri]);
            const nguoiDung = cacTaiKhoan.get(ma);
            const avatarCu = nguoiDung.avatar;
            nguoiDung[truong] = giaTri;
            return { nguoiDung, avatarCu };
        },
    };
    const mayChu = dungUngDung({ database: { query() { throw Error("Unexpected SQL"); } }, authModel: moHinh, tokens: dichVuToken, avatarDirectory: thuMuc }).listen(0, "127.0.0.1");
    t.after(async () => {
        mayChu.closeAllConnections();
        await new Promise(hoanThanh => mayChu.close(hoanThanh));
        for (const ten of await readdir(thuMuc)) await unlink(join(thuMuc, ten));
        await rmdir(thuMuc);
    });
    await once(mayChu, "listening");
    const goc = `http://127.0.0.1:${mayChu.address().port}`;
    function gui(duongDan, { ma = "9", method = "GET", body, mime = "application/json", headers = {} } = {}) {
        return fetch(goc + duongDan, {
            method,
            headers: { ...(ma ? { Authorization: `Bearer ${dichVuToken.phatHanhToken(ma)}` } : {}),
                ...(body !== undefined ? { "Content-Type": mime } : {}), ...headers },
            body: mime === "application/json" && body !== undefined ? JSON.stringify(body) : body,
        });
    }
    await congViec({ gui, thuMuc, cacCapNhat, datLoiCapNhat: () => { gayLoiCapNhat = true; } });
}

test("self profile accepts domestic phone strings and rejects caller-supplied identity or role", async t => {
    await voiNguCanh(t, async ({ gui, cacCapNhat }) => {
        const capNhat = (body, ma = "9") => gui("/api/auth/me", { method: "PATCH", body, ma });
        assert.equal((await capNhat({ phone: "0912345678" }, null)).status, 401);
        assert.equal((await capNhat({ phone: "0912345678" }, "11")).status, 403);
        for (const sai of [{ user_id: "10", phone: "0912345678" }, { roles: ["admin"], phone: "0912345678" }, { phone: 912345678 }, { phone: "1234567890" }, {}]) {
            const r = await capNhat(sai);
            assert.equal(r.status, 400);
            assert.equal((await r.json()).error.code, "VALIDATION_ERROR");
        }
        assert.deepEqual(cacCapNhat, []);
        const phanHoi = await capNhat({ phone: " 02412345678 " });
        assert.equal(phanHoi.status, 200);
        const { data } = await phanHoi.json();
        assert.equal(data.phone, "02412345678");
        assert.equal(data.user_id, "9");
        assert.deepEqual(data.roles, ["reader"]);
        assert.equal(Object.hasOwn(data, "password"), false);
        assert.equal((await (await gui("/api/auth/me", { ma: "10" })).json()).data.phone, null);
        assert.equal((await (await gui("/api/auth/me")).json()).data.phone, "02412345678");
        assert.equal((await (await capNhat({ phone: null })).json()).data.phone, null);
        assert.deepEqual(cacCapNhat, [["9", "phone", "02412345678"], ["9", "phone", null]]);
    });
});

test("avatar serves only complete valid image types on local URLs, cleans replacements and rolls back known write failures", async t => {
    await voiNguCanh(t, async ({ gui, thuMuc, cacCapNhat, datLoiCapNhat }) => {
        const guiAnh = (body, mime = "image/png", luaChon = {}) => gui("/api/auth/me/avatar", { method: "PUT", body, mime, ...luaChon });
        const kiemTraLoi = async (phanHoi, status, code) => {
            const r = await phanHoi;
            assert.equal(r.status, status);
            assert.equal((await r.json()).error.code, code);
        };
        await kiemTraLoi(guiAnh(ANH, "image/png", { ma: null }), 401, "AUTHENTICATION_REQUIRED");
        await kiemTraLoi(guiAnh(ANH, "image/svg+xml"), 415, "UNSUPPORTED_MEDIA_TYPE");
        await kiemTraLoi(guiAnh(Buffer.from("MZ executable")), 400, "INVALID_AVATAR");
        await kiemTraLoi(guiAnh(ANH, "image/jpeg"), 400, "INVALID_AVATAR");
        await kiemTraLoi(guiAnh(ANH.subarray(0, -1)), 400, "INVALID_AVATAR");
        await kiemTraLoi(guiAnh(Buffer.concat([ANH, Buffer.from("hidden")])), 400, "INVALID_AVATAR");
        await kiemTraLoi(guiAnh(Buffer.alloc(GIOI_HAN_AVATAR + 1)), 413, "AVATAR_TOO_LARGE");
        await kiemTraLoi(guiAnh(gzipSync(ANH), "image/png", { headers: { "Content-Encoding": "gzip" } }), 415, "UNSUPPORTED_MEDIA_TYPE");
        await kiemTraLoi(gui("/api/auth/avatars/..%2Ftest.png", { ma: null }), 404, "AVATAR_NOT_FOUND");
        assert.deepEqual(await readdir(thuMuc), []);
        assert.deepEqual(cacCapNhat, []);

        const r = await guiAnh(ANH, "image/png", { headers: { "Content-Disposition": 'attachment; filename="../should-not-be-used.png"' } });
        assert.equal(r.status, 200);
        const { data } = await r.json();
        assert.match(data.avatar, /^\/api\/auth\/avatars\/[0-9a-f-]{36}\.png$/);
        const tep = data.avatar.split("/").at(-1);
        assert.deepEqual(await readdir(thuMuc), [tep]);
        assert.deepEqual(await readFile(join(thuMuc, tep)), ANH);
        const pic = await gui(data.avatar, { ma: null });
        assert.equal(pic.status, 200);
        assert.equal(pic.headers.get("content-type"), "image/png");
        assert.equal(pic.headers.get("content-disposition"), "inline");
        assert.equal(pic.headers.get("x-content-type-options"), "nosniff");
        assert.deepEqual(Buffer.from(await pic.arrayBuffer()), ANH);
        assert.equal((await (await gui("/api/auth/me")).json()).data.avatar, data.avatar);
        assert.equal((await (await gui("/api/auth/me", { ma: "10" })).json()).data.avatar, null);

        const doiAnh = await guiAnh(ANH_WEBP, "image/webp");
        assert.equal(doiAnh.status, 200);
        const { avatar: anhMoi } = (await doiAnh.json()).data;
        assert.match(anhMoi, /\.webp$/);
        await kiemTraLoi(gui(data.avatar, { ma: null }), 404, "AVATAR_NOT_FOUND");
        datLoiCapNhat();
        await kiemTraLoi(guiAnh(ANH), 500, "INTERNAL_ERROR");
        assert.deepEqual(await readdir(thuMuc), [anhMoi.split("/").at(-1)]);
        assert.equal((await (await gui("/api/auth/me")).json()).data.avatar, anhMoi);
    });
});

test("recognizes JPEG bytes even when the original path is unused", async () => {
    const duLieu = await readFile(new URL("../../Frontend/public/Anh/BiaSach/doi-gio-hu.jpg", import.meta.url));
    assert.equal(kiemTraAnhDaiDien(duLieu, "image/jpeg"), "jpg");
    assert.throws(() => kiemTraAnhDaiDien(duLieu.subarray(0, -1), "image/jpeg"), { code: "INVALID_AVATAR" });
});

test("model locks the JWT-selected account, updates a single allowlisted column and returns a current principal", async () => {
    const cacLenh = [];
    const ketNoi = {
        async beginTransaction() { cacLenh.push("begin"); },
        async execute(sql, bind) {
            cacLenh.push([sql, bind]);
            if (sql.startsWith("SELECT status")) return [[{ status: "active", avatar: null }]];
            if (sql.startsWith("UPDATE")) return [{ affectedRows: 1 }];
            if (sql.startsWith("SELECT u.user_id")) return [[{ user_id: "9", phone: "0912345678", role_name: "reader", permission_name: "book_view" }]];
            throw Error("Unexpected SQL");
        },
        async commit() { cacLenh.push("commit"); },
        async rollback() { cacLenh.push("rollback"); },
        release() { cacLenh.push("release"); },
    };
    const moHinh = taoMoHinhXacThuc({ async getConnection() { return ketNoi; } });
    await assert.rejects(moHinh.capNhatHoSo("9", "role", "admin"));
    const ketQua = await moHinh.capNhatHoSo("9", "phone", "0912345678");
    assert.equal(ketQua.nguoiDung.phone, "0912345678");
    assert.deepEqual(ketQua.nguoiDung.roles, ["reader"]);
    assert.equal(cacLenh[0], "begin");
    assert.match(cacLenh[1][0], /FOR UPDATE$/);
    assert.deepEqual(cacLenh[1][1], ["9"]);
    assert.deepEqual(cacLenh[2], ["UPDATE NguoiDung SET phone = ? WHERE user_id = ? AND status = 'active'", ["0912345678", "9"]]);
    assert.deepEqual(cacLenh[3][1], ["9"]);
    assert.deepEqual(cacLenh.slice(4), ["commit", "release"]);
});
