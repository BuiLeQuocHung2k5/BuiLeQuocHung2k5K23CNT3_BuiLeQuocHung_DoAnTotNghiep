import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { dungUngDung } from "../src/app-factory.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";
import { duBaoLuotMuonTheoNgay, MUC_TIEU_DU_BAO, PHIEN_BAN_MO_HINH_DU_BAO, dichNgayUtc } from "../src/utils/thuat-toan-du-bao.js";
import { taoBoCungCapDoPhu, kiemTraXacNhanDoPhu } from "../src/config/do-phu-du-bao.js";
import { taoDichVuDuBao } from "../src/services/du-bao.service.js";
import { taoMoHinhDuBao } from "../src/models/du-bao.model.js";

const NGAY_CAT = "2026-11-07", ngayCuNhat = dichNgayUtc(NGAY_CAT, -28);
const NGU_CANH = { database_name: "fixture_test", server_uuid: "11111111-1111-4111-8111-111111111111", observed_at: "2026-11-07T12:00:00Z" };
const NGUOI_DUNG = { user_id: "30", status: "active", created_at: "2020-01-01 00:00:00" };
const DO_PHU = { verified: true, target: MUC_TIEU_DU_BAO, timezone: "UTC", start_date: ngayCuNhat, end_date: dichNgayUtc(NGAY_CAT, -1) };
const cacDong = (doDai = 28, giaTri = 1) => Array.from({ length: doDai }, (_, i) => ({ day: dichNgayUtc(NGAY_CAT, i - doDai), borrow_count: typeof giaTri === "function" ? giaTri(i) : giaTri }));
const tinhKetQua = cauHinhThayThe => duBaoLuotMuonTheoNgay({ cutoff_date: NGAY_CAT, user_created_at: NGUOI_DUNG.created_at, user_status: "active", rows: cacDong(), coverage: DO_PHU, ...cauHinhThayThe });

test("SMA7 forecasts seven UTC dates tomorrow onward, with explicit unit and finite nonnegative decimals", () => {
    const ketQua = tinhKetQua({ rows: cacDong(28, i => i >= 21 ? i - 20 : 0) });
    assert.equal(ketQua.status, "ready"); assert.equal(ketQua.model_version, PHIEN_BAN_MO_HINH_DU_BAO); assert.equal(ketQua.target, MUC_TIEU_DU_BAO);
    assert.equal(ketQua.predictions.length, 7); assert.equal(ketQua.predictions[0].forecast_date, "2026-11-08"); assert.equal(ketQua.predictions.at(-1).forecast_date, "2026-11-14");
    assert.equal(ketQua.training.borrow_count, 28); assert.equal(ketQua.training.start_date, "2026-10-31"); assert.equal(ketQua.training.end_date, "2026-11-06");
    for (const duBao of ketQua.predictions) { assert.equal(duBao.predicted_count, "4.00"); assert.ok(Number.isFinite(Number(duBao.predicted_count))); assert.ok(Number(duBao.predicted_count) >= 0); }
});

test("seven full covered days suffice for prediction but do not manufacture a backtest MAE", () => {
    const ketQua = tinhKetQua({ rows: cacDong(7, 2), coverage: { ...DO_PHU, start_date: dichNgayUtc(NGAY_CAT, -7) } });
    assert.equal(ketQua.status, "ready"); assert.equal(ketQua.predictions[0].predicted_count, "2.00"); assert.equal(ketQua.evaluation.status, "insufficient_data"); assert.equal(ketQua.evaluation.mae, null); assert.equal(ketQua.evaluation.sample_count, 0);
});

test("unverified coverage never interprets missing observations as zero, even with seven nonempty days", () => {
    for (const giaTri of [null, { ...DO_PHU, verified: false }, { ...DO_PHU, timezone: "Asia/Bangkok" }, { ...DO_PHU, target: "login_count" }]) {
        const ketQua = tinhKetQua({ rows: cacDong(7), coverage: giaTri }); assert.equal(ketQua.status, "insufficient_data"); assert.deepEqual(ketQua.predictions, []); assert.equal(ketQua.evaluation.mae, null);
    }
});

test("coverage gaps at beginning or end fail instead of imputing unknown days", () => {
    for (const phanThayDoi of [{ start_date: "2026-11-01" }, { end_date: "2026-11-05" }, { start_date: "2026-11-10" }]) assert.equal(tinhKetQua({ coverage: { ...DO_PHU, ...phanThayDoi } }).status, "insufficient_data");
});

test("user with no borrowing: unknown coverage is insufficient, verified complete history can yield genuine zero", () => {
    assert.equal(tinhKetQua({ rows: [], coverage: null }).status, "insufficient_data");
    const ketQuaKhong = tinhKetQua({ rows: [] }); assert.equal(ketQuaKhong.status, "ready"); assert.ok(ketQuaKhong.predictions.every(p => p.predicted_count === "0.00")); assert.equal(ketQuaKhong.evaluation.mae, 0);
});

test("partial registration day is excluded and a new user needs seven subsequent full days", () => {
    assert.equal(tinhKetQua({ rows: [], user_created_at: "2026-11-01 12:00:00" }).reason, "USER_HISTORY_TOO_SHORT");
    assert.equal(tinhKetQua({ rows: [], user_created_at: "2026-10-31 12:00:00" }).reason, "USER_HISTORY_TOO_SHORT");
    assert.equal(tinhKetQua({ rows: [], user_created_at: "2026-10-31 00:00:00" }).status, "ready");
});

test("valid activity on a partial registration day is omitted, not treated as corrupt or added to SMA", () => {
    const ketQua = tinhKetQua({ user_created_at: "2026-10-30 12:00:00", rows: [{ day: "2026-10-30", borrow_count: 9 }] });
    assert.equal(ketQua.status, "ready"); assert.equal(ketQua.training.borrow_count, 0); assert.equal(ketQua.predictions[0].predicted_count, "0.00");
    assert.equal(tinhKetQua({ user_created_at: "2026-10-30 12:00:00", rows: [{ day: "2026-10-29", borrow_count: 1 }] }).reason, "INVALID_HISTORY");
});

test("invalid, negative, NaN, Infinity, duplicate, future and oversized count inputs return insufficient", () => {
    const cacDongSai = [
        [{ day: "2026-11-06", borrow_count: -1 }], [{ day: "2026-11-06", borrow_count: NaN }], [{ day: "2026-11-06", borrow_count: Infinity }],
        [{ day: "2026-11-06", borrow_count: 1.5 }], [{ day: "2026-11-06", borrow_count: "1" }], [{ day: "2026-11-06", borrow_count: 10000000000 }],
        [{ day: NGAY_CAT, borrow_count: 1 }], [{ day: "2026-02-30", borrow_count: 1 }], [cacDong()[0], cacDong()[0]], cacDong(29),
    ];
    for (const dauVao of cacDongSai) assert.equal(tinhKetQua({ rows: dauVao }).status, "insufficient_data");
    assert.equal(tinhKetQua({ user_status: "locked" }).reason, "USER_INACTIVE"); assert.equal(tinhKetQua({ user_created_at: "2026-02-30 00:00:00" }).reason, "INVALID_USER_CREATION_DATE");
});

test("SMA rounds counts to two decimal places using exact integer arithmetic", () => {
    for (const [tongSo, mongDoi] of [[1, "0.14"], [2, "0.29"], [7, "1.00"], [9999999999, "1428571428.43"]]) {
        const ketQua = tinhKetQua({ rows: [{ day: "2026-11-06", borrow_count: tongSo }] }); assert.equal(ketQua.predictions[0].predicted_count, mongDoi);
    }
    assert.equal(tinhKetQua({ rows: cacDong(28, 9999999999) }).predictions[0].predicted_count, "9999999999.00");
});

test("backtest trains seven days, excludes origin day and tests seven strictly later days; known MAE=2", () => {
    const ketQua = tinhKetQua({ rows: cacDong(15, i => i < 7 ? 1 : i === 7 ? 999 : 3), coverage: { ...DO_PHU, start_date: dichNgayUtc(NGAY_CAT, -15) } });
    assert.equal(ketQua.evaluation.status, "evaluated"); assert.equal(ketQua.evaluation.sample_count, 7); assert.equal(ketQua.evaluation.mae, 2); assert.equal(ketQua.predictions[0].predicted_count, "3.00");
    const dotDanhGia = ketQua.evaluation.folds[0]; assert.equal(dotDanhGia.train_start, "2026-10-23"); assert.equal(dotDanhGia.train_end, "2026-10-29"); assert.equal(dotDanhGia.excluded_origin_date, "2026-10-30"); assert.equal(dotDanhGia.test_start, "2026-10-31"); assert.equal(dotDanhGia.test_end, "2026-11-06");
});

test("28 covered days give two nonoverlapping test blocks and 14 holdout samples, no train/test leakage", () => {
    const ketQua = tinhKetQua({}); assert.equal(ketQua.evaluation.mae, 0); assert.equal(ketQua.evaluation.sample_count, 14); assert.equal(ketQua.evaluation.folds.length, 2);
    const daGap = new Set();
    for (const dotDanhGia of ketQua.evaluation.folds) {
        assert.ok(dotDanhGia.train_end < dotDanhGia.excluded_origin_date && dotDanhGia.excluded_origin_date < dotDanhGia.test_start);
        for (let d = dotDanhGia.test_start; d <= dotDanhGia.test_end; d = dichNgayUtc(d, 1)) { assert.ok(!daGap.has(d)); daGap.add(d); }
    }
});

const XAC_NHAN_DO_PHU = { ...DO_PHU, complete: true, user_timestamps_timezone: "UTC", database_name: NGU_CANH.database_name, server_uuid: NGU_CANH.server_uuid, verified_at: "2026-11-07T00:00:00Z", evidence_ref: "fixture-audit-only" };
test("coverage attestation must match actual database/server, UTC evidence and a completed audited period", () => {
    assert.deepEqual(kiemTraXacNhanDoPhu(XAC_NHAN_DO_PHU, NGU_CANH), DO_PHU);
    for (const phanThayDoi of [{ verified: false }, { complete: false }, { missing_days: ["2026-11-01"] }, { database_name: "other_db" }, { server_uuid: "22222222-2222-4222-8222-222222222222" }, { server_uuid: undefined }, { evidence_ref: "" }, { user_timestamps_timezone: "unknown" }, { verified_at: "2026-11-08T00:00:00Z" }, { verified_at: "2026-11-06T12:00:00Z" }, { verified_at: "2026-02-30T00:00:00Z" }]) assert.equal(kiemTraXacNhanDoPhu({ ...XAC_NHAN_DO_PHU, ...phanThayDoi }, NGU_CANH), null);
    assert.equal(kiemTraXacNhanDoPhu(XAC_NHAN_DO_PHU, null), null);
});

test("coverage provider is opt-in, bounded, fails closed for absent/bad files and exposes no raw metadata", async () => {
    let soLanDoc = 0;
    assert.equal(await taoBoCungCapDoPhu({ getPath: () => undefined, read: async () => { soLanDoc++; } })(NGU_CANH), null); assert.equal(soLanDoc, 0);
    const docThongTinTep = async () => ({ isFile: () => true, size: 1000 });
    const boCungCap = taoBoCungCapDoPhu({ getPath: () => "private-fixture.json", fileStat: docThongTinTep, read: async () => JSON.stringify(XAC_NHAN_DO_PHU) });
    const banGhi = await boCungCap(NGU_CANH); assert.deepEqual(banGhi, DO_PHU); assert.ok(!Object.hasOwn(banGhi, "server_uuid")); assert.ok(!Object.hasOwn(banGhi, "evidence_ref"));
    for (const docTep of [async () => "not json", async () => { throw new Error("private path and contents"); }, async () => "x".repeat(17000)]) assert.equal(await taoBoCungCapDoPhu({ getPath: () => "fixture", fileStat: docThongTinTep, read: docTep })(NGU_CANH), null);
    assert.equal(await taoBoCungCapDoPhu({ getPath: () => "fixture", fileStat: async () => ({ isFile: () => true, size: 17000 }), read: async () => { throw new Error("must not read"); } })(NGU_CANH), null);
});

function taoMoHinhMau() {
    const cacLanGoi = [];
    return { calls: cacLanGoi, async timNguoiDung(ma) { cacLanGoi.push(["user", ma]); return ma === "99" ? null : { ...NGUOI_DUNG, user_id: ma }; }, async layNguCanh() { cacLanGoi.push(["context"]); return NGU_CANH; }, async demTheoNgay(ma, batDau, ketThuc) { cacLanGoi.push(["counts", ma, batDau, ketThuc]); return cacDong(); } };
}
test("forecast service uses actual user ID, UTC database cutoff and only bounded SELECT model inputs", async () => {
    const moHinh = taoMoHinhMau(), dichVu = taoDichVuDuBao(moHinh, { coverageProvider: async () => DO_PHU });
    const ketQua = await dichVu.xemTruoc("30"); assert.equal(ketQua.status, "ready"); assert.equal(ketQua.persisted, false); assert.deepEqual(moHinh.calls.at(-1), ["counts", "30", ngayCuNhat, NGAY_CAT]);
    await assert.rejects(dichVu.xemTruoc("99"), { status: 404, code: "USER_NOT_FOUND" });
});

test("unverified coverage never queries a filled-in daily series or saves insufficient forecasts", async () => {
    const moHinh = taoMoHinhMau(), ketQua = await taoDichVuDuBao(moHinh, { coverageProvider: async () => null }).xemTruoc("30");
    assert.equal(ketQua.status, "insufficient_data"); assert.deepEqual(ketQua.predictions, []); assert.equal(ketQua.persisted, false); assert.ok(!moHinh.calls.some(c => c[0] === "counts"));
});

test("generation is fail-closed without any model call or inferred write permission", async () => {
    const moHinh = taoMoHinhMau(); await assert.rejects(taoDichVuDuBao(moHinh).taoDuBao(), { status: 503, code: "FORECAST_GENERATION_NOT_CONFIGURED" }); assert.equal(moHinh.calls.length, 0);
});

async function voiUngDungKiemThu(congViec, { verified: daXacMinh = true } = {}) {
    const khoa = randomBytes(48).toString("base64url"), dichVuToken = taoDichVuJwt({ getSecret: () => khoa });
    const cacNguoiDungXacThuc = {
        reader: { user_id: "30", roles: ["reader"], permissions: ["book_view"] }, admin: { user_id: "10", roles: ["admin"], permissions: ["forecast_view"] },
        librarian: { user_id: "20", roles: ["librarian"], permissions: ["forecast_view"] }, fakeAdmin: { user_id: "40", roles: ["admin"], permissions: [] }, reportOnly: { user_id: "50", roles: ["staff"], permissions: ["report_view"] },
    };
    const moHinhDuBao = taoMoHinhMau();
    const coSoDuLieu = { async query() { throw new Error("Unexpected application database"); }, async getConnection() { throw new Error("Forecast must never acquire a write connection"); } };
    const moHinhXacThuc = { async layNguoiDungXacThuc(ma) { const p = Object.values(cacNguoiDungXacThuc).find(p => p.user_id === ma); return p ? { ...p, status: "active" } : null; } };
    const ungDung = dungUngDung({ database: coSoDuLieu, authModel: moHinhXacThuc, tokens: dichVuToken, forecastModel: moHinhDuBao, forecastOptions: { coverageProvider: async () => daXacMinh ? DO_PHU : null } });
    const mayChu = ungDung.listen(0, "127.0.0.1"); await once(mayChu, "listening");
    const guiYeuCau = async (duongDan, vaiTro, phuongThuc = "GET", noiDung) => {
        const phanHoi = await fetch(`http://127.0.0.1:${mayChu.address().port}${duongDan}`, { method: phuongThuc, headers: { ...(vaiTro ? { Authorization: `Bearer ${dichVuToken.phatHanhToken(cacNguoiDungXacThuc[vaiTro].user_id)}` } : {}), ...(noiDung ? { "Content-Type": "application/json" } : {}) }, ...(noiDung ? { body: JSON.stringify(noiDung) } : {}) });
        return { status: phanHoi.status, body: await phanHoi.json(), cache: phanHoi.headers.get("cache-control") };
    };
    try { await congViec(guiYeuCau, moHinhDuBao); } finally { mayChu.closeAllConnections(); await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
}

test("forecast endpoints all require JWT and reader me is fixed to JWT owner", async () => {
    await voiUngDungKiemThu(async (guiYeuCau, moHinh) => {
        for (const [duongDan, phuongThuc] of [["/api/forecasts/me", "GET"], ["/api/forecasts/users/30", "GET"], ["/api/forecasts/users/30/generate", "POST"]]) assert.equal((await guiYeuCau(duongDan, undefined, phuongThuc)).status, 401);
        const duLieuCuaToi = await guiYeuCau("/api/forecasts/me", "reader"); assert.equal(duLieuCuaToi.status, 200); assert.equal(duLieuCuaToi.body.data.user_id, "30"); assert.equal(duLieuCuaToi.body.data.predictions.length, 7); assert.equal(duLieuCuaToi.cache, "no-store"); assert.equal(moHinh.calls[0][1], "30");
    });
});

test("forecast_view authorizes staff read, while reader, role-only admin and report_view cannot cross users", async () => {
    await voiUngDungKiemThu(async guiYeuCau => {
        for (const vaiTro of ["reader", "fakeAdmin", "reportOnly"]) {
            assert.equal((await guiYeuCau("/api/forecasts/users/30", vaiTro)).status, 403);
            assert.equal((await guiYeuCau("/api/forecasts/users/30/generate", vaiTro, "POST")).status, 403);
        }
        for (const vaiTro of ["admin", "librarian"]) {
            const phanHoi = await guiYeuCau("/api/forecasts/users/30", vaiTro); assert.equal(phanHoi.status, 200); assert.equal(phanHoi.body.data.user_id, "30");
        }
        assert.equal((await guiYeuCau("/api/forecasts/me", "admin")).body.data.user_id, "10");
    });
});

test("generate gate returns safe 503 even to forecast_view, never writes or fabricates persistence", async () => {
    await voiUngDungKiemThu(async (guiYeuCau, moHinh) => {
        for (const vaiTro of ["admin", "librarian"]) {
            const phanHoi = await guiYeuCau("/api/forecasts/users/30/generate", vaiTro, "POST", { amount: 999, coverage: XAC_NHAN_DO_PHU });
            assert.equal(phanHoi.status, 503); assert.equal(phanHoi.body.error.code, "FORECAST_GENERATION_NOT_CONFIGURED"); assert.ok(!JSON.stringify(phanHoi.body).includes(NGU_CANH.server_uuid));
        }
        assert.equal(moHinh.calls.length, 0);
    });
});

test("HTTP insufficient_data is 200 with empty predictions, MAE null, no persistence", async () => {
    await voiUngDungKiemThu(async guiYeuCau => { const ketQua = await guiYeuCau("/api/forecasts/me", "reader"); assert.equal(ketQua.status, 200); assert.equal(ketQua.body.data.status, "insufficient_data"); assert.deepEqual(ketQua.body.data.predictions, []); assert.equal(ketQua.body.data.evaluation.mae, null); assert.equal(ketQua.body.data.persisted, false); }, { verified: false });
});

test("invalid user IDs and query coverage overrides are 400; absent authorized target is 404", async () => {
    await voiUngDungKiemThu(async guiYeuCau => {
        for (const duongDan of ["/api/forecasts/me?user_id=99", "/api/forecasts/me?coverage_verified=true", "/api/forecasts/users/0", "/api/forecasts/users/30?cutoff_date=2026-01-01"]) assert.equal((await guiYeuCau(duongDan, "admin")).status, 400);
        assert.equal((await guiYeuCau("/api/forecasts/users/99", "librarian")).status, 404);
    });
});

test("forecast model counts receipts from PhieuMuon only, parameterizes user/range and never accesses contacts/login", async () => {
    const cacLanGoi = [], moHinh = taoMoHinhDuBao({
        async query(cauSql) { cacLanGoi.push({ sql: cauSql }); return [[NGU_CANH]]; },
        async execute(cauSql, thamSo) { cacLanGoi.push({ sql: cauSql, params: thamSo }); return cauSql.includes("FROM NguoiDung") ? [[NGUOI_DUNG]] : [[{ day: "2026-11-06", borrow_count: "3" }]]; },
    });
    await moHinh.timNguoiDung("30"); await moHinh.layNguCanh(); const ketQua = await moHinh.demTheoNgay("30", ngayCuNhat, NGAY_CAT); assert.equal(ketQua[0].borrow_count, 3);
    const lanGoi = cacLanGoi.at(-1); assert.match(lanGoi.sql, /COUNT\(\*\)/); assert.match(lanGoi.sql, /status <> 'cancelled'/); assert.match(lanGoi.sql, /LIMIT 28/); assert.deepEqual(lanGoi.params, ["30", `${ngayCuNhat} 00:00:00`, `${NGAY_CAT} 00:00:00`]);
    for (const c of cacLanGoi) { assert.ok(c.sql.startsWith("SELECT")); assert.ok(!/JOIN|ChiTietPhieuMuon|LichSuSuDung|password|email|phone|INSERT|UPDATE|DuBaoTanSuat/.test(c.sql)); }
});
