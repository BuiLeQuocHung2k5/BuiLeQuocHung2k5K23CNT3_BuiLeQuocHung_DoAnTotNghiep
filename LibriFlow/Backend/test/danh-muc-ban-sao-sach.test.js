import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { taoUngDung } from "../src/app.js";
import boKetNoi from "../src/config/co-so-du-lieu.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";
import { taoMoHinhDanhMuc } from "../src/models/danh-muc.model.js";
import { taoMoHinhBanSaoSach } from "../src/models/ban-sao-sach.model.js";
import { taoDichVuDanhMuc } from "../src/services/danh-muc.service.js";
import { taoDichVuBanSaoSach } from "../src/services/ban-sao-sach.service.js";
import { kiemTraDanhMuc, kiemTraBanSaoSach, kiemTraTruyVanBanSaoSach } from "../src/utils/kiem-tra-danh-muc-ban-sao.js";
import { LoiHttp } from "../src/utils/loi-http.js";

const DANH_MUC = { category_id: "1", name: "Test category", description: null, created_at: "2026-01-01" };
const BAN_SAO = { copy_id: "1", book_id: "1", barcode: "TEST-001", condition_status: "good", availability_status: "available", note: "INTERNAL_NOTE_FIXTURE", created_at: "2026-01-01", updated_at: "2026-01-01" };
const NOI_DUNG_BAN_SAO = { book_id: "1", barcode: "TEST-002" };
const NOI_DUNG_THAY_THE = { ...NOI_DUNG_BAN_SAO, condition_status: "good", availability_status: "available" };

async function voiUngDungKiemThu(cauHinhThayThe, chay) {
    const khoa = randomBytes(48).toString("base64url"), dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const trangThaiKiemThu = { categoryWrites: 0, copyWrites: 0, query: null };
    const cacNguoiDungXacThuc = {
        admin: { user_id: "1", roles: ["admin"], permissions: ["copy_manage", "book_create", "book_update", "book_delete", "category_manage"] },
        librarian: { user_id: "2", roles: ["librarian"], permissions: ["copy_manage", "book_create", "book_update", "category_manage"] },
        reader: { user_id: "3", roles: ["reader"], permissions: ["book_view"] },
        fakeAdmin: { user_id: "4", roles: ["admin"], permissions: [] },
        unprovisionedAdmin: { user_id: "5", roles: ["admin"], permissions: ["book_create", "book_update", "book_delete", "copy_manage"] },
    };
    const moHinhXacThuc = { async layNguoiDungXacThuc(ma) {
        const nguoiDungXacThuc = Object.values(cacNguoiDungXacThuc).find(p => p.user_id === ma);
        if (!nguoiDungXacThuc) return null;
        return { ...nguoiDungXacThuc, status: "active", permissions: nguoiDungXacThuc.permissions.filter(quyen => cauHinhThayThe.categoryPermissionInstalled !== false || quyen !== "category_manage") };
    } };
    const moHinhDanhMuc = {
        async lietKe(truyVan) { trangThaiKiemThu.query = truyVan; return { items: [DANH_MUC], total: 1 }; },
        async layTheoMa(ma) { return ma === "1" ? DANH_MUC : null; },
        async taoMoi(duLieu) { trangThaiKiemThu.categoryWrites++; return { ...DANH_MUC, ...duLieu }; },
        async thayThe(ma, duLieu) { trangThaiKiemThu.categoryWrites++; return ma === "1" ? { ...DANH_MUC, ...duLieu } : null; },
        async xoa(ma) { trangThaiKiemThu.categoryWrites++; return ma === "1"; },
        ...cauHinhThayThe.categoryModel,
    };
    const moHinhBanSaoSach = {
        async lietKe(truyVan) { trangThaiKiemThu.query = truyVan; return { items: [BAN_SAO], total: 1 }; },
        async layTheoMa(ma) { return ma === "1" ? BAN_SAO : null; },
        async sachTonTai(ma) { return ma === "1"; },
        async taoMoi(duLieu) { trangThaiKiemThu.copyWrites++; return { ...BAN_SAO, ...duLieu, copy_id: "2" }; },
        async thayThe(ma, duLieu) { trangThaiKiemThu.copyWrites++; return ma === "1" ? { ...BAN_SAO, ...duLieu } : null; },
        async xoa(ma) { trangThaiKiemThu.copyWrites++; return ma === "1"; },
        ...cauHinhThayThe.bookCopyModel,
    };
    const mayChu = taoUngDung({ categoryModel: moHinhDanhMuc, bookCopyModel: moHinhBanSaoSach, authModel: moHinhXacThuc, tokens: dichVuToken }).listen(0, "127.0.0.1");
    await once(mayChu, "listening");
    const diaChiGoc = `http://127.0.0.1:${mayChu.address().port}`;
    async function guiYeuCau(duongDan, phuongThuc = "GET", noiDung, vaiTro) {
        const phanHoi = await fetch(diaChiGoc + duongDan, { method: phuongThuc, headers: { ...(noiDung !== undefined ? { "Content-Type": "application/json" } : {}), ...(vaiTro ? { Authorization: `Bearer ${dichVuToken.phatHanhToken(cacNguoiDungXacThuc[vaiTro].user_id)}` } : {}) }, ...(noiDung !== undefined ? { body: JSON.stringify(noiDung) } : {}) });
        return { status: phanHoi.status, body: await phanHoi.json(), location: phanHoi.headers.get("location") };
    }
    try { await chay(guiYeuCau, trangThaiKiemThu); }
    finally { mayChu.closeAllConnections(); await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
}

test("category public list/detail, trailing slash, pagination and 400/404", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        const lietKe = await guiYeuCau("/api/categories/?page=2&limit=5&search=Test");
        assert.equal(lietKe.status, 200);assert.equal(lietKe.body.pagination.total, 1);
        assert.deepEqual(trangThaiKiemThu.query, { page: 2, limit: 5, offset: 5, search: "Test" });
        assert.equal((await guiYeuCau("/api/categories")).status, 200);
        assert.equal((await guiYeuCau("/api/categories/1")).body.data.name, DANH_MUC.name);
        assert.equal((await guiYeuCau("/api/categories/999")).status, 404);
        for (const duongDan of ["/api/categories/0", "/api/categories?limit=101", "/api/categories?page=0", "/api/categories?search=a&search=b", "/api/categories?unknown=1"]) assert.equal((await guiYeuCau(duongDan)).status, 400);
    });
});

test("category writes require category_manage: admin/librarian allowed, reader and missing permission denied", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        for (const [phuongThuc, duongDan] of [["POST", "/api/categories"], ["PUT", "/api/categories/1"], ["DELETE", "/api/categories/1"]]) {
            assert.equal((await guiYeuCau(duongDan, phuongThuc, phuongThuc === "DELETE" ? undefined : { name: "Test" })).status, 401);
            for (const vaiTro of ["reader", "fakeAdmin", "unprovisionedAdmin"]) {
                const phanHoi = await guiYeuCau(duongDan, phuongThuc, phuongThuc === "DELETE" ? undefined : { name: "Test" }, vaiTro);
                assert.equal(phanHoi.status, 403);assert.equal(phanHoi.body.error.code, "FORBIDDEN");
            }
            for (const vaiTro of ["admin", "librarian"]) assert.equal((await guiYeuCau(duongDan, phuongThuc, phuongThuc === "DELETE" ? undefined : { name: "Test" }, vaiTro)).status, phuongThuc === "POST" ? 201 : 200);
        }
        assert.equal(trangThaiKiemThu.categoryWrites, 6);
    });
});

test("category validation follows name/TEXT constraints and does not accept server fields", () => {
    assert.deepEqual(kiemTraDanhMuc({ name: "  Test  " }), { name: "Test", description: null });
    assert.equal(kiemTraDanhMuc({ name: "😀".repeat(100), description: "a".repeat(65535) }).description.length, 65535);
    for (const noiDung of [{ name: "" }, { name: "a".repeat(101) }, { name: "x", description: "a".repeat(65536) }, { name: "x", category_id: "1" }, { name: "\ud800" }, []]) assert.throws(() => kiemTraDanhMuc(noiDung), { status: 400 });
});

test("category permission not installed in DB model denies even admin/librarian, with zero writes", async () => {
    await voiUngDungKiemThu({ categoryPermissionInstalled: false }, async (guiYeuCau, trangThaiKiemThu) => {
        for (const vaiTro of ["admin", "librarian", "reader"]) for (const [phuongThuc, duongDan] of [["POST", "/api/categories"], ["PUT", "/api/categories/1"], ["DELETE", "/api/categories/1"]]) {
            assert.equal((await guiYeuCau(duongDan, phuongThuc, phuongThuc === "DELETE" ? undefined : { name: "Test" }, vaiTro)).status, 403);
        }
        assert.equal(trangThaiKiemThu.categoryWrites, 0);
        assert.equal((await guiYeuCau("/api/categories")).status, 200);
    });
});

test("category HTTP write lifecycle exposes existing validation, Location, full PUT and 404", async () => {
    await voiUngDungKiemThu({}, async guiYeuCau => {
        const ketQuaTao = await guiYeuCau("/api/categories", "POST", { name: "  Test  ", description: "Fixture" }, "librarian");
        assert.equal(ketQuaTao.status, 201);assert.equal(ketQuaTao.location, "/api/categories/1");assert.equal(ketQuaTao.body.data.name, "Test");
        const ketQuaThayThe = await guiYeuCau("/api/categories/1", "PUT", { name: "Replacement" }, "admin");
        assert.equal(ketQuaThayThe.status, 200);assert.equal(ketQuaThayThe.body.data.description, null);
        assert.equal((await guiYeuCau("/api/categories/1", "PUT", { name: "Replacement" }, "admin")).status, 200);
        for (const noiDung of [{}, { name: " " }, { name: "x".repeat(101) }, { name: "Test", description: "a".repeat(65536) }, { name: "Test", category_id: "1" }]) {
            for (const [phuongThuc,duongDan] of [["POST", "/api/categories"], ["PUT", "/api/categories/1"]]) assert.equal((await guiYeuCau(duongDan, phuongThuc, noiDung, "admin")).status, 400);
        }
        assert.equal((await guiYeuCau("/api/categories/0", "DELETE", undefined, "admin")).status, 400);
        assert.equal((await guiYeuCau("/api/categories/999", "PUT", { name: "Test" }, "admin")).status, 404);
        assert.equal((await guiYeuCau("/api/categories/999", "DELETE", undefined, "admin")).status, 404);
    });
});

test("category HTTP duplicate and referenced records are safe 409 errors", async () => {
    const biTrung = async () => { throw Object.assign(new Error("PRIVATE_SQL"), { code: "ER_DUP_ENTRY" }); };
    const dangDuocThamChieu = async () => { throw Object.assign(new Error("PRIVATE_SQL"), { code: "ER_ROW_IS_REFERENCED_2" }); };
    await voiUngDungKiemThu({ categoryModel: { taoMoi: biTrung, thayThe: biTrung, xoa: dangDuocThamChieu } }, async guiYeuCau => {
        for (const [phuongThuc,duongDan] of [["POST", "/api/categories"], ["PUT", "/api/categories/1"], ["DELETE", "/api/categories/1"]]) {
            const ketQua = await guiYeuCau(duongDan, phuongThuc, phuongThuc === "DELETE" ? undefined : { name: "Test" }, "admin");
            assert.equal(ketQua.status, 409);assert.ok(!JSON.stringify(ketQua.body).includes("PRIVATE_SQL"));
        }
    });
});

test("category HTTP DELETE with actual model locks and blocks books before any DELETE SQL", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM DanhMuc .* FOR UPDATE$/, rows: [DANH_MUC] }, { sql: /FROM Sach .* FOR UPDATE$/, rows: [{ book_id: "1" }] }]);
    await voiUngDungKiemThu({ categoryModel: taoMoHinhDanhMuc(csdlKiemThu.pool) }, async guiYeuCau => {
        const ketQua = await guiYeuCau("/api/categories/1", "DELETE", undefined, "librarian");
        assert.equal(ketQua.status, 409);assert.equal(ketQua.body.error.code, "CATEGORY_IN_USE");
    });
    assert.ok(!csdlKiemThu.calls.some(lanGoi => typeof lanGoi === "object" && lanGoi.sql.startsWith("DELETE")));
    assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);csdlKiemThu.xacNhanHetBuoc();
});

test("copy list filters and nested route are public, paginated, and omit internal note", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        const ketQua = await guiYeuCau("/api/book-copies/?book_id=1&condition_status=good&availability_status=borrowed&search=TEST&page=2&limit=3");
        assert.equal(ketQua.status, 200);assert.equal(ketQua.body.pagination.total, 1);
        assert.equal(trangThaiKiemThu.query.book_id, "1");assert.equal(trangThaiKiemThu.query.availability_status, "borrowed");
        assert.ok(!JSON.stringify(ketQua.body).includes("INTERNAL_NOTE_FIXTURE"));
        assert.ok(!Object.hasOwn(ketQua.body.data[0], "note"));
        assert.equal((await guiYeuCau("/api/book-copies")).status, 200);
        const chiTiet = await guiYeuCau("/api/book-copies/1");assert.equal(chiTiet.status, 200);assert.ok(!Object.hasOwn(chiTiet.body.data, "note"));
        assert.equal((await guiYeuCau("/api/book-copies/999")).status, 404);
        assert.equal((await guiYeuCau("/api/books/1/copies")).status, 200);assert.equal(trangThaiKiemThu.query.book_id, "1");
        assert.equal((await guiYeuCau("/api/books/999/copies")).status, 404);
        assert.equal((await guiYeuCau("/api/books/1/copies?book_id=2")).status, 400);
    });
});

test("copy writes use exactly copy_manage for admin/librarian; reader and role-only admin denied", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        for (const [phuongThuc, duongDan, noiDung] of [["POST", "/api/book-copies", NOI_DUNG_BAN_SAO], ["PUT", "/api/book-copies/1", NOI_DUNG_THAY_THE], ["DELETE", "/api/book-copies/1", undefined]]) {
            assert.equal((await guiYeuCau(duongDan, phuongThuc, noiDung)).status, 401);
            for (const vaiTro of ["reader", "fakeAdmin"]) assert.equal((await guiYeuCau(duongDan, phuongThuc, noiDung, vaiTro)).status, 403);
            for (const vaiTro of ["admin", "librarian"]) assert.equal((await guiYeuCau(duongDan, phuongThuc, noiDung, vaiTro)).status, phuongThuc === "POST" ? 201 : 200);
        }
        assert.equal(trangThaiKiemThu.copyWrites, 6);
        const ketQuaTao = await guiYeuCau("/api/book-copies", "POST", NOI_DUNG_BAN_SAO, "librarian");assert.equal(ketQuaTao.location, "/api/book-copies/2");
        assert.equal((await guiYeuCau("/api/book-copies/999", "PUT", NOI_DUNG_THAY_THE, "admin")).status, 404);
        assert.equal((await guiYeuCau("/api/book-copies/999", "DELETE", undefined, "admin")).status, 404);
    });
});

test("copy validation rejects unknown enums/fields/lengths/IDs and circulation state changes", async () => {
    assert.equal(kiemTraBanSaoSach(NOI_DUNG_BAN_SAO).condition_status, "good");assert.equal(kiemTraBanSaoSach(NOI_DUNG_BAN_SAO).availability_status, "available");
    for (const noiDung of [{ ...NOI_DUNG_BAN_SAO, barcode: "" }, { ...NOI_DUNG_BAN_SAO, barcode: "x".repeat(51) }, { ...NOI_DUNG_BAN_SAO, isbn: "x".repeat(21) },
        { ...NOI_DUNG_BAN_SAO, book_id: "0" }, { ...NOI_DUNG_BAN_SAO, copy_id: "1" }, { ...NOI_DUNG_BAN_SAO, condition_status: "new" }, { ...NOI_DUNG_BAN_SAO, availability_status: "pending" },
        { ...NOI_DUNG_BAN_SAO, condition_status: null }, { ...NOI_DUNG_BAN_SAO, availability_status: null }, { ...NOI_DUNG_BAN_SAO, note: "a".repeat(65536) }]) assert.throws(() => kiemTraBanSaoSach(noiDung), { status: 400 });
    assert.throws(() => kiemTraBanSaoSach(NOI_DUNG_BAN_SAO, true), { status: 400 });
    for (const trangThai of ["borrowed", "lost"]) assert.throws(() => kiemTraBanSaoSach({ ...NOI_DUNG_BAN_SAO, availability_status: trangThai }), { status: 409 });
    assert.equal(kiemTraBanSaoSach({ ...NOI_DUNG_BAN_SAO, book_id: "18446744073709551615" }).book_id, "18446744073709551615");
    for (const truyVan of [{ book_id: "0" }, { availability_status: "bad" }, { condition_status: ["good", "damaged"] }]) assert.throws(() => kiemTraTruyVanBanSaoSach(truyVan), { status: 400 });
    await voiUngDungKiemThu({}, async guiYeuCau => {
        for (const noiDung of [{ ...NOI_DUNG_BAN_SAO, barcode: "" }, { ...NOI_DUNG_BAN_SAO, condition_status: "new" }, { ...NOI_DUNG_BAN_SAO, availability_status: "bad" }]) assert.equal((await guiYeuCau("/api/book-copies", "POST", noiDung, "admin")).status, 400);
        for (const trangThai of ["borrowed", "lost"]) {
            assert.equal((await guiYeuCau("/api/book-copies", "POST", { ...NOI_DUNG_BAN_SAO, availability_status: trangThai }, "admin")).status, 409);
            assert.equal((await guiYeuCau("/api/book-copies/1", "PUT", { ...NOI_DUNG_THAY_THE, availability_status: trangThai }, "admin")).status, 409);
        }
        for (const duongDan of ["/api/book-copies/0", "/api/book-copies?availability_status=invalid", "/api/book-copies?limit=101", "/api/book-copies?book_id=1&book_id=2"]) assert.equal((await guiYeuCau(duongDan)).status, 400);
    });
});

test("copy DB constraint errors translate to 400/409 without SQL details", async () => {
    for (const [maLoi, trangThai] of [["ER_DUP_ENTRY", 409], ["ER_NO_REFERENCED_ROW_2", 400], ["ER_ROW_IS_REFERENCED_2", 409]]) {
        const truongHopLoi = async () => { throw Object.assign(new Error("PRIVATE_SQL_DETAILS"), { code: maLoi }); };
        await voiUngDungKiemThu({ bookCopyModel: { taoMoi: truongHopLoi, thayThe: truongHopLoi, xoa: truongHopLoi } }, async guiYeuCau => {
            for (const [phuongThuc, duongDan, noiDung] of [["POST", "/api/book-copies", NOI_DUNG_BAN_SAO], ["PUT", "/api/book-copies/1", NOI_DUNG_THAY_THE], ["DELETE", "/api/book-copies/1", undefined]]) {
                const ketQua = await guiYeuCau(duongDan, phuongThuc, noiDung, "admin");assert.equal(ketQua.status, trangThai);assert.ok(!JSON.stringify(ketQua.body).includes("PRIVATE_SQL_DETAILS"));
            }
        });
    }
});

test("copy HTTP returns 409 when model detects circulation/history conflicts", async () => {
    for (const maLoi of ["COPY_CIRCULATION_LOCKED", "COPY_HAS_LOAN_HISTORY", "COPY_HAS_USAGE_HISTORY"]) {
        const baoXungDot = async () => { throw new LoiHttp(409, maLoi, "Fixture conflict"); };
        await voiUngDungKiemThu({ bookCopyModel: { thayThe: baoXungDot, xoa: baoXungDot } }, async guiYeuCau => {
            const ketQua = await guiYeuCau("/api/book-copies/1", "DELETE", undefined, "librarian");assert.equal(ketQua.status, 409);assert.equal(ketQua.body.error.code, maLoi);
            assert.equal((await guiYeuCau("/api/book-copies/1", "PUT", NOI_DUNG_THAY_THE, "librarian")).status, 409);
        });
    }
});

function taoCoSoDuLieuMoPhong(cacBuoc) {
    const cacLanGoi = [];
    const ketNoi = {
        async beginTransaction() { cacLanGoi.push("begin"); }, async commit() { cacLanGoi.push("commit"); }, async rollback() { cacLanGoi.push("rollback"); }, release() { cacLanGoi.push("release"); },
        async execute(cauSql, thamSo) {
            cacLanGoi.push({ sql: cauSql, params: thamSo });assert.ok(cacBuoc.length, "Unexpected query");const buoc = cacBuoc.shift();assert.match(cauSql, buoc.sql);
            if (buoc.error) throw buoc.error;
            return [buoc.rows];
        },
    };
    return { calls: cacLanGoi, pool: { async getConnection() { return ketNoi; } }, xacNhanHetBuoc() { assert.equal(cacBuoc.length, 0); } };
}

test("category deletion locks parent and refuses referenced category before ON DELETE SET NULL", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM DanhMuc .* FOR UPDATE$/, rows: [DANH_MUC] }, { sql: /FROM Sach .* FOR UPDATE$/, rows: [{ book_id: "1" }] }]);
    await assert.rejects(taoMoHinhDanhMuc(csdlKiemThu.pool).xoa("1"), { status: 409, code: "CATEGORY_IN_USE" });
    assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);
    assert.ok(!csdlKiemThu.calls.some(c => typeof c === "object" && c.sql.startsWith("DELETE")));csdlKiemThu.xacNhanHetBuoc();
});

test("category model creates/replaces parameterized data, no-op update works, delete only unreferenced", async () => {
    let csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /^INSERT INTO DanhMuc .* VALUES \(\?, \?\)$/, rows: { insertId: "1" } }, { sql: /FROM DanhMuc/, rows: [DANH_MUC] }]);
    assert.equal((await taoMoHinhDanhMuc(csdlKiemThu.pool).taoMoi({ name: DANH_MUC.name, description: null })).category_id, "1");assert.deepEqual(csdlKiemThu.calls[1].params, [DANH_MUC.name, null]);csdlKiemThu.xacNhanHetBuoc();
    csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR UPDATE$/, rows: [DANH_MUC] }, { sql: /^UPDATE DanhMuc/, rows: { affectedRows: 0 } }, { sql: /FROM DanhMuc/, rows: [DANH_MUC] }]);
    assert.equal((await taoMoHinhDanhMuc(csdlKiemThu.pool).thayThe("1", { name: DANH_MUC.name, description: null })).category_id, "1");csdlKiemThu.xacNhanHetBuoc();
    csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR UPDATE$/, rows: [DANH_MUC] }, { sql: /FROM Sach .* FOR UPDATE$/, rows: [] }, { sql: /^DELETE FROM DanhMuc WHERE category_id = \?$/, rows: { affectedRows: 1 } }]);
    assert.equal(await taoMoHinhDanhMuc(csdlKiemThu.pool).xoa("1"), true);assert.deepEqual(csdlKiemThu.calls.slice(-2), ["commit", "release"]);csdlKiemThu.xacNhanHetBuoc();
});

test("category service catches duplicate/foreign-reference errors and handles missing records", async () => {
    const biTrung = Object.assign(new Error("PRIVATE_SQL"), { code: "ER_DUP_ENTRY" });
    await assert.rejects(taoDichVuDanhMuc({ async taoMoi() { throw biTrung; } }).taoMoi({ name: "Fixture" }), { status: 409, code: "DUPLICATE_VALUE" });
    await assert.rejects(taoDichVuDanhMuc({ async xoa() { throw Object.assign(new Error(), { code: "ER_ROW_IS_REFERENCED_2" }); } }).xoa("1"), { status: 409, code: "CATEGORY_IN_USE" });
    const moHinh = { async layTheoMa() { return null; }, async thayThe() { return null; }, async xoa() { return false; } };
    const dichVu = taoDichVuDanhMuc(moHinh);
    for (const thaoTac of [() => dichVu.layTheoMa("1"), () => dichVu.thayThe("1", {}), () => dichVu.xoa("1")]) await assert.rejects(thaoTac(), { status: 404 });
});

test("copy create checks and locks parent book, parameterizes UNIQUE fields", async () => {
    const duLieu = kiemTraBanSaoSach(NOI_DUNG_BAN_SAO);
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM Sach .* FOR SHARE$/, rows: [{ book_id: "1" }] }, { sql: /^INSERT INTO BanSaoSach .* VALUES \(\?, \?, \?, \?, \?\)$/, rows: { insertId: "18446744073709551615" } }, { sql: /FROM BanSaoSach/, rows: [{ ...BAN_SAO, copy_id: "18446744073709551615" }] }]);
    const ketQua = await taoMoHinhBanSaoSach(csdlKiemThu.pool).taoMoi(duLieu);assert.equal(ketQua.copy_id, "18446744073709551615");
    assert.deepEqual(csdlKiemThu.calls[2].params, ["1", "TEST-002", "good", "available", null]);assert.deepEqual(csdlKiemThu.calls.slice(-2), ["commit", "release"]);csdlKiemThu.xacNhanHetBuoc();
});

test("missing book aborts creation before INSERT", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM Sach .* FOR SHARE$/, rows: [] }]);
    await assert.rejects(taoMoHinhBanSaoSach(csdlKiemThu.pool).taoMoi(kiemTraBanSaoSach(NOI_DUNG_BAN_SAO)), { status: 400, code: "INVALID_REFERENCE" });
    assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);csdlKiemThu.xacNhanHetBuoc();
});

test("duplicate barcode causes rollback/release and safe 409", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR SHARE$/, rows: [{ book_id: "1" }] }, { sql: /^INSERT INTO BanSaoSach/, error: Object.assign(new Error("Private duplicate barcode"), { code: "ER_DUP_ENTRY" }) }]);
    await assert.rejects(taoDichVuBanSaoSach(taoMoHinhBanSaoSach(csdlKiemThu.pool)).taoMoi(kiemTraBanSaoSach(NOI_DUNG_BAN_SAO)), { status: 409, code: "DUPLICATE_VALUE" });
    assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);csdlKiemThu.xacNhanHetBuoc();
});

test("borrowed/lost copies cannot be edited or deleted even with copy_manage", async () => {
    for (const trangThai of ["borrowed", "lost"]) for (const thaoTac of ["thayThe", "xoa"]) {
        const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [{ ...BAN_SAO, availability_status: trangThai }] }]);
        await assert.rejects(taoMoHinhBanSaoSach(csdlKiemThu.pool)[thaoTac]("1", kiemTraBanSaoSach(NOI_DUNG_THAY_THE, true)), { status: 409, code: "COPY_CIRCULATION_LOCKED" });
        assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);csdlKiemThu.xacNhanHetBuoc();
    }
});

test("open or inconsistent loan blocks editing even when availability says available", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM BanSaoSach .* FOR UPDATE$/, rows: [BAN_SAO] }, { sql: /returned_at IS NULL OR status <> 'returned'.*FOR UPDATE$/, rows: [{ borrow_detail_id: "9" }] }]);
    await assert.rejects(taoMoHinhBanSaoSach(csdlKiemThu.pool).thayThe("1", kiemTraBanSaoSach(NOI_DUNG_THAY_THE, true)), { status: 409, code: "COPY_CIRCULATION_LOCKED" });csdlKiemThu.xacNhanHetBuoc();
});

test("any loan history (including returned) blocks deletion", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR UPDATE$/, rows: [BAN_SAO] }, { sql: /returned_at IS NULL/, rows: [] }, { sql: /FROM ChiTietPhieuMuon WHERE copy_id = \? LIMIT 1 FOR UPDATE$/, rows: [{ borrow_detail_id: "9" }] }]);
    await assert.rejects(taoMoHinhBanSaoSach(csdlKiemThu.pool).xoa("1"), { status: 409, code: "COPY_HAS_LOAN_HISTORY" });
    assert.ok(!csdlKiemThu.calls.some(c => typeof c === "object" && c.sql.startsWith("DELETE")));csdlKiemThu.xacNhanHetBuoc();
});

test("usage history blocks deletion instead of silently detaching history", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR UPDATE$/, rows: [BAN_SAO] }, { sql: /returned_at IS NULL/, rows: [] }, { sql: /FROM ChiTietPhieuMuon/, rows: [] }, { sql: /FROM LichSuSuDung .* FOR UPDATE$/, rows: [{ usage_id: "8" }] }]);
    await assert.rejects(taoMoHinhBanSaoSach(csdlKiemThu.pool).xoa("1"), { status: 409, code: "COPY_HAS_USAGE_HISTORY" });csdlKiemThu.xacNhanHetBuoc();
});

test("copy update cannot reassign book; safe updates retain SQL no-op semantics", async () => {
    let csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR UPDATE$/, rows: [BAN_SAO] }, { sql: /returned_at IS NULL/, rows: [] }]);
    await assert.rejects(taoMoHinhBanSaoSach(csdlKiemThu.pool).thayThe("1", kiemTraBanSaoSach({ ...NOI_DUNG_THAY_THE, book_id: "2" }, true)), { status: 409, code: "COPY_BOOK_IMMUTABLE" });csdlKiemThu.xacNhanHetBuoc();
    csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR UPDATE$/, rows: [BAN_SAO] }, { sql: /returned_at IS NULL/, rows: [] }, { sql: /^UPDATE BanSaoSach SET barcode = \?/, rows: { affectedRows: 0 } }, { sql: /FROM BanSaoSach/, rows: [BAN_SAO] }]);
    assert.equal((await taoMoHinhBanSaoSach(csdlKiemThu.pool).thayThe("1", kiemTraBanSaoSach(NOI_DUNG_THAY_THE, true))).copy_id, "1");assert.equal(csdlKiemThu.calls[3].params.at(-1), "1");csdlKiemThu.xacNhanHetBuoc();
});

test("copy delete only when no circulation/history, and FK race rolls back", async () => {
    for (const baoLoi of [false, true]) {
        const loi = Object.assign(new Error("FK race"), { code: "ER_ROW_IS_REFERENCED_2" });
        const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR UPDATE$/, rows: [BAN_SAO] }, { sql: /returned_at IS NULL/, rows: [] }, { sql: /FROM ChiTietPhieuMuon/, rows: [] }, { sql: /FROM LichSuSuDung/, rows: [] }, { sql: /^DELETE FROM BanSaoSach WHERE copy_id = \?$/, rows: { affectedRows: 1 }, ...(baoLoi ? { error: loi } : {}) }]);
        const dichVu = taoDichVuBanSaoSach(taoMoHinhBanSaoSach(csdlKiemThu.pool));
        if (baoLoi) await assert.rejects(dichVu.xoa("1"), { status: 409, code: "COPY_IN_USE" }); else await dichVu.xoa("1");
        assert.deepEqual(csdlKiemThu.calls.slice(-2), [baoLoi ? "rollback" : "commit", "release"]);csdlKiemThu.xacNhanHetBuoc();
    }
});

test("missing rows never trigger UPDATE/DELETE; nested nonexistent book does not query copies", async () => {
    for (const taoMoHinh of [taoMoHinhDanhMuc, taoMoHinhBanSaoSach]) for (const thaoTac of ["thayThe", "xoa"]) {
        const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FOR UPDATE$/, rows: [] }]);
        const ketQua = await taoMoHinh(csdlKiemThu.pool)[thaoTac]("1", {});assert.ok(!ketQua);csdlKiemThu.xacNhanHetBuoc();
    }
    let daGoi = false;
    const dichVu = taoDichVuBanSaoSach({ async sachTonTai() { return false; }, async lietKe() { daGoi = true; } });
    await assert.rejects(dichVu.lietKe({ book_id: "9" }, true), { status: 404, code: "BOOK_NOT_FOUND" });assert.equal(daGoi, false);
});

test("catalog lists use placeholder filters/search and safe numeric pagination", async () => {
    for (const taoMoHinh of [taoMoHinhDanhMuc, taoMoHinhBanSaoSach]) {
        const cacLanGoi = [];
        const boKetNoiMoPhong = {
            async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[{ total: "1" }]]; },
            async query(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); if (taoMoHinh === taoMoHinhBanSaoSach) assert.ok(!/\bnote\b/.test(cauSql)); return [[taoMoHinh === taoMoHinhDanhMuc ? DANH_MUC : BAN_SAO]]; },
        };
        const truyVan = { search: "%' OR 1=1 --_", limit: 5, offset: 10, book_id: "1", condition_status: "good", availability_status: "available" };
        const ketQua = await taoMoHinh(boKetNoiMoPhong).lietKe(truyVan);assert.equal(ketQua.total, 1);
        for (const lanGoi of cacLanGoi) { assert.ok(!lanGoi.sql.includes("OR 1=1")); assert.match(lanGoi.sql, /LIKE \? ESCAPE '='/); }
        assert.deepEqual(cacLanGoi[1].params.slice(-2), [5, 10]);
        if (taoMoHinh === taoMoHinhBanSaoSach) { assert.match(cacLanGoi[0].sql, /book_id = \? AND condition_status = \? AND availability_status = \?/);assert.deepEqual(cacLanGoi[0].params.slice(0, 3), ["1", "good", "available"]); }
    }
});

test("public copy detail does not SELECT internal note at all", async () => {
    const moHinh = taoMoHinhBanSaoSach({ async execute(cauSql, thamSo) {
        assert.ok(!/\bnote\b/.test(cauSql));assert.deepEqual(thamSo, ["1"]);
        const { note: ghiChu, ...dongCongKhai } = BAN_SAO;return [[dongCongKhai]];
    } });
    assert.ok(!Object.hasOwn(await moHinh.layTheoMa("1"), "note"));
});

test.after(async () => { await boKetNoi.end(); });
