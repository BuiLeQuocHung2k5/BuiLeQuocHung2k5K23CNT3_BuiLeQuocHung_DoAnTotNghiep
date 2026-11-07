import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { dungUngDung } from "../src/app-factory.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";
import { taoKhoangNgay, kiemTraTruyVanLichSu, kiemTraTruyVanThongKe, kiemTraSuKienSuDung } from "../src/utils/kiem-tra-thong-ke.js";
import { taoDichVuLichSuSuDung } from "../src/services/lich-su-su-dung.service.js";
import { taoMoHinhLichSuSuDung } from "../src/models/lich-su-su-dung.model.js";
import { taoMoHinhThongKe } from "../src/models/thong-ke.model.js";
import { taoDichVuXacThuc } from "../src/services/xac-thuc.service.js";
import { taoMoHinhXacThuc } from "../src/models/xac-thuc.model.js";
import { taoMoHinhPhieuMuon } from "../src/models/phieu-muon.model.js";

const KY_THONG_KE = { start_date: "2026-11-01", end_date: "2026-11-03" };
const khoangNgay = taoKhoangNgay(KY_THONG_KE), CHUOI_TRUY_VAN = "start_date=2026-11-01&end_date=2026-11-03";

async function voiUngDungKiemThu(congViec, cauHinhThayThe = {}) {
    const khoa = randomBytes(48).toString("base64url"), dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const cacNguoiDungXacThuc = {
        admin: { user_id: "10", roles: ["admin"], permissions: ["report_view"] },
        librarian: { user_id: "20", roles: ["librarian"], permissions: ["report_view"] },
        reader: { user_id: "30", roles: ["reader"], permissions: ["book_view"] },
        otherReader: { user_id: "31", roles: ["reader"], permissions: ["book_view"] },
        fakeAdmin: { user_id: "40", roles: ["admin"], permissions: [] },
        forecastOnly: { user_id: "50", roles: ["staff"], permissions: ["forecast_view"] },
    };
    const cacBanGhi = [{ usage_id: "1", user_id: "30", copy_id: null, action_type: "login", action_date: "2026-11-01 00:00:00" }, { usage_id: "2", user_id: "31", copy_id: "1", action_type: "borrow", action_date: "2026-11-01 01:00:00" }, { usage_id: "3", user_id: "10", copy_id: null, action_type: "login", action_date: "2026-11-01 02:00:00" }];
    const trangThaiKiemThu = { queries: [], calls: 0 };
    const moHinhLichSuSuDung = { async lietKe(truyVan) { trangThaiKiemThu.queries.push(truyVan); const cacDong = cacBanGhi.filter(r => truyVan.user_id === undefined || r.user_id === truyVan.user_id).filter(r => truyVan.action_type === undefined || r.action_type === truyVan.action_type); return { items: cacDong.slice(truyVan.offset, truyVan.offset + truyVan.limit), total: cacDong.length }; } };
    const moHinhThongKe = {
        async layTongQuan(truyVan) { trangThaiKiemThu.calls++; trangThaiKiemThu.queries.push(truyVan); return { books_total: 2, copies_total: 3, users_total: 2, borrows_total: 2, borrows_in_period: 2, borrowed_copies_in_period: 3, returned_copies_in_period: 1 }; },
        async thongKePhieuMuon(truyVan) { trangThaiKiemThu.calls++; trangThaiKiemThu.queries.push(truyVan); return [{ period_start: "2026-11-01", borrow_count: 2, borrowed_copy_count: 3 }]; },
        async thongKeNguoiDung(truyVan) { trangThaiKiemThu.calls++; trangThaiKiemThu.queries.push(truyVan); return { items: [{ user_id: "30", borrow_count: 2, active_days: 1, usage_event_count: 4, login_count: 1, borrow_copy_events: 2, return_copy_events: 1 }], total: 1 }; },
    };
    const coSoDuLieu = { async query() { throw new Error("Unexpected default database access"); } };
    const moHinhXacThuc = { async layNguoiDungXacThuc(ma) { const nguoiDungXacThuc = Object.values(cacNguoiDungXacThuc).find(p => p.user_id === ma); return nguoiDungXacThuc ? { ...nguoiDungXacThuc, status: "active" } : null; } };
    const mayChu = dungUngDung({ database: coSoDuLieu, tokens: dichVuToken, authModel: moHinhXacThuc, usageHistoryModel: moHinhLichSuSuDung, statisticsModel: moHinhThongKe, ...cauHinhThayThe }).listen(0, "127.0.0.1");
    await once(mayChu, "listening");
    const guiYeuCau = async (duongDan, vaiTro, phuongThuc = "GET") => {
        const phanHoi = await fetch(`http://127.0.0.1:${mayChu.address().port}${duongDan}`, { method: phuongThuc, headers: vaiTro ? { Authorization: `Bearer ${dichVuToken.phatHanhToken(cacNguoiDungXacThuc[vaiTro].user_id)}` } : {} });
        return { status: phanHoi.status, body: await phanHoi.json(), cache: phanHoi.headers.get("cache-control") };
    };
    try { await congViec(guiYeuCau, trangThaiKiemThu); } finally { mayChu.closeAllConnections(); await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
}

test("usage and all administrative statistics endpoints require JWT", async () => {
    await voiUngDungKiemThu(async guiYeuCau => {
        for (const duongDan of ["/api/usage-history", "/api/usage-history/me", "/api/statistics/overview", "/api/statistics/borrows", "/api/statistics/users"]) assert.equal((await guiYeuCau(duongDan)).status, 401);
    });
});

test("reader history is SQL-scoped through service query; paging and event filter work", async () => {
    await voiUngDungKiemThu(async (guiYeuCau, trangThaiKiemThu) => {
        const phanHoi = await guiYeuCau(`/api/usage-history/?${CHUOI_TRUY_VAN}&page=1&limit=1&action_type=login`, "reader");
        assert.equal(phanHoi.status, 200); assert.equal(phanHoi.body.data.length, 1); assert.equal(phanHoi.body.data[0].user_id, "30"); assert.equal(phanHoi.body.pagination.total, 1); assert.equal(trangThaiKiemThu.queries[0].user_id, "30"); assert.equal(phanHoi.cache, "no-store");
        assert.equal((await guiYeuCau(`/api/usage-history?${CHUOI_TRUY_VAN}&user_id=31`, "reader")).status, 403);
        assert.equal((await guiYeuCau(`/api/usage-history?${CHUOI_TRUY_VAN}&user_id=30`, "reader")).status, 403);
    });
});

test("report_view allows whole history; me always means JWT owner even for administrators", async () => {
    await voiUngDungKiemThu(async (guiYeuCau, trangThaiKiemThu) => {
        for (const vaiTro of ["admin", "librarian"]) assert.equal((await guiYeuCau(`/api/usage-history?${CHUOI_TRUY_VAN}`, vaiTro)).body.data.length, 3);
        const duLieuCuaToi = await guiYeuCau(`/api/usage-history/me?${CHUOI_TRUY_VAN}`, "admin"); assert.deepEqual(duLieuCuaToi.body.data.map(r => r.user_id), ["10"]); assert.equal(trangThaiKiemThu.queries.at(-1).user_id, "10");
        assert.equal((await guiYeuCau(`/api/usage-history/me?${CHUOI_TRUY_VAN}&user_id=31`, "admin")).status, 403);
        assert.equal((await guiYeuCau(`/api/usage-history?${CHUOI_TRUY_VAN}&user_id=31`, "librarian")).body.data[0].user_id, "31");
        assert.equal((await guiYeuCau(`/api/usage-history/me?${CHUOI_TRUY_VAN}`, "forecastOnly")).status, 200);
        for (const vaiTro of ["fakeAdmin", "forecastOnly"]) assert.equal((await guiYeuCau("/api/usage-history", vaiTro)).status, 403);
    });
});

test("administrative statistics require exact report_view, fail closed with role label/forecast_view", async () => {
    await voiUngDungKiemThu(async (guiYeuCau, trangThaiKiemThu) => {
        for (const duongDanApi of ["overview", "borrows", "users"]) {
            for (const vaiTro of ["reader", "fakeAdmin", "forecastOnly"]) assert.equal((await guiYeuCau(`/api/statistics/${duongDanApi}`, vaiTro)).status, 403);
            assert.equal(trangThaiKiemThu.calls, 0);
        }
        for (const vaiTro of ["admin", "librarian"]) for (const duongDanApi of ["overview", "borrows", "users"]) {
            const phanHoi = await guiYeuCau(`/api/statistics/${duongDanApi}?${CHUOI_TRUY_VAN}`, vaiTro); assert.equal(phanHoi.status, 200); assert.equal(phanHoi.cache, "no-store");
        }
    });
});

test("statistics HTTP returns known mock totals and paginated activity without private profile fields", async () => {
    await voiUngDungKiemThu(async guiYeuCau => {
        const thongKeTongQuan = await guiYeuCau(`/api/statistics/overview?${CHUOI_TRUY_VAN}`, "admin"); assert.equal(thongKeTongQuan.body.data.borrows_in_period, 2); assert.equal(thongKeTongQuan.body.data.borrowed_copies_in_period, 3);
        const cacPhieuMuon = await guiYeuCau(`/api/statistics/borrows?${CHUOI_TRUY_VAN}&group_by=week&user_id=30`, "librarian"); assert.equal(cacPhieuMuon.body.period.group_by, "week"); assert.equal(cacPhieuMuon.body.data[0].borrow_count, 2);
        const cacNguoiDung = await guiYeuCau(`/api/statistics/users?${CHUOI_TRUY_VAN}&page=1&limit=10`, "admin"); assert.equal(cacNguoiDung.body.pagination.total, 1); assert.equal(cacNguoiDung.body.data[0].active_days, 1); assert.ok(!/email|password|phone|avatar/.test(JSON.stringify(cacNguoiDung.body)));
    });
});

test("bad dates, unbounded ranges, unknown fields and invalid pagination are 400 before model reads", async () => {
    await voiUngDungKiemThu(async (guiYeuCau, trangThaiKiemThu) => {
        for (const duongDan of ["/api/statistics/overview?start_date=2026-02-30", "/api/statistics/overview?start_date=2025-01-01&end_date=2026-11-01", "/api/statistics/overview?user_id=30", "/api/statistics/borrows?group_by=year", "/api/statistics/borrows?user_id=0", "/api/statistics/users?limit=101", "/api/statistics/users?page=0", "/api/usage-history?action_type=visit", "/api/usage-history?search=x", "/api/usage-history?limit=0", "/api/usage-history?start_date=2026-11-02&end_date=2026-11-01"]) assert.equal((await guiYeuCau(duongDan, "admin")).status, 400);
        assert.equal(trangThaiKiemThu.queries.length, 0);
    });
});

test("new APIs are read-only and empty pages return zero totals", async () => {
    await voiUngDungKiemThu(async guiYeuCau => {
        const phanHoi = await guiYeuCau(`/api/usage-history/me?${CHUOI_TRUY_VAN}&page=3&limit=1`, "reader"); assert.deepEqual(phanHoi.body.data, []); assert.equal(phanHoi.body.pagination.total, 1);
        assert.equal((await guiYeuCau("/api/usage-history", "admin", "POST")).status, 404);
        assert.equal((await guiYeuCau("/api/statistics/overview", "admin", "POST")).status, 404);
    });
    await voiUngDungKiemThu(async guiYeuCau => {
        const lichSuSuDung = await guiYeuCau(`/api/usage-history/me?${CHUOI_TRUY_VAN}`, "reader"), cacNguoiDung = await guiYeuCau(`/api/statistics/users?${CHUOI_TRUY_VAN}`, "admin");
        assert.deepEqual(lichSuSuDung.body.data, []); assert.equal(lichSuSuDung.body.pagination.total, 0); assert.equal(cacNguoiDung.body.pagination.totalPages, 0);
    }, { usageHistoryModel: { async lietKe() { return { items: [], total: 0 }; } }, statisticsModel: { async thongKeNguoiDung() { return { items: [], total: 0 }; } } });
});

test("UTC range uses inclusive calendar dates, exclusive SQL upper bound, leap days and bounded defaults", () => {
    assert.equal(khoangNgay.from, "2026-11-01 00:00:00"); assert.equal(khoangNgay.until, "2026-11-04 00:00:00"); assert.equal(khoangNgay.days, 3);
    assert.equal(taoKhoangNgay({ start_date: "2024-02-29", end_date: "2024-02-29" }).days, 1);
    assert.equal(taoKhoangNgay({}, Date.parse("2026-11-07T01:00:00Z")).start_date, "2026-10-09");
    assert.equal(taoKhoangNgay({ start_date: "2024-01-01", end_date: "2024-12-31" }).days, 366);
    for (const duLieuSai of [{ start_date: "2024-01-01", end_date: "2025-01-01" }, { start_date: "2026-02-29" }, { end_date: "2026-11-07T00:00:00Z" }, { end_date: ["2026-11-07"] }, { end_date: "9999-12-31" }]) assert.throws(() => taoKhoangNgay(duLieuSai), { status: 400 });
    assert.equal(kiemTraTruyVanThongKe({ ...KY_THONG_KE, group_by: "month" }, "borrows").group_by, "month");
    assert.throws(() => kiemTraTruyVanLichSu({ ...KY_THONG_KE, page: "9007199254740991", limit: "100" }, "30"), { status: 400 });
});

test("usage service only accepts safe structured internal events and never arbitrary JSON/secrets", async () => {
    const duLieuNhan = [], ketNoi = {};
    const dichVu = taoDichVuLichSuSuDung({ async ghiNhan(suKien, ketNoiMoPhong) { duLieuNhan.push({ event: suKien, conn: ketNoiMoPhong }); } });
    await dichVu.ghiNhan({ user_id: "30", action_type: "login" });
    await dichVu.ghiNhan({ user_id: "30", copy_id: "21", borrow_id: "1", action_type: "borrow" }, ketNoi);
    assert.equal(duLieuNhan[0].event.copy_id, null); assert.deepEqual(JSON.parse(duLieuNhan[1].event.details), { source: "libriflow-api", version: 1, borrow_id: "1" }); assert.equal(duLieuNhan[1].conn, ketNoi);
    for (const suKien of [{ user_id: "0", action_type: "login" }, { user_id: "30", action_type: "visit" }, { user_id: "30", action_type: "login", copy_id: "21" }, { user_id: "30", action_type: "return", copy_id: "21" }, { user_id: "30", action_type: "borrow", copy_id: "21", borrow_id: "1", details: { password: "forbidden" } }, { user_id: "30", action_type: "login", token: "forbidden" }, { user_id: "30", action_type: "login", action_date: "now" }]) assert.throws(() => kiemTraSuKienSuDung(suKien), { status: 400 });
});

test("usage recorder uses the provided transaction connection and parameterized INSERT", async () => {
    let soLanGhiQuaPool = 0, cacLanGoi = [];
    const boKetNoi = { async execute() { soLanGhiQuaPool++; throw new Error("Must use transaction"); } };
    const ketNoi = { async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [{ affectedRows: 1 }]; } };
    const dichVu = taoDichVuLichSuSuDung(taoMoHinhLichSuSuDung(boKetNoi)); await dichVu.ghiNhan({ user_id: "30", copy_id: "21", borrow_id: "1", action_type: "return" }, ketNoi);
    assert.equal(soLanGhiQuaPool, 0); assert.equal(cacLanGoi.length, 1); assert.match(cacLanGoi[0].sql, /^INSERT INTO LichSuSuDung/); assert.match(cacLanGoi[0].sql, /UTC_TIMESTAMP/); assert.deepEqual(cacLanGoi[0].params.slice(0, 3), ["30", "21", "return"]);
});

test("usage SQL applies owner/range to count and page and never selects details or private profile", async () => {
    const cacLanGoi = [], boKetNoi = {
        async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[{ total: "1" }]]; },
        async query(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[{ usage_id: "9007199254740993", user_id: "30", copy_id: null, action_type: "login", action_date: "2026-11-01 00:00:00", details: "private" }]]; },
    };
    const ketQua = await taoMoHinhLichSuSuDung(boKetNoi).lietKe({ ...khoangNgay, user_id: "30", action_type: "login", page: 1, limit: 10, offset: 0 }); assert.equal(ketQua.items[0].usage_id, "9007199254740993"); assert.equal(ketQua.items[0].copy_id, null); assert.ok(!Object.hasOwn(ketQua.items[0], "details"));
    for (const c of cacLanGoi) { assert.match(c.sql, /l.user_id = \?/); assert.match(c.sql, /l.action_date >= \?/); assert.match(c.sql, /l.action_date < \?/); assert.ok(!/details|NguoiDung|password|email/.test(c.sql)); assert.deepEqual(c.params.slice(0, 4), [khoangNgay.from, khoangNgay.until, "30", "login"]); }
});

const MAT_KHAU = "usage-test-only-password", maBamMatKhau = await bcrypt.hash(MAT_KHAU, 4);
test("successful login signs token then records exactly one user event without credentials", async () => {
    const cacLanGoi = [];
    const moHinh = { async layThongTinDangNhap() { return { user_id: "30", status: "active", password: maBamMatKhau }; }, async ghiNhanDangNhap(ma) { cacLanGoi.push(["record", ma]); } };
    const dichVuToken = { kiemTraDaCauHinh() {}, phatHanhToken(ma) { cacLanGoi.push(["issue", ma]); return "synthetic-token"; } };
    const ketQua = await taoDichVuXacThuc(moHinh, dichVuToken).dangNhap({ email: "fixture@example.test", password: MAT_KHAU }); assert.equal(ketQua.accessToken, "synthetic-token"); assert.deepEqual(cacLanGoi, [["issue", "30"], ["record", "30"]]);
    let thamSo;
    await taoMoHinhXacThuc({ async execute(cauSql, cacGiaTri) { assert.match(cauSql, /^INSERT INTO LichSuSuDung/); thamSo = cacGiaTri; return [{ affectedRows: 1 }]; } }).ghiNhanDangNhap("30");
    assert.deepEqual(thamSo.slice(0, 3), ["30", null, "login"]); assert.ok(!JSON.stringify(thamSo).includes(MAT_KHAU));
});

test("wrong credentials, disabled user or signing failure never writes login history", async () => {
    for (const truongHopLoi of ["wrong", "disabled", "signing"]) {
        let cacBanGhi = 0;
        const moHinh = { async layThongTinDangNhap() { return { user_id: "30", status: truongHopLoi === "disabled" ? "locked" : "active", password: maBamMatKhau }; }, async ghiNhanDangNhap() { cacBanGhi++; } };
        const dichVuToken = { kiemTraDaCauHinh() {}, phatHanhToken() { throw new Error("signing failed"); } };
        await assert.rejects(taoDichVuXacThuc(moHinh, dichVuToken).dangNhap({ email: "fixture@example.test", password: truongHopLoi === "wrong" ? "wrong" : MAT_KHAU })); assert.equal(cacBanGhi, 0);
    }
});

test("login history failure fails the request without returning a token or hiding the database failure", async () => {
    const loi = Object.assign(new Error("private"), { code: "ER_LOCK_DEADLOCK" });
    const moHinh = { async layThongTinDangNhap() { return { user_id: "30", status: "active", password: maBamMatKhau }; }, async ghiNhanDangNhap() { throw loi; } };
    await assert.rejects(taoDichVuXacThuc(moHinh, { kiemTraDaCauHinh() {}, phatHanhToken() { return "not-returned"; } }).dangNhap({ email: "fixture@example.test", password: MAT_KHAU }), loi);
});

function taoLuuThongMoPhong({ returning: dangTra = false, failEventAt: loiTaiSuKienThu = 0, invalidCopy: banSaoKhongHopLe = false } = {}) {
    let duLieuDaCommit = { events: [], copies: [{ copy_id: "1", availability_status: dangTra ? "borrowed" : "available", condition_status: "good" }, { copy_id: "2", availability_status: dangTra ? "borrowed" : "available", condition_status: "good" }], details: dangTra ? ["1", "2"].map((ma, i) => ({ borrow_detail_id: String(i + 11), borrow_id: "1", copy_id: ma, status: "borrowed", returned_at: null, condition_before: "good", condition_after: null })) : [], header: dangTra ? { borrow_id: "1", user_id: "30", status: "borrowed" } : null };
    let duLieuTrongGiaoDich, cacSuKien = 0; const cacLanGoi = [];
    const ketNoi = {
        async beginTransaction() { duLieuTrongGiaoDich = structuredClone(duLieuDaCommit); cacLanGoi.push("begin"); },
        async commit() { duLieuDaCommit = duLieuTrongGiaoDich; cacLanGoi.push("commit"); }, async rollback() { cacLanGoi.push("rollback"); }, release() { cacLanGoi.push("release"); },
        async execute(cauSql, thamSo) {
            cacLanGoi.push(cauSql);
            if (cauSql.includes("FROM NguoiDung")) return [[{ user_id: "30", status: "active" }]];
            if (cauSql.includes("FROM BanSaoSach")) return [banSaoKhongHopLe && thamSo[0] === "2" ? [] : duLieuTrongGiaoDich.copies.filter(c => c.copy_id === thamSo[0])];
            if (cauSql.includes("FROM ChiTietPhieuMuon WHERE copy_id")) return [duLieuTrongGiaoDich.details.filter(d => d.copy_id === thamSo[0] && (d.returned_at === null || d.status !== "returned"))];
            if (cauSql.includes("FROM ChiTietPhieuMuon WHERE borrow_id")) return [structuredClone(duLieuTrongGiaoDich.details)];
            if (cauSql.startsWith("SELECT (CAST")) return [[{ valid_due_date: 1 }]];
            if (cauSql.startsWith("INSERT INTO PhieuMuon")) { duLieuTrongGiaoDich.header = { borrow_id: "1", user_id: thamSo[0], status: "borrowed" }; return [{ insertId: "1" }]; }
            if (cauSql.startsWith("INSERT INTO ChiTietPhieuMuon")) { duLieuTrongGiaoDich.details.push({ borrow_detail_id: String(duLieuTrongGiaoDich.details.length + 11), borrow_id: thamSo[0], copy_id: thamSo[1], condition_before: thamSo[2], status: "borrowed", returned_at: null }); return [{ affectedRows: 1 }]; }
            if (cauSql.startsWith("UPDATE BanSaoSach SET availability_status")) { duLieuTrongGiaoDich.copies.find(c => c.copy_id === thamSo[0]).availability_status = "borrowed"; return [{ affectedRows: 1 }]; }
            if (cauSql.startsWith("UPDATE ChiTietPhieuMuon")) { Object.assign(duLieuTrongGiaoDich.details.find(d => d.borrow_detail_id === thamSo[1]), { status: "returned", condition_after: thamSo[0], returned_at: "2026-11-07 00:00:00" }); return [{ affectedRows: 1 }]; }
            if (cauSql.startsWith("UPDATE BanSaoSach SET condition_status")) { Object.assign(duLieuTrongGiaoDich.copies.find(c => c.copy_id === thamSo[2]), { condition_status: thamSo[0], availability_status: thamSo[1] }); return [{ affectedRows: 1 }]; }
            if (cauSql.startsWith("UPDATE PhieuMuon")) { duLieuTrongGiaoDich.header.status = thamSo[0]; return [{ affectedRows: 1 }]; }
            if (cauSql.startsWith("INSERT INTO LichSuSuDung")) { cacSuKien++; if (loiTaiSuKienThu === cacSuKien) throw Object.assign(new Error("private insert failure"), { code: "ER_LOCK_DEADLOCK" }); duLieuTrongGiaoDich.events.push({ user_id: thamSo[0], copy_id: thamSo[1], action_type: thamSo[2], details: JSON.parse(thamSo[3]) }); return [{ affectedRows: 1 }]; }
            if (cauSql.includes("FROM PhieuMuon p LEFT JOIN")) return [duLieuTrongGiaoDich.details.map(d => ({ ...duLieuTrongGiaoDich.header, borrow_detail_id: d.borrow_detail_id, copy_id: d.copy_id, detail_status: d.status, returned_at: d.returned_at ?? null, condition_before: d.condition_before, condition_after: d.condition_after }))];
            if (cauSql.includes("FROM PhieuMuon WHERE")) return [[duLieuTrongGiaoDich.header]];
            throw new Error(`Unexpected statement: ${cauSql}`);
        },
    };
    return { model: taoMoHinhPhieuMuon({ async getConnection() { return ketNoi; } }), state: () => duLieuDaCommit, calls: cacLanGoi };
}
const PHIEU_MUON = { user_id: "30", copy_ids: ["2", "1"], due_date: "2035-01-01 12:00:00", note: null };

test("multi-copy borrow stores one event per copy for borrower in the same committed transaction", async () => {
    const csdlKiemThu = taoLuuThongMoPhong(); await csdlKiemThu.model.taoMoi(PHIEU_MUON);
    assert.deepEqual(csdlKiemThu.state().events.map(e => [e.user_id, e.copy_id, e.action_type, e.details.borrow_id]), [["30", "1", "borrow", "1"], ["30", "2", "borrow", "1"]]); assert.equal(csdlKiemThu.calls.filter(c => c === "commit").length, 1);
});

test("history INSERT failure after earlier event rolls back all loan/copy/history changes", async () => {
    const csdlKiemThu = taoLuuThongMoPhong({ failEventAt: 2 }); const banGoc = structuredClone(csdlKiemThu.state());
    await assert.rejects(csdlKiemThu.model.taoMoi(PHIEU_MUON), { code: "ER_LOCK_DEADLOCK" }); assert.deepEqual(csdlKiemThu.state(), banGoc); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]); assert.ok(!csdlKiemThu.calls.includes("commit"));
});

test("invalid borrow never records usage", async () => {
    const csdlKiemThu = taoLuuThongMoPhong({ invalidCopy: true }); await assert.rejects(csdlKiemThu.model.taoMoi(PHIEU_MUON), { status: 404 }); assert.equal(csdlKiemThu.state().events.length, 0); assert.ok(!csdlKiemThu.calls.some(cauSql => cauSql.startsWith("INSERT INTO LichSuSuDung")));
});

test("partial then complete return records only newly returned copies, repeat return emits nothing", async () => {
    const csdlKiemThu = taoLuuThongMoPhong({ returning: true }); await csdlKiemThu.model.traCacBanSao("1", { items: [{ copy_id: "1", condition_after: "damaged" }] });
    assert.equal(csdlKiemThu.state().header.status, "partially_returned"); assert.deepEqual(csdlKiemThu.state().events.map(e => [e.user_id, e.copy_id, e.action_type]), [["30", "1", "return"]]);
    await csdlKiemThu.model.traCacBanSao("1", { return_all: true, condition_after: "good" }); assert.equal(csdlKiemThu.state().header.status, "returned"); assert.deepEqual(csdlKiemThu.state().events.map(e => e.copy_id), ["1", "2"]);
    await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { return_all: true, condition_after: "good" }), { status: 409 }); assert.equal(csdlKiemThu.state().events.length, 2);
});

test("return history failure restores copies, details, header and earlier events through rollback", async () => {
    const csdlKiemThu = taoLuuThongMoPhong({ returning: true, failEventAt: 2 }), banGoc = structuredClone(csdlKiemThu.state());
    await assert.rejects(csdlKiemThu.model.traCacBanSao("1", { return_all: true, condition_after: "good" }), { code: "ER_LOCK_DEADLOCK" }); assert.deepEqual(csdlKiemThu.state(), banGoc); assert.ok(!csdlKiemThu.calls.includes("commit")); assert.deepEqual(csdlKiemThu.calls.slice(-2), ["rollback", "release"]);
});

test("overview maps real aggregate counts, uses one SELECT and distinguishes global totals from period flows", async () => {
    const cacLanGoi = [], duLieuTho = { books_total: "2", copies_total: "3", users_total: "2", borrows_total: "2", borrows_in_period: "2", borrowed_copies_in_period: "3", returned_copies_in_period: "1" };
    const moHinh = taoMoHinhThongKe({ async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[duLieuTho]]; } });
    assert.deepEqual(await moHinh.layTongQuan(khoangNgay), Object.fromEntries(Object.entries(duLieuTho).map(([chiSoPhu, phanTu]) => [chiSoPhu, Number(phanTu)]))); assert.equal(cacLanGoi.length, 1);
    assert.deepEqual(cacLanGoi[0].params, [khoangNgay.from, khoangNgay.until, khoangNgay.from, khoangNgay.until, khoangNgay.from, khoangNgay.until]); assert.match(cacLanGoi[0].sql, /status <> 'cancelled'/); assert.match(cacLanGoi[0].sql, /returned_at >= \?/);
});

test("borrow series counts receipts distinctly from copies and safely groups day/week/month", async () => {
    for (const cachNhom of ["day", "week", "month"]) {
        let lanGoi;
        const moHinh = taoMoHinhThongKe({ async execute(cauSql, thamSo) { lanGoi = { sql: cauSql, params: thamSo }; return [[{ period_start: cachNhom === "month" ? "2026-11" : "2026-11-01", borrow_count: "2", borrowed_copy_count: "3" }]]; } });
        const cacDong = await moHinh.thongKePhieuMuon({ ...khoangNgay, group_by: cachNhom, user_id: "30" }); assert.equal(cacDong[0].borrow_count, 2); assert.equal(cacDong[0].borrowed_copy_count, 3); assert.match(lanGoi.sql, /COUNT\(DISTINCT p.borrow_id\)/); assert.match(lanGoi.sql, /COUNT\(d.borrow_detail_id\)/); assert.match(lanGoi.sql, /LIMIT 400/); assert.deepEqual(lanGoi.params, [khoangNgay.from, khoangNgay.until, "30"]);
        if (cachNhom === "week") assert.match(lanGoi.sql, /WEEKDAY/);
    }
});

test("user activity preaggregates loans and structured events separately to avoid multiplying counts", async () => {
    const cacLanGoi = [], ketQuaTongHop = { user_id: "30", borrow_count: "2", usage_event_count: "4", active_days: "1", login_count: "1", borrow_copy_events: "2", return_copy_events: "1" };
    const boKetNoi = { async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[{ total: "1" }]]; }, async query(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return [[ketQuaTongHop]]; } };
    const ketQua = await taoMoHinhThongKe(boKetNoi).thongKeNguoiDung({ ...khoangNgay, user_id: "30", page: 1, limit: 10, offset: 0 }); assert.equal(ketQua.items[0].borrow_count, 2); assert.equal(ketQua.items[0].active_days, 1); assert.equal(ketQua.items[0].usage_event_count, 4);
    for (const lanGoi of cacLanGoi) { assert.match(lanGoi.sql, /LEFT JOIN \(SELECT user_id, COUNT\(\*\) AS borrow_count/); assert.match(lanGoi.sql, /COUNT\(DISTINCT DATE\(l.action_date\)\)/); assert.match(lanGoi.sql, /JSON_EXTRACT/); assert.match(lanGoi.sql, /libriflow-api/); assert.match(lanGoi.sql, /AND u.user_id = \?/); assert.deepEqual(lanGoi.params.slice(0, 5), [khoangNgay.from, khoangNgay.until, khoangNgay.from, khoangNgay.until, "30"]); assert.ok(!/email|phone|password|NhatKyHeThong|DuBaoTanSuat/.test(lanGoi.sql)); }
});

test("empty statistics results are actual zero counts or empty series, never synthetic history", async () => {
    const moHinh = taoMoHinhThongKe({ async execute(cauSql) { if (cauSql.includes("AS books_total")) return [[{ books_total: "0", copies_total: "0", users_total: "0", borrows_total: "0", borrows_in_period: "0", borrowed_copies_in_period: "0", returned_copies_in_period: "0" }]]; if (cauSql.startsWith("SELECT COUNT(*) AS total")) return [[{ total: "0" }]]; return [[]]; }, async query() { return [[]]; } });
    assert.equal((await moHinh.layTongQuan(khoangNgay)).borrows_total, 0); assert.deepEqual(await moHinh.thongKePhieuMuon({ ...khoangNgay, group_by: "day" }), []); assert.deepEqual(await moHinh.thongKeNguoiDung({ ...khoangNgay, limit: 10, offset: 0 }), { items: [], total: 0 });
});

test("aggregate counts exceeding JS safe integer range are rejected instead of silently rounding", async () => {
    const moHinh = taoMoHinhThongKe({ async execute() { return [[{ books_total: "9007199254740993" }]]; } }); await assert.rejects(moHinh.layTongQuan(khoangNgay), /Unsupported aggregate count/);
});
