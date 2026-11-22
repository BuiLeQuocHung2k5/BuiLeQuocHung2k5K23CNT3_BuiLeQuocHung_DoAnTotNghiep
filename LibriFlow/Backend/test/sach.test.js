import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { taoUngDung } from "../src/app.js";
import boKetNoi from "../src/config/co-so-du-lieu.js";
import { taoMoHinhSach } from "../src/models/sach.model.js";
import { kiemTraNoiDungSach, kiemTraMa } from "../src/utils/kiem-tra-sach.js";
import { randomBytes } from "node:crypto";
import { taoDichVuJwt } from "../src/utils/jwt.js";

const DU_LIEU_MAU = { book_id: "1", category_id: null, series_id: null, title: "LibriFlow", author: "Test author", publisher: null, description: null, publication_year: 2026, created_at: "2026-01-01", updated_at: "2026-01-01" };
const NOI_DUNG_HOP_LE = { title: "New book", author: "Test author" };

async function voiUngDungKiemThu(moHinh, congViec) {
    const khoa = randomBytes(48).toString("base64url");
    const dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const moHinhXacThuc = { async layNguoiDungXacThuc() { return { user_id: "1", status: "active", roles: ["admin"], permissions: ["book_create", "book_update", "book_delete"] }; } };
    const tokenTruyCapMau = dichVuToken.phatHanhToken("1");
    const mayChu = taoUngDung({ bookModel: moHinh, authModel: moHinhXacThuc, tokens: dichVuToken }).listen(0, "127.0.0.1");
    await once(mayChu, "listening");
    const diaChiGoc = `http://127.0.0.1:${mayChu.address().port}`;
    async function guiYeuCau(duongDan, phuongThuc = "GET", noiDung, cacThongTinPhieu = {}) {
        const phanHoi = await fetch(diaChiGoc + duongDan, {
            method: phuongThuc, headers: { ...(noiDung !== undefined ? { "Content-Type": "application/json" } : {}), ...(phuongThuc !== "GET" ? { Authorization: `Bearer ${tokenTruyCapMau}` } : {}), ...cacThongTinPhieu },
            ...(noiDung !== undefined ? { body: typeof noiDung === "string" ? noiDung : JSON.stringify(noiDung) } : {}),
        });
        return { status: phanHoi.status, body: await phanHoi.json(), location: phanHoi.headers.get("location") };
    }
    try { await congViec(guiYeuCau); }
    finally { mayChu.closeAllConnections(); await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
}

test("HTTP book lifecycle through real router/controller/service with isolated model", async (t) => {
    const cacBanGhi = new Map([["1", { ...DU_LIEU_MAU }]]);
    let truyVan;
    const moHinh = {
        async lietKe(dauVao) { truyVan = dauVao; return { books: [...cacBanGhi.values()], total: cacBanGhi.size }; },
        async layTheoMa(ma) { return cacBanGhi.get(ma) ?? null; },
        async taoMoi(duLieu) { const sach = { ...DU_LIEU_MAU, ...duLieu, book_id: "2" }; cacBanGhi.set("2", sach); return sach; },
        async thayThe(ma, duLieu) { if (!cacBanGhi.has(ma)) return null; const sach = { ...cacBanGhi.get(ma), ...duLieu }; cacBanGhi.set(ma, sach); return sach; },
        async xoa(ma) { if (!cacBanGhi.has(ma)) return "missing"; if (ma === "1") return "referenced"; cacBanGhi.delete(ma); return "deleted"; },
    };
    await voiUngDungKiemThu(moHinh, async (guiYeuCau) => {
        await t.test("GET collection and trailing slash; pagination/search", async () => {
            const phanHoi = await guiYeuCau("/api/books/?page=2&limit=5&search=hello");
            assert.equal(phanHoi.status, 200);
            assert.deepEqual(phanHoi.body.pagination, { page: 2, limit: 5, total: 1, totalPages: 1 });
            assert.deepEqual(truyVan, { page: 2, limit: 5, offset: 5, search: "hello" });
            assert.equal((await guiYeuCau("/api/books")).status, 200);
        });
        await t.test("GET detail, missing and invalid ID", async () => {
            assert.equal((await guiYeuCau("/api/books/1")).body.data.title, DU_LIEU_MAU.title);
            assert.equal((await guiYeuCau("/api/books/999")).status, 404);
            for (const ma of ["0", "-1", "1.5", "abc", "18446744073709551616"]) assert.equal((await guiYeuCau(`/api/books/${ma}`)).status, 400);
            assert.equal((await guiYeuCau("/api/books/%E0%A4%A")).body.error.code, "INVALID_URL");
        });
        await t.test("POST valid body -> 201 and Location", async () => {
            const phanHoi = await guiYeuCau("/api/books", "POST", NOI_DUNG_HOP_LE);
            assert.equal(phanHoi.status, 201);
            assert.equal(phanHoi.location, "/api/books/2");
            assert.equal(phanHoi.body.data.category_id, null);
        });
        await t.test("PUT replacement and unchanged update; absent book -> 404", async () => {
            const noiDung = { ...NOI_DUNG_HOP_LE, title: "Replacement", publisher: "Publisher" };
            const phanHoi = await guiYeuCau("/api/books/2", "PUT", noiDung);
            assert.equal(phanHoi.status, 200);
            assert.equal(phanHoi.body.data.title, "Replacement");
            assert.equal((await guiYeuCau("/api/books/2", "PUT", noiDung)).status, 200);
            assert.equal((await guiYeuCau("/api/books/999", "PUT", NOI_DUNG_HOP_LE)).status, 404);
        });
        await t.test("DELETE referenced -> 409; unreferenced -> 200; repeat -> 404", async () => {
            assert.equal((await guiYeuCau("/api/books/1", "DELETE")).status, 409);
            assert.equal((await guiYeuCau("/api/books/2", "DELETE")).status, 200);
            assert.equal((await guiYeuCau("/api/books/2", "DELETE")).status, 404);
        });
        await t.test("health preserved and unknown route returns JSON", async () => {
            assert.equal((await guiYeuCau("/api/health")).body.message, "LibriFlow Backend is running");
            assert.equal((await guiYeuCau("/api/not-found")).body.error.code, "ROUTE_NOT_FOUND");
        });
        await t.test("invalid queries/body rejected before persistence", async () => {
            for (const hauTo of ["?page=0", "?limit=101", "?page=1&page=2", "?search=a&search=b", "?sort=title", "?page=9007199254740991&limit=100"]) {
                assert.equal((await guiYeuCau(`/api/books${hauTo}`)).status, 400, hauTo);
            }
            for (const noiDung of [{}, { title: "x" }, { ...NOI_DUNG_HOP_LE, title: " " }, { ...NOI_DUNG_HOP_LE, title: "x".repeat(256) },
                { ...NOI_DUNG_HOP_LE, isbn: "unused" }, { ...NOI_DUNG_HOP_LE, book_id: "1" }, { ...NOI_DUNG_HOP_LE, publication_year: -1 },
                { ...NOI_DUNG_HOP_LE, publication_year: "2026" }, { ...NOI_DUNG_HOP_LE, category_id: 0 }, { ...NOI_DUNG_HOP_LE, description: "a".repeat(65536) }, []]) {
                const phanHoi = await guiYeuCau("/api/books", "POST", noiDung);
                assert.equal(phanHoi.status, 400);
                assert.equal(phanHoi.body.success, false);
            }
            assert.equal((await guiYeuCau("/api/books", "POST", "{broken")).body.error.code, "INVALID_JSON");
            assert.equal((await guiYeuCau("/api/books", "POST", "hello", { "Content-Type": "text/plain" })).status, 415);
            assert.equal((await guiYeuCau("/api/books", "POST", { ...NOI_DUNG_HOP_LE, description: "a".repeat(270000) })).status, 413);
        });
    });
});

test("validation follows SQL boundaries and preserves unsigned BIGINT", () => {
    assert.equal(kiemTraMa("18446744073709551615"), "18446744073709551615");
    assert.throws(() => kiemTraMa(Number.MAX_SAFE_INTEGER + 1));
    const ketQua = kiemTraNoiDungSach({ ...NOI_DUNG_HOP_LE, title: "😀".repeat(255), category_id: "18446744073709551615", publication_year: 65535, description: "a".repeat(65535) });
    assert.equal(ketQua.category_id, "18446744073709551615");
    assert.equal(kiemTraNoiDungSach({ ...NOI_DUNG_HOP_LE, publication_year: 0 }).publication_year, 0);
    assert.throws(() => kiemTraNoiDungSach({ ...NOI_DUNG_HOP_LE, description: "😀".repeat(16384) }));
    assert.throws(() => kiemTraNoiDungSach({ ...NOI_DUNG_HOP_LE, title: "\ud800" }));
    assert.equal(kiemTraNoiDungSach(NOI_DUNG_HOP_LE).series_id, null);
});

test("ISBN retains leading zeros and X, validates prefixes and checksums", () => {
    const isbn = value => kiemTraNoiDungSach({ ...NOI_DUNG_HOP_LE, isbn: value }).isbn;
    assert.equal(isbn("0-8044-2957-x"), "080442957X");
    assert.equal(isbn("978 0 14 143955 6"), "9780141439556");
    assert.equal(isbn(" "), null);
    for (const value of ["0804429571", "9780141439557", "4006381333931", 9780141439556, "---"]) assert.throws(() => isbn(value));
});

test("database errors map to safe JSON without leaking SQL", async (t) => {
    for (const [maLoi, trangThai, maLoiApi] of [
        ["ER_DUP_ENTRY", 409, "DUPLICATE_VALUE"], ["ER_NO_REFERENCED_ROW_2", 400, "INVALID_REFERENCE"],
        ["ER_ROW_IS_REFERENCED_2", 409, "BOOK_IN_USE"], ["ER_DATA_TOO_LONG", 400, "INVALID_DATA"],
        ["ER_CHECK_CONSTRAINT_VIOLATED", 400, "INVALID_DATA"], ["ECONNREFUSED", 503, "DATABASE_UNAVAILABLE"],
        ["ER_LOCK_DEADLOCK", 503, "DATABASE_UNAVAILABLE"], ["UNEXPECTED", 500, "INTERNAL_ERROR"],
    ]) await t.test(maLoi, async () => {
        const truongHopLoi = async () => { throw Object.assign(new Error("SECRET_SQL_DETAILS"), { code: maLoi, sql: "SECRET_SQL_DETAILS" }); };
        await voiUngDungKiemThu({ taoMoi: truongHopLoi }, async (guiYeuCau) => {
            const phanHoi = await guiYeuCau("/api/books", "POST", NOI_DUNG_HOP_LE);
            assert.equal(phanHoi.status, trangThai);
            assert.equal(phanHoi.body.error.code, maLoiApi);
            assert.ok(!JSON.stringify(phanHoi).includes("SECRET_SQL_DETAILS"));
        });
    });
});

function taoKetNoiTheoKichBan(cacBuoc) {
    const cacLanGoi = [];
    const ketNoi = {
        async beginTransaction() { cacLanGoi.push("begin"); },
        async commit() { cacLanGoi.push("commit"); },
        async rollback() { cacLanGoi.push("rollback"); },
        release() { cacLanGoi.push("release"); },
        async execute(cauSql, thamSo) {
            cacLanGoi.push({ sql: cauSql, params: thamSo });
            assert.ok(cacBuoc.length, "Unexpected query");
            const buoc = cacBuoc.shift();
            assert.match(cauSql, buoc.sql);
            if (buoc.error) throw buoc.error;
            return [buoc.result];
        },
    };
    return { connection: ketNoi, calls: cacLanGoi, model: taoMoHinhSach({ async getConnection() { return ketNoi; } }) };
}

test("model SQL is parameterized; search escapes wildcard characters", async () => {
    const cacLanGoi = [];
    const moHinh = taoMoHinhSach({
        async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[{ total: "1" }]]; },
        async query(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[{ ...DU_LIEU_MAU, book_id: "18446744073709551615" }]]; },
    });
    const ketQua = await moHinh.lietKe({ search: "x%' OR 1=1 --_", limit: 5, offset: 10 });
    assert.equal(ketQua.books[0].book_id, "18446744073709551615");
    assert.equal(ketQua.total, 1);
    for (const lanGoi of cacLanGoi) { assert.ok(!lanGoi.sql.includes("OR 1=1")); assert.match(lanGoi.sql, /LIKE \? ESCAPE '='/); }
    assert.equal(cacLanGoi[0].params[0], "%x=%' OR 1==1 --=_%");
    assert.deepEqual(cacLanGoi[1].params.slice(-2), [5, 10]);
});

test("model deletes only book, locks parent, and commits", async () => {
    const { model: moHinh, calls: cacLanGoi } = taoKetNoiTheoKichBan([
        { sql: /SELECT .* FROM Sach .* FOR UPDATE$/, result: [DU_LIEU_MAU] },
        { sql: /SELECT copy_id FROM BanSaoSach/, result: [] },
        { sql: /^DELETE FROM Sach WHERE book_id = \?$/, result: { affectedRows: 1 } },
    ]);
    assert.equal(await moHinh.xoa("1"), "deleted");
    assert.equal(cacLanGoi[0], "begin");
    assert.deepEqual(cacLanGoi.slice(-2), ["commit", "release"]);
    for (const lanGoi of cacLanGoi.filter(c => typeof c === "object")) assert.deepEqual(lanGoi.params, ["1"]);
});

test("model does not delete missing/referenced books", async (t) => {
    for (const dangDuocThamChieu of [false, true]) await t.test(dangDuocThamChieu ? "has copies" : "missing", async () => {
        const cacBuoc = [{ sql: /FOR UPDATE$/, result: dangDuocThamChieu ? [DU_LIEU_MAU] : [] }];
        if (dangDuocThamChieu) cacBuoc.push({ sql: /FROM BanSaoSach/, result: [{ copy_id: "10" }] });
        const { model: moHinh, calls: cacLanGoi } = taoKetNoiTheoKichBan(cacBuoc);
        assert.equal(await moHinh.xoa("1"), dangDuocThamChieu ? "referenced" : "missing");
        assert.ok(!cacLanGoi.some(c => typeof c === "object" && c.sql.startsWith("DELETE")));
    });
});

test("model rolls back concurrent FK failure and releases connection", async () => {
    const loi = Object.assign(new Error("FK race"), { code: "ER_ROW_IS_REFERENCED_2" });
    const { model: moHinh, calls: cacLanGoi } = taoKetNoiTheoKichBan([
        { sql: /FOR UPDATE$/, result: [DU_LIEU_MAU] }, { sql: /FROM BanSaoSach/, result: [] },
        { sql: /^DELETE FROM Sach/, error: loi },
    ]);
    await assert.rejects(moHinh.xoa("1"), loi);
    assert.deepEqual(cacLanGoi.slice(-2), ["rollback", "release"]);
    assert.ok(!cacLanGoi.includes("commit"));
});

test("model insert/read preserves large insertId; update no-op is successful", async () => {
    const duLieu = kiemTraNoiDungSach(NOI_DUNG_HOP_LE);
    const giaTriLon = "18446744073709551615";
    const ketQuaTao = taoKetNoiTheoKichBan([
        { sql: /^INSERT INTO Sach .* VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)$/, result: { insertId: giaTriLon } },
        { sql: /WHERE book_id = \?$/, result: [{ ...DU_LIEU_MAU, ...duLieu, book_id: giaTriLon }] },
    ]);
    assert.equal((await ketQuaTao.model.taoMoi(duLieu)).book_id, giaTriLon);
    assert.deepEqual(ketQuaTao.calls[1].params, [null, null, duLieu.isbn, duLieu.title, duLieu.author, null, null, null]);
    assert.deepEqual(ketQuaTao.calls[2].params, [giaTriLon]);
    const ketQuaCapNhat = taoKetNoiTheoKichBan([
        { sql: /FOR UPDATE$/, result: [DU_LIEU_MAU] }, { sql: /^UPDATE Sach SET .* WHERE book_id = \?$/, result: { affectedRows: 0 } },
        { sql: /WHERE book_id = \?$/, result: [DU_LIEU_MAU] },
    ]);
    assert.equal((await ketQuaCapNhat.model.thayThe("1", duLieu)).book_id, "1");
    assert.equal(ketQuaCapNhat.calls[2].params.at(-1), "1");
});

test.after(async () => { await boKetNoi.end(); });
