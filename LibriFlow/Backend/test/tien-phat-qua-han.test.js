import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { dungUngDung } from "../src/app-factory.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";
import { taoMoHinhTienPhat } from "../src/models/tien-phat.model.js";
import { taoMoHinhQuaHan } from "../src/models/qua-han.model.js";
import { tinhTienPhat } from "../src/utils/quy-tac-tien-phat.js";
import { kiemTraTienPhat, kiemTraThanhToan } from "../src/utils/kiem-tra-tien-phat.js";

const THONG_TIN_PHIEU = { borrow_id: "1", status: "returned", due_date: "2026-11-01 00:00:00", borrow_date: "2026-10-01 00:00:00" };
const CHI_TIET = { borrow_detail_id: "11", borrow_id: "1", copy_id: "21", status: "returned", returned_at: "2026-11-02 00:00:01", condition_before: "good", condition_after: "good", late_seconds: "86401", valid_timeline: 1 };
const QUY_DINH = { fine_rule_id: "2", rule_type: "late", amount: "1.25", unit: "per_day", is_active: 1 };
const TIEN_PHAT = { fine_id: "5", borrow_detail_id: "11", fine_rule_id: "2", fine_type: "late", amount: "2.50", reason: null, assessed_at: "2026-11-03 00:00:00", payment_status: "unpaid", paid_at: null, borrow_id: "1", copy_id: "21", user_id: "30" };
const NOI_DUNG = { borrow_detail_id: "11", fine_rule_id: "2" };

async function voiUngDungKiemThu(cauHinhThayThe, congViec) {
    const khoa = randomBytes(48).toString("base64url"), dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const cacNguoiDungXacThuc = {
        admin: { user_id: "10", roles: ["admin"], permissions: ["fine_manage", "borrow_manage"] },
        librarian: { user_id: "20", roles: ["librarian"], permissions: ["fine_manage", "borrow_manage"] },
        reader: { user_id: "30", roles: ["reader"], permissions: ["book_view"] },
        fakeAdmin: { user_id: "40", roles: ["admin"], permissions: [] },
        fineOnly: { user_id: "50", roles: ["staff"], permissions: ["fine_manage"] },
        borrowOnly: { user_id: "60", roles: ["staff"], permissions: ["borrow_manage"] },
    };
    const trangThaiKiemThu = { queries: [], owners: [], writes: 0 };
    const cacBanGhi = [TIEN_PHAT, { ...TIEN_PHAT, fine_id: "6", user_id: "99" }];
    const moHinhTienPhat = {
        async lietKe(truyVan) { trangThaiKiemThu.queries.push(truyVan); const cacMuc = cacBanGhi.filter(r => truyVan.user_id === undefined || r.user_id === truyVan.user_id); return { items: cacMuc, total: cacMuc.length }; },
        async layTheoMa(ma, chuSoHuu) { trangThaiKiemThu.owners.push(chuSoHuu); return cacBanGhi.find(r => r.fine_id === ma && (chuSoHuu === null || chuSoHuu === r.user_id)) ?? null; },
        async taoMoi(duLieu) { trangThaiKiemThu.writes++; return { ...TIEN_PHAT, ...duLieu }; },
        async ghiNhanThanhToan(ma) { trangThaiKiemThu.writes++; return { ...TIEN_PHAT, fine_id: ma, payment_status: "paid", paid_at: "2026-11-07 00:00:00" }; },
    };
    const moHinhQuaHan = {
        async lietKe(truyVan) { trangThaiKiemThu.queries.push(truyVan); return { items: [], total: 0, as_of: "2026-11-07 00:00:00" }; },
        async layTheoPhieuMuon(ma, chuSoHuu) { trangThaiKiemThu.owners.push(chuSoHuu); return ma === "1" && (chuSoHuu === null || chuSoHuu === "30") ? { borrow_id: ma, is_overdue: false, details: [] } : null; },
    };
    const coSoDuLieu = { async query() { throw new Error("Unexpected database access"); } };
    const moHinhXacThuc = { async layNguoiDungXacThuc(ma) { const p = Object.values(cacNguoiDungXacThuc).find(p => p.user_id === ma); return p ? { ...p, status: "active" } : null; } };
    const mayChu = dungUngDung({ database: coSoDuLieu, tokens: dichVuToken, authModel: moHinhXacThuc, fineModel: moHinhTienPhat, overdueModel: moHinhQuaHan, ...cauHinhThayThe }).listen(0, "127.0.0.1");
    await once(mayChu, "listening");
    const guiYeuCau = async (duongDan, phuongThuc = "GET", duLieu, vaiTro) => {
        const phanHoi = await fetch(`http://127.0.0.1:${mayChu.address().port}${duongDan}`, { method: phuongThuc, headers: { ...(duLieu !== undefined ? { "Content-Type": "application/json" } : {}), ...(vaiTro ? { Authorization: `Bearer ${dichVuToken.phatHanhToken(cacNguoiDungXacThuc[vaiTro].user_id)}` } : {}) }, ...(duLieu !== undefined ? { body: JSON.stringify(duLieu) } : {}) });
        return { status: phanHoi.status, body: await phanHoi.json(), location: phanHoi.headers.get("location") };
    };
    try { await congViec(guiYeuCau, trangThaiKiemThu); } finally { mayChu.closeAllConnections(); await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
}

test("all fine/overdue endpoints require JWT", async () => {
    await voiUngDungKiemThu({}, async guiYeuCau => {
        for (const [duongDan, phuongThuc, duLieu] of [["/api/overdues", "GET"], ["/api/borrows/1/overdue", "GET"], ["/api/fines", "GET"], ["/api/fines/5", "GET"], ["/api/fines", "POST", NOI_DUNG], ["/api/fines/5/payment", "PATCH", { payment_status: "paid" }]]) assert.equal((await guiYeuCau(duongDan, phuongThuc, duLieu)).status, 401);
    });
});

test("only fine_manage grants writes; admin/librarian allowed, missing grant and reader fail closed", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        for (const vaiTro of ["reader", "fakeAdmin", "borrowOnly"]) {
            assert.equal((await guiYeuCau("/api/fines", "POST", NOI_DUNG, vaiTro)).status, 403);
            assert.equal((await guiYeuCau("/api/fines/5/payment", "PATCH", { payment_status: "paid" }, vaiTro)).status, 403);
        }
        assert.equal(trangThaiKiemThu.writes, 0);
        for (const vaiTro of ["admin", "librarian", "fineOnly"]) {
            const ketQua = await guiYeuCau("/api/fines", "POST", NOI_DUNG, vaiTro);
            assert.equal(ketQua.status, 201); assert.equal(ketQua.location, "/api/fines/5");
            assert.equal((await guiYeuCau("/api/fines/5/payment", "PATCH", { payment_status: "paid" }, vaiTro)).status, 200);
        }
    });
});

test("reader fines are scoped, other user IDs are hidden and filtering user_id is forbidden", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        const phanHoi = await guiYeuCau("/api/fines/?page=1&limit=2&payment_status=unpaid", "GET", undefined, "reader");
        assert.equal(phanHoi.status, 200); assert.equal(phanHoi.body.data.length, 1); assert.equal(phanHoi.body.pagination.total, 1); assert.equal(trangThaiKiemThu.queries[0].user_id, "30");
        assert.equal((await guiYeuCau("/api/fines/5", "GET", undefined, "reader")).status, 200); assert.equal(trangThaiKiemThu.owners.at(-1), "30");
        assert.equal((await guiYeuCau("/api/fines/6", "GET", undefined, "reader")).status, 404);
        assert.equal((await guiYeuCau("/api/fines?user_id=30", "GET", undefined, "reader")).status, 403);
        assert.equal((await guiYeuCau("/api/fines", "GET", undefined, "fakeAdmin")).status, 403);
        assert.equal((await guiYeuCau("/api/fines", "GET", undefined, "borrowOnly")).status, 403);
        assert.equal((await guiYeuCau("/api/fines", "GET", undefined, "admin")).body.data.length, 2);
    });
});

test("overdue scope uses borrow_manage or reader ownership, not fine_manage or role label", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        assert.equal((await guiYeuCau("/api/overdues?borrow_id=1", "GET", undefined, "reader")).status, 200); assert.equal(trangThaiKiemThu.queries[0].user_id, "30");
        assert.equal((await guiYeuCau("/api/borrows/1/overdue", "GET", undefined, "reader")).status, 200); assert.equal(trangThaiKiemThu.owners.at(-1), "30");
        assert.equal((await guiYeuCau("/api/borrows/2/overdue", "GET", undefined, "reader")).status, 404);
        assert.equal((await guiYeuCau("/api/overdues?user_id=99", "GET", undefined, "reader")).status, 403);
        for (const vaiTro of ["fakeAdmin", "fineOnly"]) assert.equal((await guiYeuCau("/api/overdues", "GET", undefined, vaiTro)).status, 403);
        assert.equal((await guiYeuCau("/api/overdues?user_id=99", "GET", undefined, "borrowOnly")).status, 200);
    });
});

test("fine validation accepts only server-priced fields and payment only unpaid-to-paid intent", () => {
    assert.deepEqual(kiemTraTienPhat(NOI_DUNG), { ...NOI_DUNG, reason: null });
    for (const duLieuSai of [{}, { ...NOI_DUNG, borrow_detail_id: "0" }, { ...NOI_DUNG, fine_rule_id: -1 }, { ...NOI_DUNG, amount: -1 }, { ...NOI_DUNG, amount: "10.00" }, { ...NOI_DUNG, fine_type: "late" }, { ...NOI_DUNG, user_id: "1" }, { ...NOI_DUNG, paid_at: "now" }, { ...NOI_DUNG, payment_status: "paid" }, { ...NOI_DUNG, reason: "x".repeat(256) }]) assert.throws(() => kiemTraTienPhat(duLieuSai), { status: 400 });
    assert.deepEqual(kiemTraThanhToan({ payment_status: "paid" }), { payment_status: "paid" });
    for (const duLieuSai of [{}, { payment_status: "unpaid" }, { payment_status: "waived" }, { payment_status: "paid", amount: 0 }, { payment_status: "paid", paid_at: "now" }]) assert.throws(() => kiemTraThanhToan(duLieuSai), { status: 400 });
});

test("HTTP rejects invalid body/query/ID before persistence and returns scoped 404", async () => {
    await voiUngDungKiemThu({}, async (guiYeuCau, trangThaiKiemThu) => {
        assert.equal((await guiYeuCau("/api/fines", "POST", { ...NOI_DUNG, amount: -1 }, "admin")).status, 400);
        assert.equal((await guiYeuCau("/api/fines/5/payment", "PATCH", { payment_status: "waived" }, "admin")).status, 400);
        for (const duongDan of ["/api/fines?limit=101", "/api/fines?fine_type=invalid", "/api/fines?payment_status=invalid", "/api/fines?search=x", "/api/fines?borrow_detail_id=0", "/api/fines/0", "/api/overdues?status=overdue", "/api/borrows/0/overdue", "/api/borrows/1/overdue?user_id=99"]) assert.equal((await guiYeuCau(duongDan, "GET", undefined, "admin")).status, 400);
        assert.equal((await guiYeuCau("/api/fines/999", "GET", undefined, "admin")).status, 404); assert.equal(trangThaiKiemThu.writes, 0);
    });
});

test("late per_day rounds positive seconds up to complete 24-hour units, using exact cents", () => {
    for (const [soGiay, mongDoi] of [["1", "1.25"], ["86400", "1.25"], ["86401", "2.50"], ["172800", "2.50"]]) assert.equal(tinhTienPhat(QUY_DINH, { ...CHI_TIET, late_seconds: soGiay }, THONG_TIN_PHIEU), mongDoi);
    assert.equal(tinhTienPhat({ ...QUY_DINH, amount: "0.10" }, { ...CHI_TIET, late_seconds: "172801" }, THONG_TIN_PHIEU), "0.30");
    assert.equal(tinhTienPhat({ ...QUY_DINH, unit: "fixed" }, CHI_TIET, THONG_TIN_PHIEU), "1.25");
    assert.equal(tinhTienPhat({ ...QUY_DINH, amount: "0.00" }, CHI_TIET, THONG_TIN_PHIEU), "0.00");
});

test("on-time and unreturned loans cannot create final late fines", () => {
    for (const soGiay of ["0", "-1", null, "bad"]) assert.throws(() => tinhTienPhat(QUY_DINH, { ...CHI_TIET, late_seconds: soGiay }, THONG_TIN_PHIEU), { status: 409, code: "NOT_LATE" });
    for (const daThayDoi of [{ ...CHI_TIET, status: "borrowed", returned_at: null }, { ...CHI_TIET, returned_at: null }, { ...CHI_TIET, status: "lost" }]) assert.throws(() => tinhTienPhat(QUY_DINH, daThayDoi, THONG_TIN_PHIEU), { code: "FINE_REQUIRES_RETURN" });
    for (const trangThai of ["borrowed", "overdue", "cancelled"]) assert.throws(() => tinhTienPhat(QUY_DINH, CHI_TIET, { ...THONG_TIN_PHIEU, status: trangThai }), { code: "FINE_REQUIRES_RETURN" });
});

test("damage requires fixed active configuration and confirmed good-to-damaged return", () => {
    const phatHong = { ...QUY_DINH, rule_type: "damage", unit: "fixed", amount: "50.05" };
    assert.equal(tinhTienPhat(phatHong, { ...CHI_TIET, condition_after: "damaged" }, { ...THONG_TIN_PHIEU, status: "partially_returned" }), "50.05");
    for (const daThayDoi of [CHI_TIET, { ...CHI_TIET, condition_before: "damaged", condition_after: "damaged" }]) assert.throws(() => tinhTienPhat(phatHong, daThayDoi, THONG_TIN_PHIEU), { code: "DAMAGE_NOT_CONFIRMED" });
    assert.throws(() => tinhTienPhat({ ...phatHong, unit: "per_day" }, CHI_TIET, THONG_TIN_PHIEU), { code: "FINE_RULE_UNSUPPORTED" });
});

test("inactive/unsupported rules, invalid timeline and negative/overflow amounts fail closed", () => {
    assert.throws(() => tinhTienPhat({ ...QUY_DINH, is_active: 0 }, CHI_TIET, THONG_TIN_PHIEU), { code: "FINE_RULE_INACTIVE" });
    for (const kieu of ["lost", "other"]) assert.throws(() => tinhTienPhat({ ...QUY_DINH, rule_type: kieu }, CHI_TIET, THONG_TIN_PHIEU), { code: "FINE_RULE_UNSUPPORTED" });
    assert.throws(() => tinhTienPhat(QUY_DINH, { ...CHI_TIET, valid_timeline: 0 }, THONG_TIN_PHIEU), { code: "FINE_STATE_CONFLICT" });
    for (const soTien of ["-1.00", "1.234", "10000000000.00", "NaN"]) assert.throws(() => tinhTienPhat({ ...QUY_DINH, amount: soTien }, CHI_TIET, THONG_TIN_PHIEU), { code: "INVALID_FINE_RULE_AMOUNT" });
    assert.throws(() => tinhTienPhat({ ...QUY_DINH, amount: "9999999999.99" }, CHI_TIET, THONG_TIN_PHIEU), { code: "FINE_AMOUNT_OUT_OF_RANGE" });
    assert.equal(tinhTienPhat({ ...QUY_DINH, amount: "9999999999.99", unit: "fixed" }, CHI_TIET, THONG_TIN_PHIEU), "9999999999.99");
});

function taoCoSoDuLieuMoPhong(cacBuoc) {
    const cacLanGoi = [];
    const ketNoi = {
        async beginTransaction() { cacLanGoi.push("begin"); }, async commit() { cacLanGoi.push("commit"); }, async rollback() { cacLanGoi.push("rollback"); }, release() { cacLanGoi.push("release"); },
        async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); const next = cacBuoc.shift(); assert.ok(next, "Unexpected SQL"); assert.match(cauSql, next.sql); if (next.params) assert.deepEqual(thamSo, next.params); if (next.error) throw next.error; return [next.rows]; },
    };
    return { calls: cacLanGoi, model: taoMoHinhTienPhat({ async getConnection() { return ketNoi; } }), xacNhanHetBuoc() { assert.equal(cacBuoc.length, 0); } };
}
function taoCacBuocThem(cacThayDoi = {}) {
    return [
        { sql: /^SELECT borrow_id FROM ChiTietPhieuMuon/, rows: [{ borrow_id: "1" }] },
        { sql: /FROM PhieuMuon .*FOR SHARE$/, rows: [THONG_TIN_PHIEU] },
        { sql: /FROM ChiTietPhieuMuon .*FOR UPDATE$/, rows: [{ ...CHI_TIET, ...cacThayDoi }] },
        { sql: /FROM QuyDinhPhat .*FOR SHARE$/, rows: [QUY_DINH] },
        { sql: /FROM Phat .*FOR UPDATE$/, rows: [] },
        { sql: /^INSERT INTO Phat/, rows: { insertId: "5" }, params: ["11", "2", "late", "2.50", null] },
        { sql: /FROM Phat f JOIN ChiTietPhieuMuon/, rows: [TIEN_PHAT] },
    ];
}

test("fine create locks parent/detail/rule, uses calculated string amount and commits only Phat", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong(taoCacBuocThem()); const ketQua = await csdlKiemThu.model.taoMoi(kiemTraTienPhat(NOI_DUNG));
    assert.equal(ketQua.amount, "2.50"); assert.equal(ketQua.fine_id, "5"); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["commit", "release"]);
    const soLanGhi = csdlKiemThu.calls.filter(c => c.sql && /^(INSERT|UPDATE|DELETE)/.test(c.sql)); assert.equal(soLanGhi.length, 1); assert.match(soLanGhi[0].sql, /^INSERT INTO Phat/);
    csdlKiemThu.xacNhanHetBuoc();
});

test("missing detail/header/rule stops creation with 404 and rollback", async () => {
    for (const chiSo of [0, 1, 3]) {
        const cacBuoc = taoCacBuocThem(); cacBuoc[chiSo].rows = []; cacBuoc.splice(chiSo + 1); const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
        await assert.rejects(csdlKiemThu.model.taoMoi(kiemTraTienPhat(NOI_DUNG)), { status: 404 }); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]); csdlKiemThu.xacNhanHetBuoc();
    }
});

test("duplicate fine blocks another rule or any paid/waived prior record of the same type", async () => {
    const cacBuoc = taoCacBuocThem(); cacBuoc[4].rows = [{ fine_id: "9" }]; cacBuoc.splice(5); const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
    await assert.rejects(csdlKiemThu.model.taoMoi(kiemTraTienPhat(NOI_DUNG)), { status: 409, code: "DUPLICATE_FINE" });
    const truyVanKiemTraTrung = csdlKiemThu.calls.find(c => c.sql && /FROM Phat WHERE/.test(c.sql)); assert.deepEqual(truyVanKiemTraTrung.params, ["11", "late"]); assert.ok(!truyVanKiemTraTrung.sql.includes("payment_status"));
    assert.ok(!csdlKiemThu.calls.some(c => c.sql?.startsWith("INSERT"))); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]); csdlKiemThu.xacNhanHetBuoc();
});

test("moved detail, inactive rule and unsupported lost configuration abort before INSERT", async () => {
    for (const kichBan of ["moved", "inactive", "lost"]) {
        const cacBuoc = taoCacBuocThem();
        if (kichBan === "moved") { cacBuoc[2].rows[0].borrow_id = "99"; cacBuoc.splice(3); }
        else { cacBuoc[3].rows = [{ ...QUY_DINH, ...(kichBan === "lost" ? { rule_type: "lost" } : { is_active: 0 }) }]; cacBuoc.splice(4); }
        const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc); await assert.rejects(csdlKiemThu.model.taoMoi(kiemTraTienPhat(NOI_DUNG)), { status: 409 }); assert.ok(!csdlKiemThu.calls.includes("commit")); csdlKiemThu.xacNhanHetBuoc();
    }
});

test("fine INSERT or subsequent read failure rolls back and never commits", async () => {
    for (const chiSo of [5, 6]) {
        const cacBuoc = taoCacBuocThem(); cacBuoc[chiSo].error = Object.assign(new Error("Private SQL data"), { code: "ER_LOCK_DEADLOCK" }); cacBuoc.splice(chiSo + 1);
        const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc); await assert.rejects(csdlKiemThu.model.taoMoi(kiemTraTienPhat(NOI_DUNG)), { code: "ER_LOCK_DEADLOCK" }); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]); assert.ok(!csdlKiemThu.calls.includes("commit")); csdlKiemThu.xacNhanHetBuoc();
    }
});

test("payment locks fine, timestamps server-side and leaves loan history untouched", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM Phat .*FOR UPDATE$/, rows: [TIEN_PHAT] }, { sql: /^UPDATE Phat SET payment_status = 'paid', paid_at = UTC_TIMESTAMP\(\)/, params: ["5"], rows: { affectedRows: 1 } }, { sql: /FROM Phat f JOIN/, rows: [{ ...TIEN_PHAT, payment_status: "paid", paid_at: "2026-11-07 00:00:00" }] }]);
    const ketQua = await csdlKiemThu.model.ghiNhanThanhToan("5"); assert.equal(ketQua.payment_status, "paid"); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["commit", "release"]); csdlKiemThu.xacNhanHetBuoc();
});

test("missing, repeated, waived or inconsistent payment cannot be recorded again", async () => {
    for (const dongDuLieu of [null, { ...TIEN_PHAT, payment_status: "paid" }, { ...TIEN_PHAT, payment_status: "waived" }, { ...TIEN_PHAT, paid_at: "2026-11-07 00:00:00" }]) {
        const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM Phat .*FOR UPDATE$/, rows: dongDuLieu ? [dongDuLieu] : [] }]);
        await assert.rejects(csdlKiemThu.model.ghiNhanThanhToan("5"), { status: dongDuLieu ? 409 : 404 }); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]); csdlKiemThu.xacNhanHetBuoc();
    }
});

test("payment write failure rolls back", async () => {
    const csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM Phat .*FOR UPDATE$/, rows: [TIEN_PHAT] }, { sql: /^UPDATE Phat/, error: new Error("private") }]);
    await assert.rejects(csdlKiemThu.model.ghiNhanThanhToan("5")); assert.ok(!csdlKiemThu.calls.includes("commit")); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]); csdlKiemThu.xacNhanHetBuoc();
});

test("fine HTTP propagates missing configuration, duplicate and repeated payment without SQL leaks", async () => {
    let cacBuoc = taoCacBuocThem(); cacBuoc[3].rows = []; cacBuoc.splice(4); let csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
    await voiUngDungKiemThu({ fineModel: csdlKiemThu.model }, async guiYeuCau => { const phanHoi = await guiYeuCau("/api/fines", "POST", NOI_DUNG, "admin"); assert.equal(phanHoi.status, 404); assert.equal(phanHoi.body.error.code, "FINE_RULE_NOT_FOUND"); }); csdlKiemThu.xacNhanHetBuoc();
    cacBuoc = taoCacBuocThem(); cacBuoc[4].rows = [{ fine_id: "5" }]; cacBuoc.splice(5); csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
    await voiUngDungKiemThu({ fineModel: csdlKiemThu.model }, async guiYeuCau => assert.equal((await guiYeuCau("/api/fines", "POST", NOI_DUNG, "librarian")).status, 409)); csdlKiemThu.xacNhanHetBuoc();
    csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /FROM Phat .*FOR UPDATE$/, rows: [{ ...TIEN_PHAT, payment_status: "paid" }] }]);
    await voiUngDungKiemThu({ fineModel: csdlKiemThu.model }, async guiYeuCau => assert.equal((await guiYeuCau("/api/fines/5/payment", "PATCH", { payment_status: "paid" }, "admin")).status, 409)); csdlKiemThu.xacNhanHetBuoc();
    csdlKiemThu = taoCoSoDuLieuMoPhong([{ sql: /SELECT borrow_id/, error: Object.assign(new Error("Private SQL data"), { code: "ER_LOCK_DEADLOCK" }) }]);
    await voiUngDungKiemThu({ fineModel: csdlKiemThu.model }, async guiYeuCau => { const phanHoi = await guiYeuCau("/api/fines", "POST", NOI_DUNG, "admin"); assert.equal(phanHoi.status, 503); assert.ok(!JSON.stringify(phanHoi.body).includes("Private")); }); csdlKiemThu.xacNhanHetBuoc();
});

test("SQL scopes fine COUNT/list/detail by JWT owner before returning rows, preserving nullable rule", async () => {
    const cacLanGoi = [], boKetNoi = {
        async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return cauSql.includes("COUNT(*)") ? [[{ total: "0" }]] : [[{ ...TIEN_PHAT, fine_rule_id: null }]]; },
        async query(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[]]; },
    };
    const moHinh = taoMoHinhTienPhat(boKetNoi); await moHinh.lietKe({ user_id: "30", fine_type: "late", payment_status: "unpaid", limit: 5, offset: 0 });
    assert.equal((await moHinh.layTheoMa("5", "30")).fine_rule_id, null);
    for (const c of cacLanGoi) { assert.match(c.sql, /p.user_id = \?/); assert.ok(c.params.includes("30")); assert.ok(!/password|email|phone/.test(c.sql)); }
});

const DONG_QUA_HAN = { borrow_id: "1", due_date: "2026-11-01 00:00:00", status: "borrowed", borrow_detail_id: "11", copy_id: "21", detail_status: "borrowed", returned_at: null, days_overdue: "2", past_due: 1 };
async function taoTomTatQuaHan(cacDong, chuSoHuu = "30") {
    const cacLanGoi = [];
    const moHinh = taoMoHinhQuaHan({ async query(cauSql) { assert.match(cauSql, /^SELECT/); return [[{ as_of: "2026-11-03 00:00:01" }]]; }, async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); assert.match(cauSql, /^SELECT/); return [cacDong]; } });
    return { result: await moHinh.layTheoPhieuMuon("1", chuSoHuu), calls: cacLanGoi };
}

test("overdue summary does not trust stored overdue status when due date is in the future", async () => {
    for (const trangThai of ["borrowed", "overdue"]) { const { result: ketQua } = await taoTomTatQuaHan([{ ...DONG_QUA_HAN, status: trangThai, past_due: 0 }]); assert.equal(ketQua.is_overdue, false); assert.equal(ketQua.overdue_count, 0); }
});

test("past-due unreturned borrowed detail is overdue without any database UPDATE", async () => {
    const { result: ketQua, calls: cacLanGoi } = await taoTomTatQuaHan([DONG_QUA_HAN]); assert.equal(ketQua.is_overdue, true); assert.equal(ketQua.details[0].days_overdue, 2);
    assert.match(cacLanGoi[0].sql, /p.user_id = \?/); assert.deepEqual(cacLanGoi[0].params, ["2026-11-03 00:00:01", "2026-11-03 00:00:01", "1", "30"]);
});

test("fully returned/cancelled or empty loan is not currently overdue even if originally late", async () => {
    for (const daThayDoi of [{ status: "returned" }, { status: "cancelled" }, { detail_status: "returned", returned_at: "2026-11-02 00:00:00" }, { borrow_detail_id: null }, { detail_status: "lost" }]) assert.equal((await taoTomTatQuaHan([{ ...DONG_QUA_HAN, ...daThayDoi }])).result.is_overdue, false);
    assert.equal((await taoTomTatQuaHan([])).result, null);
});

test("partially returned loan reports only remaining borrowed, unreturned details", async () => {
    const { result: ketQua } = await taoTomTatQuaHan([{ ...DONG_QUA_HAN, status: "partially_returned" }, { ...DONG_QUA_HAN, status: "partially_returned", borrow_detail_id: "12", copy_id: "22", detail_status: "returned", returned_at: "2026-11-02 00:00:00" }]);
    assert.equal(ketQua.overdue_count, 1); assert.deepEqual(ketQua.details.map(d => d.copy_id), ["21"]);
});

test("overdue list filters deadline/open states in SQL, scopes both count and page and freezes clock", async () => {
    const cacLanGoi = [], thoiDiemTinh = "2026-11-03 00:00:01";
    const moHinh = taoMoHinhQuaHan({
        async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[{ total: "1" }]]; },
        async query(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return cauSql.includes("UTC_TIMESTAMP") ? [[{ as_of: thoiDiemTinh }]] : [[{ ...DONG_QUA_HAN, user_id: "30" }]]; },
    });
    const ketQua = await moHinh.lietKe({ user_id: "30", borrow_id: "1", limit: 5, offset: 0 }); assert.equal(ketQua.total, 1); assert.equal(ketQua.as_of, thoiDiemTinh);
    for (const c of cacLanGoi.slice(1)) { assert.match(c.sql, /d.status = 'borrowed' AND d.returned_at IS NULL AND p.due_date < \?/); assert.match(c.sql, /p.user_id = \?/); assert.ok(c.params.includes("30")); assert.ok(c.params.includes(thoiDiemTinh)); }
    assert.deepEqual(cacLanGoi.at(-1).params, [thoiDiemTinh, thoiDiemTinh, "30", "1", 5, 0]); assert.ok(cacLanGoi.every(c => c.sql.startsWith("SELECT")));
});

test("simulated simultaneous fine creation on one detail permits one assessment only", async () => {
    let hangDoi = Promise.resolve(), tonTai = false, soLanCommit = 0;
    const boKetNoi = { async getConnection() {
        let moKhoa, dangCho = false;
        return {
            async beginTransaction() {},
            async execute(cauSql) {
                if (cauSql.startsWith("SELECT borrow_id FROM ChiTietPhieuMuon")) return [[{ borrow_id: "1" }]];
                if (cauSql.includes("FROM PhieuMuon WHERE")) return [[THONG_TIN_PHIEU]];
                if (cauSql.includes("FROM ChiTietPhieuMuon WHERE")) { const truocDo = hangDoi; hangDoi = new Promise(hoanThanh => { moKhoa = hoanThanh; }); await truocDo; return [[CHI_TIET]]; }
                if (cauSql.includes("FROM QuyDinhPhat")) return [[QUY_DINH]];
                if (cauSql.includes("FROM Phat WHERE")) return [tonTai ? [{ fine_id: "5" }] : []];
                if (cauSql.startsWith("INSERT INTO Phat")) { dangCho = true; return [{ insertId: "5" }]; }
                if (cauSql.includes("FROM Phat f JOIN")) return [[TIEN_PHAT]];
                throw new Error("Unexpected SQL");
            },
            async commit() { if (dangCho) { tonTai = true; soLanCommit++; } moKhoa?.(); }, async rollback() { moKhoa?.(); }, release() {},
        };
    } };
    const moHinh = taoMoHinhTienPhat(boKetNoi), ketQua = await Promise.allSettled([moHinh.taoMoi(kiemTraTienPhat(NOI_DUNG)), moHinh.taoMoi(kiemTraTienPhat(NOI_DUNG))]);
    assert.equal(ketQua.filter(r => r.status === "fulfilled").length, 1); assert.equal(soLanCommit, 1); assert.equal(ketQua.find(r => r.status === "rejected").reason.code, "DUPLICATE_FINE");
});

test("fine foreign key race rolls back and returns resource-specific safe 400", async () => {
    const cacBuoc = taoCacBuocThem(); cacBuoc[5].error = Object.assign(new Error("Private FK statement"), { code: "ER_NO_REFERENCED_ROW_2" }); cacBuoc.splice(6);
    const csdlKiemThu = taoCoSoDuLieuMoPhong(cacBuoc);
    await voiUngDungKiemThu({ fineModel: csdlKiemThu.model }, async guiYeuCau => {
        const phanHoi = await guiYeuCau("/api/fines", "POST", NOI_DUNG, "admin"); assert.equal(phanHoi.status, 400); assert.equal(phanHoi.body.error.code, "INVALID_FINE_REFERENCE"); assert.ok(!JSON.stringify(phanHoi.body).includes("Private"));
    });
    assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]); csdlKiemThu.xacNhanHetBuoc();
});

test("simulated simultaneous payment records paid_at only once", async () => {
    let hangDoi = Promise.resolve(), daThanhToan = false, soLanCommit = 0;
    const moHinh = taoMoHinhTienPhat({ async getConnection() {
        let moKhoa, dangCho = false;
        return {
            async beginTransaction() {},
            async execute(cauSql) {
                if (cauSql.includes("FROM Phat WHERE")) { const truocDo = hangDoi; hangDoi = new Promise(hoanThanh => { moKhoa = hoanThanh; }); await truocDo; return [[{ ...TIEN_PHAT, payment_status: daThanhToan ? "paid" : "unpaid" }]]; }
                if (cauSql.startsWith("UPDATE Phat")) { dangCho = true; return [{ affectedRows: 1 }]; }
                if (cauSql.includes("FROM Phat f JOIN")) return [[{ ...TIEN_PHAT, payment_status: "paid" }]];
                throw new Error("Unexpected SQL");
            },
            async commit() { if (dangCho) { daThanhToan = true; soLanCommit++; } moKhoa?.(); }, async rollback() { moKhoa?.(); }, release() {},
        };
    } });
    const cacKetQua = await Promise.allSettled([moHinh.ghiNhanThanhToan("5"), moHinh.ghiNhanThanhToan("5")]); assert.equal(cacKetQua.filter(r => r.status === "fulfilled").length, 1); assert.equal(soLanCommit, 1); assert.equal(cacKetQua.find(r => r.status === "rejected").reason.code, "FINE_NOT_PAYABLE");
});
