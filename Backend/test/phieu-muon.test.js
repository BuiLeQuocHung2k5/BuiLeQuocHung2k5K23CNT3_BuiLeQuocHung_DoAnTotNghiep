import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { taoUngDung } from "../src/app.js";
import boKetNoi from "../src/config/co-so-du-lieu.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";
import { taoMoHinhPhieuMuon } from "../src/models/phieu-muon.model.js";
import { kiemTraPhieuMuon, kiemTraTraSach } from "../src/utils/kiem-tra-phieu-muon.js";

const NOI_DUNG_YEU_CAU = { user_id: "30", copy_ids: ["2", "1"], due_date: "2035-01-01T12:00:00Z" };
const duLieuPhieuMuon = kiemTraPhieuMuon(NOI_DUNG_YEU_CAU);
const THONG_TIN_PHIEU = { borrow_id: "1", user_id: "30", status: "borrowed", borrow_date: "2026-11-06 00:00:00", due_date: "2035-01-01 12:00:00", note: null, created_at: "2026-11-06 00:00:00" };
const chiTiet = ma => ({ borrow_detail_id: String(100 + Number(ma)), borrow_id: "1", copy_id: String(ma), returned_at: null, condition_before: "good", condition_after: null, status: "borrowed" });
const banSao = (ma, trangThai = "available") => ({ copy_id: String(ma), condition_status: "good", availability_status: trangThai });
const dongKetHop = (ma, cauHinhThayThe = {}) => ({ ...THONG_TIN_PHIEU, ...chiTiet(ma), status: THONG_TIN_PHIEU.status, detail_status: "borrowed", ...cauHinhThayThe });

async function voiUngDungKiemThu(cauHinhThayThe, chay) {
    const khoa = randomBytes(48).toString("base64url"), dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const cacNguoiDungXacThuc = {
        admin: { user_id: "10", roles: ["admin"], permissions: ["borrow_manage", "return_process"] },
        librarian: { user_id: "20", roles: ["librarian"], permissions: ["borrow_manage", "return_process"] },
        reader: { user_id: "30", roles: ["reader"], permissions: ["book_view"] },
        fakeAdmin: { user_id: "40", roles: ["admin"], permissions: [] },
        returnOnly: { user_id: "50", roles: ["staff"], permissions: ["return_process"] },
        borrowOnly: { user_id: "60", roles: ["staff"], permissions: ["borrow_manage"] },
    };
    const trangThaiKiemThu = { writes: 0, query: null, scope: undefined };
    const moHinhXacThuc = { async layNguoiDungXacThuc(ma) { const nguoiDung = Object.values(cacNguoiDungXacThuc).find(nguoiDung => nguoiDung.user_id === ma); return nguoiDung ? { ...nguoiDung, status: "active" } : null; } };
    const cacBanGhi = [THONG_TIN_PHIEU, { ...THONG_TIN_PHIEU, borrow_id: "2", user_id: "99" }];
    const moHinh = {
        async lietKe(truyVan) { trangThaiKiemThu.query = truyVan; const cacMuc = cacBanGhi.filter(banGhi => truyVan.user_id === undefined || truyVan.user_id === banGhi.user_id); return { items: cacMuc, total: cacMuc.length }; },
        async layTheoMa(ma, phamVi) { trangThaiKiemThu.scope = phamVi; return cacBanGhi.find(banGhi => banGhi.borrow_id === ma && (phamVi === null || banGhi.user_id === phamVi)) ?? null; },
        async taoMoi(duLieu) { trangThaiKiemThu.writes++; return { ...THONG_TIN_PHIEU, ...duLieu, borrow_id: "3" }; },
        async traCacBanSao(ma) { trangThaiKiemThu.writes++; return { ...THONG_TIN_PHIEU, borrow_id: ma, status: "returned" }; },
        ...cauHinhThayThe,
    };
    const mayChu = taoUngDung({ authModel: moHinhXacThuc, tokens: dichVuToken, borrowModel: moHinh }).listen(0, "127.0.0.1");
    await once(mayChu, "listening");const diaChiGoc = `http://127.0.0.1:${mayChu.address().port}`;
    const guiYeuCau = async (duongDan, phuongThuc = "GET", noiDung, vaiTro) => {
        const phanHoi = await fetch(diaChiGoc + duongDan, { method: phuongThuc, headers: { ...(noiDung !== undefined ? { "Content-Type": "application/json" } : {}), ...(vaiTro ? { Authorization: `Bearer ${dichVuToken.phatHanhToken(cacNguoiDungXacThuc[vaiTro].user_id)}` } : {}) }, ...(noiDung !== undefined ? { body: JSON.stringify(noiDung) } : {}) });
        return { status: phanHoi.status, body: await phanHoi.json(), location: phanHoi.headers.get("location") };
    };
    try { await chay(guiYeuCau, trangThaiKiemThu); } finally { mayChu.closeAllConnections();await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
}

test("circulation routes require JWT; write permissions are separate and no role-name bypass", async () => {
    await voiUngDungKiemThu({}, async guiYeuCau => {
        for (const [duongDan, phuongThuc, noiDung] of [["/api/borrows", "GET"], ["/api/borrows/1", "GET"], ["/api/borrows", "POST", NOI_DUNG_YEU_CAU], ["/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }]]) assert.equal((await guiYeuCau(duongDan, phuongThuc, noiDung)).status, 401);
        for (const vaiTro of ["reader", "fakeAdmin"]) {
            assert.equal((await guiYeuCau("/api/borrows", "POST", NOI_DUNG_YEU_CAU, vaiTro)).status, 403);
            assert.equal((await guiYeuCau("/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }, vaiTro)).status, 403);
        }
        assert.equal((await guiYeuCau("/api/borrows", "POST", NOI_DUNG_YEU_CAU, "returnOnly")).status, 403);
        assert.equal((await guiYeuCau("/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }, "borrowOnly")).status, 403);
        for (const vaiTro of ["admin", "librarian"]) {
            const ketQuaTao = await guiYeuCau("/api/borrows", "POST", NOI_DUNG_YEU_CAU, vaiTro);assert.equal(ketQuaTao.status, 201);assert.equal(ketQuaTao.location, "/api/borrows/3");
            assert.equal((await guiYeuCau("/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }, vaiTro)).status, 200);
        }
    });
});

test("reader list and detail are ownership-scoped, forged user_id is denied and other IDs are 404", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        const ketQua = await guiYeuCau("/api/borrows/?page=1&limit=5", "GET", undefined, "reader");assert.equal(ketQua.status, 200);assert.equal(ketQua.body.data.length, 1);assert.equal(trangThaiKiemThu.query.user_id, "30");
        assert.equal((await guiYeuCau("/api/borrows/1", "GET", undefined, "reader")).status, 200);assert.equal(trangThaiKiemThu.scope, "30");
        assert.equal((await guiYeuCau("/api/borrows/2", "GET", undefined, "reader")).status, 404);
        assert.equal((await guiYeuCau("/api/borrows?user_id=99", "GET", undefined, "reader")).status, 403);
        assert.equal((await guiYeuCau("/api/borrows?user_id=30", "GET", undefined, "reader")).status, 403);
        assert.equal((await guiYeuCau("/api/borrows", "GET", undefined, "fakeAdmin")).status, 403);
        assert.equal((await guiYeuCau("/api/borrows", "GET", undefined, "returnOnly")).status, 403);
        assert.equal((await guiYeuCau("/api/borrows", "GET", undefined, "admin")).body.data.length, 2);
        assert.equal((await guiYeuCau("/api/borrows?user_id=99", "GET", undefined, "librarian")).body.data.length, 1);
    });
});

test("borrow validation rejects dates, duplicate/missing copies and client-controlled states", () => {
    for (const noiDung of [{ ...NOI_DUNG_YEU_CAU, copy_ids: [] }, { ...NOI_DUNG_YEU_CAU, copy_ids: ["1", 1] }, { ...NOI_DUNG_YEU_CAU, copy_ids: ["0"] },
        { ...NOI_DUNG_YEU_CAU, copy_ids: Array.from({ length: 101 }, (_, i) => String(i + 1)) }, { ...NOI_DUNG_YEU_CAU, user_id: "0" },
        { ...NOI_DUNG_YEU_CAU, due_date: "2035-02-30T12:00:00Z" }, { ...NOI_DUNG_YEU_CAU, due_date: "2020-01-01T00:00:00Z" },
        { ...NOI_DUNG_YEU_CAU, due_date: "2035-01-01" }, { ...NOI_DUNG_YEU_CAU, due_date: "2035-01-01T12:00:00+07:00" },
        { ...NOI_DUNG_YEU_CAU, status: "returned" }, { ...NOI_DUNG_YEU_CAU, borrow_date: "2030-01-01" }, { ...NOI_DUNG_YEU_CAU, note: "a".repeat(65536) }]) assert.throws(() => kiemTraPhieuMuon(noiDung), { status: 400 });
    assert.deepEqual(duLieuPhieuMuon.copy_ids, ["2", "1"]);assert.equal(duLieuPhieuMuon.due_date, "2035-01-01 12:00:00");
});

test("return validation supports explicit all or selected copies, never accepts statuses/user_id", () => {
    assert.deepEqual(kiemTraTraSach({ return_all: true, condition_after: "good" }), { return_all: true, condition_after: "good" });
    assert.equal(kiemTraTraSach({ items: [{ copy_id: "1", condition_after: "damaged" }] }).items[0].condition_after, "damaged");
    for (const noiDung of [{}, { items: [] }, { items: [{ copy_id: "1", condition_after: "bad" }] }, { items: [{ copy_id: "1", condition_after: "good" }, { copy_id: 1, condition_after: "good" }] },
        { return_all: true }, { return_all: false }, { return_all: true, condition_after: "good", items: [] }, { return_all: true, condition_after: "good", user_id: "1" },
        { items: [{ copy_id: "1", condition_after: "good", status: "returned" }] }]) assert.throws(() => kiemTraTraSach(noiDung), { status: 400 });
});

test("HTTP validation and query errors happen before model writes", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        for (const noiDung of [{ ...NOI_DUNG_YEU_CAU, copy_ids: [] }, { ...NOI_DUNG_YEU_CAU, copy_ids: ["1", "1"] }, { ...NOI_DUNG_YEU_CAU, status: "borrowed" }, { ...NOI_DUNG_YEU_CAU, due_date: "invalid" }]) assert.equal((await guiYeuCau("/api/borrows", "POST", noiDung, "admin")).status, 400);
        assert.equal((await guiYeuCau("/api/borrows/1/return", "POST", { items: [] }, "admin")).status, 400);
        for (const duongDan of ["/api/borrows?limit=101", "/api/borrows?status=invalid", "/api/borrows?user_id=0", "/api/borrows?search=secret", "/api/borrows/0"]) assert.equal((await guiYeuCau(duongDan, "GET", undefined, "admin")).status, 400);
        assert.equal(trangThaiKiemThu.writes, 0);
    });
});

function taoCoSoDuLieuMoPhong(cacBuoc) {
    const cacLanGoi = [];
    const ketNoi = {
        async beginTransaction() { cacLanGoi.push("begin"); }, async commit() { cacLanGoi.push("commit"); }, async rollback() { cacLanGoi.push("rollback"); }, release() { cacLanGoi.push("release"); },
        async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo });assert.ok(cacBuoc.length, "Unexpected SQL");const buoc = cacBuoc.shift();assert.match(cauSql, buoc.sql);if (buoc.error) throw buoc.error;return [buoc.rows]; },
    };
    return { calls: cacLanGoi, model: taoMoHinhPhieuMuon({ async getConnection() { return ketNoi; } }), xacNhanHetBuoc() { assert.equal(cacBuoc.length, 0); } };
}

function taoCacBuocThem(cacMa = ["1", "2"]) {
    return [{ sql: /FROM NguoiDung .* FOR SHARE$/, rows: [{ user_id: "30", status: "active" }] },
        ...cacMa.map(ma => ({ sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [banSao(ma)] })),
        ...cacMa.map(() => ({ sql: /FROM ChiTietPhieuMuon .* FOR UPDATE$/, rows: [] })),
        { sql: /^SELECT \(CAST\(\? AS DATETIME\)/, rows: [{ valid_due_date: "1" }] },
        { sql: /^INSERT INTO PhieuMuon/, rows: { insertId: "1" } },
        ...cacMa.flatMap(() => [{ sql: /^INSERT INTO ChiTietPhieuMuon/, rows: { affectedRows: 1 } }, { sql: /^UPDATE BanSaoSach SET availability_status = 'borrowed'/, rows: { affectedRows: 1 } }]),
        ...cacMa.map(() => ({ sql: /^INSERT INTO LichSuSuDung/, rows: { affectedRows: 1 } })),
        { sql: /FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon/, rows: cacMa.map(ma => dongKetHop(ma)) }];
}

test("create single/multiple borrow atomically locks sorted IDs and stores condition_before", async () => {
    for (const cacMa of [["1"], ["1", "2"], ["2", "10"]]) {
        const csdlKiemThu = taoCoSoDuLieuMoPhong(taoCacBuocThem(cacMa));const ketQua = await csdlKiemThu.model.taoMoi({ ...duLieuPhieuMuon, copy_ids: [...cacMa].reverse() });
        assert.equal(ketQua.details.length, cacMa.length);assert.equal(ketQua.borrow_id, "1");
        const cacKhoa = csdlKiemThu.calls.filter(c => typeof c === "object" && c.sql.includes("FROM BanSaoSach"));assert.deepEqual(cacKhoa.map(c => c.params[0]), cacMa);
        for (const lanGoi of csdlKiemThu.calls.filter(c => typeof c === "object" && c.sql.startsWith("INSERT INTO ChiTietPhieuMuon"))) assert.equal(lanGoi.params[2], "good");
        assert.deepEqual(csdlKiemThu.calls.slice(-2), ["commit", "release"]);csdlKiemThu.xacNhanHetBuoc();
    }
});

test("missing/inactive borrower rolls back before locking copies", async () => {
    for (const trangThai of [null, "inactive", "locked"]) {
        const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM NguoiDung .* FOR SHARE$/, rows: trangThai ? [{ status: trangThai }] : [] }]);
        await assert.rejects(csdlKiemThu.model.taoMoi(duLieuPhieuMuon), { status: trangThai ? 409 : 404, code: trangThai ? "BORROWER_INACTIVE" : "BORROWER_NOT_FOUND" });
        assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);csdlKiemThu.xacNhanHetBuoc();
    }
});

test("missing copy, borrowed/maintenance/lost/damaged copy or stale loan roll back without INSERT", async () => {
    const cacTruongHop = [null, banSao("1", "borrowed"), banSao("1", "maintenance"), banSao("1", "lost"), { ...banSao("1"), condition_status: "damaged" }, banSao("1")];
    for (const [i, duLieuMau] of cacTruongHop.entries()) {
        const cacBuoc = [{ sql: /FOR SHARE$/, rows: [{ status: "active" }] }, { sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: duLieuMau ? [duLieuMau] : [] }];
        if (i === 5) cacBuoc.push({ sql: /FROM ChiTietPhieuMuon/, rows: [{ borrow_detail_id: "5" }] });
        const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
        await assert.rejects(csdlKiemThu.model.taoMoi({ ...duLieuPhieuMuon, copy_ids: ["1"] }), { status: duLieuMau ? 409 : 404 });
        assert.ok(!csdlKiemThu.calls.some(c => typeof c === "object" && c.sql.startsWith("INSERT")));assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);csdlKiemThu.xacNhanHetBuoc();
    }
});

test("one invalid copy in a batch or due date expiring while waiting aborts whole create", async () => {
    let csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR SHARE$/, rows: [{ status: "active" }] }, { sql: /FOR UPDATE$/, rows: [banSao("1")] }, { sql: /FOR UPDATE$/, rows: [] }]);
    await assert.rejects(csdlKiemThu.model.taoMoi(duLieuPhieuMuon), { status: 404 });assert.ok(!csdlKiemThu.calls.some(c => typeof c === "object" && c.sql.startsWith("INSERT")));csdlKiemThu.xacNhanHetBuoc();
    const cacBuoc = taoCacBuocThem(["1"]);const ngayCat = cacBuoc.findIndex(s => /CAST/.test(s.sql.source));cacBuoc.splice(ngayCat, cacBuoc.length, { sql: /CAST/, rows: [{ valid_due_date: 0 }] });csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
    await assert.rejects(csdlKiemThu.model.taoMoi({ ...duLieuPhieuMuon, copy_ids: ["1"] }), { status: 400, code: "INVALID_DUE_DATE" });csdlKiemThu.xacNhanHetBuoc();
});

test("failure after detail INSERT or copy UPDATE rolls back rather than committing a partial loan", async () => {
    for (const cauSql of [/^INSERT INTO ChiTietPhieuMuon/, /^UPDATE BanSaoSach/]) {
        const cacBuoc = taoCacBuocThem(["1"]);
        // Chọn câu lệnh theo thứ tự bước đã xác định cho fixture một bản sao.
        const viTriDich = cauSql.source.includes("INSERT") ? 5 : 6;
        cacBuoc.splice(viTriDich, cacBuoc.length, { sql: cauSql, error: Object.assign(new Error("Private failure"), { code: "ER_LOCK_DEADLOCK" }) });
        const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);await assert.rejects(csdlKiemThu.model.taoMoi({ ...duLieuPhieuMuon, copy_ids: ["1"] }), { code: "ER_LOCK_DEADLOCK" });
        assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);assert.ok(!csdlKiemThu.calls.includes("commit"));csdlKiemThu.xacNhanHetBuoc();
    }
});

function taoCacBuocTra(cacDong, cacMaDuocChon, cacDongKetQuaCuoi = []) {
    const cacMa = [...new Set(cacDong.map(dongDuLieu => dongDuLieu.copy_id))].sort((a, b) => Number(a) - Number(b));
    return [{ sql: /FROM PhieuMuon .* FOR UPDATE$/, rows: [{ borrow_id: "1", user_id: "30", status: "borrowed" }] },
        { sql: /FROM ChiTietPhieuMuon WHERE borrow_id = \?$/, rows: cacDong },
        ...cacMa.map(ma => ({ sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [banSao(ma, "borrowed")] })),
        { sql: /FROM ChiTietPhieuMuon .* ORDER BY copy_id FOR UPDATE$/, rows: cacDong },
        ...cacMaDuocChon.map(ma => ({ sql: /FROM ChiTietPhieuMuon WHERE copy_id = \?.*FOR UPDATE$/, rows: [cacDong.find(dongDuLieu => dongDuLieu.copy_id === ma)] })),
        ...cacMaDuocChon.flatMap(() => [{ sql: /^UPDATE ChiTietPhieuMuon/, rows: { affectedRows: 1 } }, { sql: /^UPDATE BanSaoSach/, rows: { affectedRows: 1 } }]),
        { sql: /^UPDATE PhieuMuon SET status = \?/, rows: { affectedRows: 1 } },
        ...cacMaDuocChon.map(() => ({ sql: /^INSERT INTO LichSuSuDung/, rows: { affectedRows: 1 } })),
        { sql: /FROM PhieuMuon p LEFT JOIN ChiTietPhieuMuon/, rows: cacDongKetQuaCuoi.length ? cacDongKetQuaCuoi : cacDong.map(dongDuLieu => dongKetHop(dongDuLieu.copy_id)) }];
}

test("partial return updates detail and copy together, damaged -> maintenance, header partially_returned", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong(taoCacBuocTra([chiTiet("1"), chiTiet("2")], ["1"]));
    await csdlKiemThu.model.traCacBanSao("1", { items: [{ copy_id: "1", condition_after: "damaged" }] });
    const soLanGhi = csdlKiemThu.calls.filter(c => typeof c === "object" && c.sql.startsWith("UPDATE"));
    assert.deepEqual(soLanGhi[0].params, ["damaged", "101"]);assert.deepEqual(soLanGhi[1].params, ["damaged", "maintenance", "1"]);assert.deepEqual(soLanGhi[2].params, ["partially_returned", "1"]);
    assert.deepEqual(csdlKiemThu.calls.slice(-2), ["commit", "release"]);csdlKiemThu.xacNhanHetBuoc();
});

test("return all and finish a previously partial loan; preserve already returned details", async () => {
    for (const traMotPhan of [false, true]) {
        const cacDong = [traMotPhan ? { ...chiTiet("1"), status: "returned", returned_at: "2026-11-06 01:00:00" } : chiTiet("1"), chiTiet("2")];
        const cacMaDuocChon = traMotPhan ? ["2"] : ["1", "2"];
        const csdlKiemThu = taoCoSoDuLieuMoPhong(taoCacBuocTra(cacDong, cacMaDuocChon));await csdlKiemThu.model.traCacBanSao("1", { return_all: true, condition_after: "good" });
        const soLanGhi = csdlKiemThu.calls.filter(c => typeof c === "object" && c.sql.startsWith("UPDATE"));
        assert.equal(soLanGhi.length, cacMaDuocChon.length * 2 + 1);assert.deepEqual(soLanGhi.at(-1).params, ["returned", "1"]);
        for (const lenhGhi of soLanGhi.filter(c => c.sql.startsWith("UPDATE BanSaoSach"))) assert.equal(lenhGhi.params[1], "available");csdlKiemThu.xacNhanHetBuoc();
    }
});

test("missing/completed/cancelled loan never changes data", async () => {
    for (const trangThai of [null, "returned", "cancelled"]) {
        const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM PhieuMuon .* FOR UPDATE$/, rows: trangThai ? [{ borrow_id: "1", status: trangThai }] : [] }]);
        await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { return_all: true, condition_after: "good" }), { status: trangThai ? 409 : 404 });csdlKiemThu.xacNhanHetBuoc();
    }
});

test("repeat return and copy from another loan fail before writes", async () => {
    for (const lapLai of [false, true]) {
        const cacDong = [lapLai ? { ...chiTiet("1"), status: "returned", returned_at: "2026-11-06 00:00:00" } : chiTiet("1")];
        const cacBuoc = taoCacBuocTra(cacDong, []);cacBuoc.splice(4);
        const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
        await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { items: [{ copy_id: lapLai ? "1" : "99", condition_after: "good" }] }), { status: lapLai ? 409 : 400, code: lapLai ? "ALREADY_RETURNED" : "COPY_NOT_IN_BORROW" });
        assert.ok(!csdlKiemThu.calls.some(c => typeof c === "object" && c.sql.startsWith("UPDATE")));csdlKiemThu.xacNhanHetBuoc();
    }
});

test("inconsistent circulation or duplicate open loan is rejected, not silently repaired", async () => {
    for (const biTrung of [false, true]) {
        const cacBuoc = taoCacBuocTra([chiTiet("1")], ["1"]);
        if (biTrung) cacBuoc[4].rows = [chiTiet("1"), { ...chiTiet("1"), borrow_detail_id: "999", borrow_id: "2" }];
        else cacBuoc[2].rows = [banSao("1", "available")];
        cacBuoc.splice(biTrung ? 5 : 4);
        const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { items: [{ copy_id: "1", condition_after: "good" }] }), { status: 409, code: "RETURN_STATE_CONFLICT" });csdlKiemThu.xacNhanHetBuoc();
    }
});

test("partial return batch with one invalid member or write failure rolls back entirely", async () => {
    let cacBuoc = taoCacBuocTra([chiTiet("1"), chiTiet("2")], ["1"]);cacBuoc.splice(6);let csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
    await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { items: [{ copy_id: "1", condition_after: "good" }, { copy_id: "99", condition_after: "good" }] }), { status: 400 });
    assert.ok(!csdlKiemThu.calls.some(c => typeof c === "object" && c.sql.startsWith("UPDATE")));csdlKiemThu.xacNhanHetBuoc();
    cacBuoc = taoCacBuocTra([chiTiet("1")], ["1"]);cacBuoc.splice(6, cacBuoc.length, { sql: /^UPDATE BanSaoSach/, error: Object.assign(new Error("Private failure"), { code: "ER_LOCK_DEADLOCK" }) });csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
    await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { items: [{ copy_id: "1", condition_after: "good" }] }), { code: "ER_LOCK_DEADLOCK" });assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);csdlKiemThu.xacNhanHetBuoc();
});

test("reader SQL scopes count, list and joined detail in the database before returning any rows", async () => {
    const cacLanGoi = [];
    const moHinh = taoMoHinhPhieuMuon({ async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo });return cauSql.includes("COUNT(*)") ? [[{ total: "0" }]] : [[]]; }, async query(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo });return [[]]; } });
    await moHinh.lietKe({ user_id: "30", status: "borrowed", limit: 5, offset: 0 });assert.equal(await moHinh.layTheoMa("2", "30"), null);
    for (const lanGoi of cacLanGoi) { assert.ok(lanGoi.sql.includes("p.user_id = ?"));assert.ok(lanGoi.params.includes("30"));assert.ok(!lanGoi.sql.includes("password")); }
    assert.deepEqual(cacLanGoi.at(-1).params, ["2", "30"]);
});

test("HTTP with real circulation model propagates unavailable copy and repeat return as 409, rolling back", async () => {
    let csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM NguoiDung/, rows: [{ status: "active" }] }, { sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [banSao("1", "borrowed")] }]);
    await voiUngDungKiemThu(csdlKiemThu.model, async guiYeuCau => {
        const ketQua = await guiYeuCau("/api/borrows", "POST", { ...NOI_DUNG_YEU_CAU, copy_ids: ["1"] }, "admin");
        assert.equal(ketQua.status, 409);assert.equal(ketQua.body.error.code, "COPY_NOT_BORROWABLE");
    });assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);csdlKiemThu.xacNhanHetBuoc();
    csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM PhieuMuon .* FOR UPDATE$/, rows: [{ borrow_id: "1", status: "returned" }] }]);
    await voiUngDungKiemThu(csdlKiemThu.model, async guiYeuCau => {
        const ketQua = await guiYeuCau("/api/borrows/1/return", "POST", { return_all: true, condition_after: "good" }, "librarian");
        assert.equal(ketQua.status, 409);assert.equal(ketQua.body.error.code, "BORROW_NOT_RETURNABLE");
    });csdlKiemThu.xacNhanHetBuoc();
});

test("empty/duplicate/changed loan details fail closed instead of inventing or deleting history", async () => {
    for (const cacDong of [[], [chiTiet("1"), { ...chiTiet("1"), borrow_detail_id: "999" }]]) {
        const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM PhieuMuon .* FOR UPDATE$/, rows: [{ status: "borrowed" }] }, { sql: /FROM ChiTietPhieuMuon/, rows: cacDong }]);
        await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { return_all: true, condition_after: "good" }), { status: 409, code: "BORROW_REQUIRES_REVIEW" });csdlKiemThu.xacNhanHetBuoc();
    }
    const cacBuoc = taoCacBuocTra([chiTiet("1")], []);cacBuoc[3].rows = [{ ...chiTiet("1"), copy_id: "2" }];cacBuoc.splice(4);
    const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { return_all: true, condition_after: "good" }), { status: 409, code: "BORROW_CHANGED" });csdlKiemThu.xacNhanHetBuoc();
});

test("two simulated concurrent borrowers compete for the same copy: only one commits", async () => {
    let hangDoi = Promise.resolve(), trangThaiKiemThu = "available", soLanCommit = 0;
    const boKetNoiMoPhong = { async getConnection() {
        let moKhoa, dangCho = false;
        return {
            async beginTransaction() {},
            async execute(cauSql) {
                if (cauSql.includes("FROM NguoiDung")) return [[{ status: "active" }]];
                if (cauSql.includes("FROM BanSaoSach")) { const truocDo = hangDoi;hangDoi = new Promise(hoanThanh => { moKhoa = hoanThanh; });await truocDo;return [[banSao("1", trangThaiKiemThu)]]; }
                if (cauSql.includes("FROM ChiTietPhieuMuon")) return [[]];
                if (cauSql.includes("CAST(")) return [[{ valid_due_date: 1 }]];
                if (cauSql.startsWith("INSERT INTO PhieuMuon")) return [{ insertId: "1" }];
                if (cauSql.startsWith("UPDATE BanSaoSach")) dangCho = true;
                if (cauSql.includes("FROM PhieuMuon p LEFT JOIN")) return [[dongKetHop("1")]];
                return [{ affectedRows: 1 }];
            },
            async commit() { if (dangCho) { trangThaiKiemThu = "borrowed";soLanCommit++; }moKhoa?.(); },
            async rollback() { moKhoa?.(); }, release() {},
        };
    } };
    const moHinh = taoMoHinhPhieuMuon(boKetNoiMoPhong);
    const cacKetQua = await Promise.allSettled([moHinh.taoMoi({ ...duLieuPhieuMuon, copy_ids: ["1"] }), moHinh.taoMoi({ ...duLieuPhieuMuon, copy_ids: ["1"], user_id: "40" })]);
    assert.equal(cacKetQua.filter(ketQua => ketQua.status === "fulfilled").length, 1);assert.equal(soLanCommit, 1);assert.equal(trangThaiKiemThu, "borrowed");
    assert.equal(cacKetQua.find(ketQua => ketQua.status === "rejected").reason.code, "COPY_NOT_BORROWABLE");
});

test.after(async () => { await boKetNoi.end(); });
