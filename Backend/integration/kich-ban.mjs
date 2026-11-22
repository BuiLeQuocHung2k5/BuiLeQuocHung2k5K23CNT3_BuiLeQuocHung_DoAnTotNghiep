import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { napCauHinhKiemThu, moCoSoDuLieuKiemThu } from "./an-toan.mjs";
import { dungUngDung } from "../src/app-factory.js";
import { taoDichVuJwt } from "../src/utils/jwt.js";
import { thucHienGiaoDich } from "../src/utils/truy-van-danh-muc.js";
import { taoMoHinhLichSuSuDung } from "../src/models/lich-su-su-dung.model.js";
import { taoDichVuLichSuSuDung } from "../src/services/lich-su-su-dung.service.js";

// Tệp nằm ngoài test/ và không mang hậu tố *.test.js để tránh tự chạy integration.
// Chỉ lệnh integration tường minh mới chạy tệp này; không dùng MySQL mô phỏng.
const coSoDuLieu = await moCoSoDuLieuKiemThu(napCauHinhKiemThu());

test("real MySQL: isolated auth/catalog/circulation lifecycle", { timeout: 120000 }, async t => {
    const maLanChay = randomBytes(12).toString("hex"), tienTo = `it_${maLanChay.slice(0, 16)}`;
    const bangKeKiemThu = { users: [], categories: [], books: [], copies: [], borrows: [] };
    let mayChu, coLoi = false, daChayXong = false, daDangKyLanChay = false, thuTuMaVach = 0, thuTuPhieu = 0;
    const luuBangKe = () => coSoDuLieu.execute("UPDATE __libriflow_integration_runs SET manifest = ? WHERE run_id = ?", [JSON.stringify(bangKeKiemThu), maLanChay]);
    t.after(async () => {
        try {
            if (daDangKyLanChay) await coSoDuLieu.execute("UPDATE __libriflow_integration_runs SET status = ?, finished_at = UTC_TIMESTAMP(), manifest = ? WHERE run_id = ?", [daChayXong && !coLoi ? "passed" : "failed", JSON.stringify(bangKeKiemThu), maLanChay]);
        } finally {
            if (mayChu) { mayChu.closeAllConnections();await new Promise(hoanThanh => mayChu.close(hoanThanh)); }
            await coSoDuLieu.end();
        }
    });
    await coSoDuLieu.execute("INSERT INTO __libriflow_integration_runs (run_id, status, started_at, manifest) VALUES (?, 'running', UTC_TIMESTAMP(), ?)", [maLanChay, JSON.stringify(bangKeKiemThu)]);
    daDangKyLanChay = true;
    const khoaBiMat = randomBytes(48).toString("base64url");
    mayChu = dungUngDung({ database: coSoDuLieu, tokens: taoDichVuJwt({ getSecret: () => khoaBiMat }) }).listen(0, "127.0.0.1");
    await once(mayChu, "listening");
    const diaChiGoc = `http://127.0.0.1:${mayChu.address().port}`;
    async function guiYeuCau(duongDan, phuongThuc = "GET", noiDung, tokenTruyCapMau) {
        const phanHoi = await fetch(diaChiGoc + duongDan, { method: phuongThuc, headers: { ...(noiDung !== undefined ? { "Content-Type": "application/json" } : {}), ...(tokenTruyCapMau ? { Authorization: `Bearer ${tokenTruyCapMau}` } : {}) }, ...(noiDung !== undefined ? { body: JSON.stringify(noiDung) } : {}) });
        return { status: phanHoi.status, body: await phanHoi.json() };
    }
    const cacDong = async (cauSql, thamSo = []) => (await coSoDuLieu.execute(cauSql, thamSo))[0];
    const giaTriDon = async (cauSql, thamSo = []) => Number(Object.values((await cacDong(cauSql, thamSo))[0])[0]);
    // Tài khoản giới hạn quyền có thể nhận 1216 thay cho 1452; cả hai là lỗi FK thiếu hàng cha.
    const laLoiKhoaNgoai = loi => ["ER_NO_REFERENCED_ROW", "ER_NO_REFERENCED_ROW_2"].includes(loi.code);
    async function chayKichBan(ten, congViec) {
        await t.test(ten, async () => {
            try { await congViec(); } catch (loi) { coLoi = true;throw loi; }
            finally { await luuBangKe(); }
        });
    }
    function xacNhanMaHttp(phanHoi, trangThai) { assert.equal(phanHoi.status, trangThai, "Unexpected HTTP status (response deliberately not logged).");return phanHoi.body.data; }
    const matKhau = randomBytes(24).toString("hex");
    const cacNguoiDung = {}, dichVuToken = {};
    let maDanhMuc, maSach, banSaoDuyNhat, phieuMotBanSao, phieuMuonNhieuBanSao, cacBanSaoTrongLo, phieuCanhTranh, banSaoCanhTranh, phieuRiengTu;
    const hanTra = () => new Date(Date.now() + 7 * 86400000).toISOString().replace(/\.\d{3}Z$/, "Z");
    async function taoBanSaoMau(boSung = {}) {
        const maVach = `${tienTo}_${++thuTuMaVach}`;
        const duLieu = xacNhanMaHttp(await guiYeuCau("/api/book-copies", "POST", { book_id: maSach, barcode: maVach, ...boSung }, dichVuToken.staff), 201);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM BanSaoSach WHERE copy_id = ? AND book_id = ? AND barcode = ?", [duLieu.copy_id, maSach, maVach]), 1);
        bangKeKiemThu.copies.push(duLieu.copy_id);await luuBangKe();return duLieu;
    }
    async function lapPhieuMuonMau(cacMaBanSao, nguoiDung = cacNguoiDung.readerA) {
        const ghiChu = `${tienTo}_loan_${++thuTuPhieu}`;
        const phanHoi = await guiYeuCau("/api/borrows", "POST", { user_id: nguoiDung, copy_ids: cacMaBanSao, due_date: hanTra(), note: ghiChu }, dichVuToken.staff);
        if (phanHoi.status === 201) {
            assert.equal(await giaTriDon("SELECT COUNT(*) FROM PhieuMuon WHERE borrow_id = ? AND user_id = ? AND note = ?", [phanHoi.body.data.borrow_id, nguoiDung, ghiChu]), 1);
            bangKeKiemThu.borrows.push(phanHoi.body.data.borrow_id);await luuBangKe();
        }
        return phanHoi;
    }
    const dauIsbn = "978" + BigInt("0x" + maLanChay.slice(0, 8)).toString().padStart(10, "0").slice(-9);
    const tongIsbn = [...dauIsbn].reduce((tong, so, i) => tong + Number(so) * (i % 2 ? 3 : 1), 0);
    const isbn = dauIsbn + (10 - tongIsbn % 10) % 10;
    const soPhieu = () => giaTriDon("SELECT COUNT(*) FROM PhieuMuon WHERE user_id IN (?, ?)", [cacNguoiDung.readerA, cacNguoiDung.readerB]);
    const soChiTiet = () => giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon d JOIN PhieuMuon p ON p.borrow_id = d.borrow_id WHERE p.user_id IN (?, ?)", [cacNguoiDung.readerA, cacNguoiDung.readerB]);

    await chayKichBan("register and login real fixture users; passwords are hashed and never returned", async () => {
        for (const loai of ["staff", "readerA", "readerB"]) {
            const thuDienTu = `${tienTo}_${loai.toLowerCase()}@example.test`;
            const daDangKy = xacNhanMaHttp(await guiYeuCau("/api/auth/register", "POST", { name: `${tienTo}_${loai}`, email: thuDienTu, password: matKhau }), 201);
            assert.equal(await giaTriDon("SELECT COUNT(*) FROM NguoiDung WHERE user_id = ? AND email = ? AND name = ?", [daDangKy.user_id, thuDienTu, `${tienTo}_${loai}`]), 1);
            cacNguoiDung[loai] = daDangKy.user_id;bangKeKiemThu.users.push(daDangKy.user_id);await luuBangKe();
            assert.ok(!Object.hasOwn(daDangKy, "password"));
            if (loai === "staff") {
                // Chỉ tài khoản vừa tạo bởi lần test này được gán librarian trong DB thử nghiệm.
                await coSoDuLieu.execute("INSERT INTO NguoiDung_VaiTro (user_id, role_id) SELECT u.user_id, r.role_id FROM NguoiDung u CROSS JOIN VaiTro r WHERE u.user_id = ? AND u.email = ? AND u.name = ? AND r.name = ?", [daDangKy.user_id, thuDienTu, `${tienTo}_${loai}`, "librarian"]);
            }
            const ketQuaDangNhap = xacNhanMaHttp(await guiYeuCau("/api/auth/login", "POST", { email: thuDienTu, password: matKhau }), 200);
            assert.equal(ketQuaDangNhap.tokenType, "Bearer");dichVuToken[loai] = ketQuaDangNhap.accessToken;
            assert.equal(xacNhanMaHttp(await guiYeuCau("/api/auth/me", "GET", undefined, dichVuToken[loai]), 200).user_id, daDangKy.user_id);
            const [duLieuLuu] = await cacDong("SELECT password FROM NguoiDung WHERE user_id = ?", [daDangKy.user_id]);
            assert.ok(duLieuLuu.password !== matKhau);assert.ok(await bcrypt.compare(matKhau, duLieuLuu.password));
        }
        xacNhanMaHttp(await guiYeuCau("/api/auth/login", "POST", { email: `${tienTo}_readera@example.test`, password: "wrong-fixture-password" }), 401);
        xacNhanMaHttp(await guiYeuCau("/api/auth/register", "POST", { name: tienTo, email: `${tienTo}_readera@example.test`, password: matKhau }), 409);
    });
    if (!dichVuToken.staff || !dichVuToken.readerA || !dichVuToken.readerB) throw new Error("Integration auth prerequisites failed; dependent write scenarios stopped.");

    await chayKichBan("health and create category/book/copy using real JWT and DB RBAC", async () => {
        xacNhanMaHttp(await guiYeuCau("/api/health/db"), 200);
        maDanhMuc = xacNhanMaHttp(await guiYeuCau("/api/categories", "POST", { name: tienTo }, dichVuToken.staff), 201).category_id;bangKeKiemThu.categories.push(maDanhMuc);await luuBangKe();
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM DanhMuc WHERE category_id = ? AND name = ?", [maDanhMuc, tienTo]), 1);
        maSach = xacNhanMaHttp(await guiYeuCau("/api/books", "POST", { title: `${tienTo}_book`, author: "Synthetic integration fixture", isbn, category_id: maDanhMuc }, dichVuToken.staff), 201).book_id;bangKeKiemThu.books.push(maSach);await luuBangKe();
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM Sach WHERE book_id = ? AND title = ?", [maSach, `${tienTo}_book`]), 1);
        banSaoDuyNhat = await taoBanSaoMau();
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM Sach WHERE book_id = ? AND category_id = ?", [maSach, maDanhMuc]), 1);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM BanSaoSach WHERE copy_id = ? AND book_id = ?", [banSaoDuyNhat.copy_id, maSach]), 1);
    });
    if (!maSach || !banSaoDuyNhat) throw new Error("Integration catalog prerequisites failed; dependent write scenarios stopped.");

    await chayKichBan("real UNIQUE and FK constraints reject invalid inserts without persisting rows", async () => {
        xacNhanMaHttp(await guiYeuCau("/api/categories", "POST", { name: tienTo }, dichVuToken.staff), 409);
        xacNhanMaHttp(await guiYeuCau("/api/book-copies", "POST", { book_id: maSach, barcode: banSaoDuyNhat.barcode }, dichVuToken.staff), 409);
        xacNhanMaHttp(await guiYeuCau("/api/books", "POST", { title: tienTo, author: tienTo, isbn }, dichVuToken.staff), 409);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM Sach WHERE book_id = ?", ["18446744073709551615"]), 0);
        xacNhanMaHttp(await guiYeuCau("/api/book-copies", "POST", { book_id: "18446744073709551615", barcode: `${tienTo}_bad_fk` }, dichVuToken.staff), 400);
        await assert.rejects(coSoDuLieu.execute("INSERT INTO BanSaoSach (book_id, barcode) VALUES (?, ?)", ["18446744073709551615", `${tienTo}_sql_bad_fk`]), laLoiKhoaNgoai);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM BanSaoSach WHERE barcode IN (?, ?)", [ `${tienTo}_bad_fk`, `${tienTo}_sql_bad_fk`]), 0);
    });

    await chayKichBan("borrow one copy and verify committed header/detail/copy state via SELECT", async () => {
        const muc = await taoBanSaoMau();phieuMotBanSao = xacNhanMaHttp(await lapPhieuMuonMau([muc.copy_id]), 201);phieuMotBanSao.fixtureCopy = muc.copy_id;
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM PhieuMuon WHERE borrow_id = ? AND status = 'borrowed'", [phieuMotBanSao.borrow_id]), 1);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND copy_id = ? AND status = 'borrowed' AND returned_at IS NULL", [phieuMotBanSao.borrow_id, muc.copy_id]), 1);
        assert.equal((await cacDong("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [muc.copy_id]))[0].availability_status, "borrowed");
    });

    await chayKichBan("borrow multiple copies atomically and SELECT every state", async () => {
        cacBanSaoTrongLo = [await taoBanSaoMau(), await taoBanSaoMau()];phieuMuonNhieuBanSao = xacNhanMaHttp(await lapPhieuMuonMau(cacBanSaoTrongLo.map(muc => muc.copy_id).reverse()), 201);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND status = 'borrowed'", [phieuMuonNhieuBanSao.borrow_id]), 2);
        for (const muc of cacBanSaoTrongLo) assert.equal((await cacDong("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [muc.copy_id]))[0].availability_status, "borrowed");
    });

    let lanTraDauTien;
    await chayKichBan("partial damaged return commits maintenance/detail and partially_returned header", async () => {
        xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuMuonNhieuBanSao.borrow_id}/return`, "POST", { items: [{ copy_id: cacBanSaoTrongLo[0].copy_id, condition_after: "damaged" }] }, dichVuToken.staff), 200);
        assert.equal((await cacDong("SELECT status FROM PhieuMuon WHERE borrow_id = ?", [phieuMuonNhieuBanSao.borrow_id]))[0].status, "partially_returned");
        const [chiTiet] = await cacDong("SELECT status, condition_after, DATE_FORMAT(returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at FROM ChiTietPhieuMuon WHERE borrow_id = ? AND copy_id = ?", [phieuMuonNhieuBanSao.borrow_id, cacBanSaoTrongLo[0].copy_id]);
        assert.equal(chiTiet.status, "returned");assert.equal(chiTiet.condition_after, "damaged");assert.ok(chiTiet.returned_at);lanTraDauTien = chiTiet.returned_at;
        assert.equal((await cacDong("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [cacBanSaoTrongLo[0].copy_id]))[0].availability_status, "maintenance");
        assert.equal((await cacDong("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [cacBanSaoTrongLo[1].copy_id]))[0].availability_status, "borrowed");
    });

    await chayKichBan("return remaining copies preserves previous return and completes header", async () => {
        xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuMuonNhieuBanSao.borrow_id}/return`, "POST", { return_all: true, condition_after: "good" }, dichVuToken.staff), 200);
        assert.equal((await cacDong("SELECT status FROM PhieuMuon WHERE borrow_id = ?", [phieuMuonNhieuBanSao.borrow_id]))[0].status, "returned");
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND status = 'returned' AND returned_at IS NOT NULL", [phieuMuonNhieuBanSao.borrow_id]), 2);
        const [truocKhiChay] = await cacDong("SELECT condition_after, DATE_FORMAT(returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at FROM ChiTietPhieuMuon WHERE borrow_id = ? AND copy_id = ?", [phieuMuonNhieuBanSao.borrow_id, cacBanSaoTrongLo[0].copy_id]);
        assert.equal(truocKhiChay.returned_at, lanTraDauTien);assert.equal(truocKhiChay.condition_after, "damaged");
        assert.equal((await cacDong("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [cacBanSaoTrongLo[1].copy_id]))[0].availability_status, "available");
        xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuMuonNhieuBanSao.borrow_id}/return`, "POST", { return_all: true, condition_after: "good" }, dichVuToken.staff), 409);
    });

    await chayKichBan("cannot borrow an already borrowed copy; no extra header/detail persists", async () => {
        const truocKhiThucHien = [await soPhieu(), await soChiTiet()];xacNhanMaHttp(await lapPhieuMuonMau([phieuMotBanSao.fixtureCopy], cacNguoiDung.readerB), 409);
        assert.deepEqual([await soPhieu(), await soChiTiet()], truocKhiThucHien);
    });

    await chayKichBan("invalid member rolls back whole batch and leaves valid copy available", async () => {
        const hopLe = await taoBanSaoMau();const truocKhiThucHien = [await soPhieu(), await soChiTiet()];
        xacNhanMaHttp(await lapPhieuMuonMau([hopLe.copy_id, "18446744073709551615"]), 404);
        assert.deepEqual([await soPhieu(), await soChiTiet()], truocKhiThucHien);
        assert.equal((await cacDong("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [hopLe.copy_id]))[0].availability_status, "available");
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE copy_id = ?", [hopLe.copy_id]), 0);
    });

    await chayKichBan("real SQL FK failure AFTER header INSERT rolls back the shared transaction helper", async () => {
        let maDaThu;
        const truocKhiThucHien = await soPhieu();
        const soSuKienTruoc = await giaTriDon("SELECT COUNT(*) FROM LichSuSuDung WHERE user_id=?", [cacNguoiDung.readerA]);
        await assert.rejects(thucHienGiaoDich(coSoDuLieu, async ketNoi => {
            const [ketQua] = await ketNoi.execute("INSERT INTO PhieuMuon (user_id, due_date, note) VALUES (?, ?, ?)", [cacNguoiDung.readerA, "2035-01-01 00:00:00", `${tienTo}_rollback`]);maDaThu = String(ketQua.insertId);
            await taoDichVuLichSuSuDung(taoMoHinhLichSuSuDung(coSoDuLieu)).ghiNhan({ user_id: cacNguoiDung.readerA, copy_id: banSaoDuyNhat.copy_id, borrow_id: maDaThu, action_type: "borrow" }, ketNoi);
            await ketNoi.execute("INSERT INTO ChiTietPhieuMuon (borrow_id, copy_id) VALUES (?, ?)", [maDaThu, "18446744073709551615"]);
        }), laLoiKhoaNgoai);
        assert.equal(await soPhieu(), truocKhiThucHien);assert.equal(await giaTriDon("SELECT COUNT(*) FROM PhieuMuon WHERE borrow_id = ?", [maDaThu]), 0);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM LichSuSuDung WHERE user_id=?", [cacNguoiDung.readerA]), soSuKienTruoc);
    });

    await chayKichBan("two real concurrent HTTP borrows: exactly one succeeds, SELECT proves one open loan", async () => {
        banSaoCanhTranh = await taoBanSaoMau();const truocKhiThucHien = await soPhieu();
        const cacPhanHoi = await Promise.all([lapPhieuMuonMau([banSaoCanhTranh.copy_id], cacNguoiDung.readerA), lapPhieuMuonMau([banSaoCanhTranh.copy_id], cacNguoiDung.readerB)]);
        assert.deepEqual(cacPhanHoi.map(phanHoi => phanHoi.status).sort(), [201, 409]);phieuCanhTranh = cacPhanHoi.find(phanHoi => phanHoi.status === 201).body.data;
        assert.equal(await soPhieu(), truocKhiThucHien + 1);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE copy_id = ? AND (returned_at IS NULL OR status <> 'returned')", [banSaoCanhTranh.copy_id]), 1);
        assert.equal((await cacDong("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [banSaoCanhTranh.copy_id]))[0].availability_status, "borrowed");
    });

    await chayKichBan("invalid return batch preserves loan and all original copy states", async () => {
        xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuCanhTranh.borrow_id}/return`, "POST", { items: [{ copy_id: banSaoCanhTranh.copy_id, condition_after: "good" }, { copy_id: banSaoDuyNhat.copy_id, condition_after: "good" }] }, dichVuToken.staff), 400);
        assert.equal((await cacDong("SELECT status FROM PhieuMuon WHERE borrow_id = ?", [phieuCanhTranh.borrow_id]))[0].status, "borrowed");
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND returned_at IS NULL AND status = 'borrowed'", [phieuCanhTranh.borrow_id]), 1);
        assert.equal((await cacDong("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [banSaoCanhTranh.copy_id]))[0].availability_status, "borrowed");
    });

    await chayKichBan("real reader JWT cannot read another reader's loan or write circulation", async () => {
        const muc = await taoBanSaoMau();phieuRiengTu = xacNhanMaHttp(await lapPhieuMuonMau([muc.copy_id], cacNguoiDung.readerB), 201);
        xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuRiengTu.borrow_id}`, "GET", undefined, dichVuToken.readerA), 404);
        xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuRiengTu.borrow_id}`, "GET", undefined, dichVuToken.readerB), 200);
        const lietKe = xacNhanMaHttp(await guiYeuCau("/api/borrows?limit=100", "GET", undefined, dichVuToken.readerA), 200);
        assert.ok(lietKe.every(phieuDaLap => phieuDaLap.user_id === cacNguoiDung.readerA));
        xacNhanMaHttp(await guiYeuCau(`/api/borrows?user_id=${cacNguoiDung.readerB}`, "GET", undefined, dichVuToken.readerA), 403);
        xacNhanMaHttp(await guiYeuCau("/api/borrows", "POST", { user_id: cacNguoiDung.readerB, copy_ids: [banSaoDuyNhat.copy_id], due_date: hanTra() }, dichVuToken.readerA), 403);
        xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuRiengTu.borrow_id}/return`, "POST", { return_all: true, condition_after: "good" }, dichVuToken.readerA), 403);
    });

    await chayKichBan("history and category FK are preserved by blocked DELETE endpoints", async () => {
        xacNhanMaHttp(await guiYeuCau(`/api/categories/${maDanhMuc}`, "DELETE", undefined, dichVuToken.staff), 409);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM Sach WHERE book_id = ? AND category_id = ?", [maSach, maDanhMuc]), 1);
        xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuMotBanSao.borrow_id}/return`, "POST", { return_all: true, condition_after: "good" }, dichVuToken.staff), 200);
        xacNhanMaHttp(await guiYeuCau(`/api/book-copies/${phieuMotBanSao.fixtureCopy}`, "DELETE", undefined, dichVuToken.staff), 409);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND copy_id = ?", [phieuMotBanSao.borrow_id, phieuMotBanSao.fixtureCopy]), 1);
    });

    await chayKichBan("SELECT all owned copies: never more than one open detail per copy", async () => {
        const cacViTriThamSo = bangKeKiemThu.copies.map(() => "?").join(", ");
        const cacBanGhiTrung = await cacDong(`SELECT copy_id, COUNT(*) AS total FROM ChiTietPhieuMuon WHERE copy_id IN (${cacViTriThamSo}) AND (returned_at IS NULL OR status <> 'returned') GROUP BY copy_id HAVING COUNT(*) > 1`, bangKeKiemThu.copies);
        assert.equal(cacBanGhiTrung.length, 0);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM Phat f JOIN ChiTietPhieuMuon d ON d.borrow_detail_id=f.borrow_detail_id JOIN PhieuMuon p ON p.borrow_id=d.borrow_id WHERE p.user_id IN (?, ?)", [cacNguoiDung.readerA, cacNguoiDung.readerB]), 0);
    });
    await chayKichBan("real JWT validation and catalog permissions reject invalid or unprivileged requests", async () => {
        const cacPhan = dichVuToken.readerA.split(".");
        cacPhan[2] = (cacPhan[2][0] === "A" ? "B" : "A") + cacPhan[2].slice(1);
        xacNhanMaHttp(await guiYeuCau("/api/auth/me", "GET", undefined, cacPhan.join(".")), 401);
        xacNhanMaHttp(await guiYeuCau("/api/auth/me", "GET", undefined, "not.a.token"), 401);
        xacNhanMaHttp(await guiYeuCau("/api/categories", "POST", { name: `${tienTo}_denied` }, dichVuToken.readerA), 403);
        xacNhanMaHttp(await guiYeuCau("/api/books", "POST", { title: tienTo, author: tienTo }, dichVuToken.readerA), 403);
        xacNhanMaHttp(await guiYeuCau("/api/books?limit=101"), 400);
        const loi = await guiYeuCau("/api/book-copies", "POST", { book_id: maSach, barcode: banSaoDuyNhat.barcode }, dichVuToken.staff);
        xacNhanMaHttp(loi, 409); assert.ok(!/stack|sqlMessage|sqlState/.test(JSON.stringify(loi.body)));
    });

    await chayKichBan("real login/borrow/return usage matches committed rows; GET never creates events", async () => {
        for (const ma of Object.values(cacNguoiDung)) assert.equal(await giaTriDon("SELECT COUNT(*) FROM LichSuSuDung WHERE user_id=? AND action_type='login'", [ma]), 1);
        const thamSo = [cacNguoiDung.readerA, cacNguoiDung.readerB];
        const soMuon = await soChiTiet();
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM LichSuSuDung WHERE user_id IN (?,?) AND action_type='borrow'", thamSo), soMuon);
        const soTra = await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon d JOIN PhieuMuon p ON p.borrow_id=d.borrow_id WHERE p.user_id IN (?,?) AND d.status='returned' AND d.returned_at IS NOT NULL", thamSo);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM LichSuSuDung WHERE user_id IN (?,?) AND action_type='return'", thamSo), soTra);
        const truoc = await giaTriDon("SELECT COUNT(*) FROM LichSuSuDung WHERE user_id IN (?,?)", thamSo);
        const lichSu = xacNhanMaHttp(await guiYeuCau("/api/usage-history/me?limit=100", "GET", undefined, dichVuToken.readerA), 200);
        assert.ok(lichSu.length > 0 && lichSu.every(row => row.user_id === cacNguoiDung.readerA && !Object.hasOwn(row, "details")));
        xacNhanMaHttp(await guiYeuCau(`/api/usage-history?user_id=${cacNguoiDung.readerB}`, "GET", undefined, dichVuToken.readerA), 403);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM LichSuSuDung WHERE user_id IN (?,?)", thamSo), truoc);
    });

    await chayKichBan("real nonempty statistics match SELECT and distinguish loan receipts from copy counts", async () => {
        const [ngay] = await cacDong("SELECT DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%d') AS today");
        const query = `start_date=${ngay.today}&end_date=${ngay.today}`;
        const tongQuan = xacNhanMaHttp(await guiYeuCau(`/api/statistics/overview?${query}`, "GET", undefined, dichVuToken.staff), 200);
        for (const [key, table] of [["books_total", "Sach"], ["copies_total", "BanSaoSach"], ["users_total", "NguoiDung"]]) assert.equal(tongQuan[key], await giaTriDon(`SELECT COUNT(*) FROM ${table}`));
        assert.equal(tongQuan.borrows_total, await giaTriDon("SELECT COUNT(*) FROM PhieuMuon WHERE status<>'cancelled'"));
        for (const group of ["day", "week", "month"]) {
            const series = xacNhanMaHttp(await guiYeuCau(`/api/statistics/borrows?${query}&group_by=${group}&user_id=${cacNguoiDung.readerA}`, "GET", undefined, dichVuToken.staff), 200);
            assert.equal(series.reduce((sum, row) => sum + row.borrow_count, 0), await giaTriDon("SELECT COUNT(*) FROM PhieuMuon WHERE user_id=? AND status<>'cancelled' AND DATE(borrow_date)=?", [cacNguoiDung.readerA, ngay.today]));
            assert.equal(series.reduce((sum, row) => sum + row.borrowed_copy_count, 0), await giaTriDon("SELECT COUNT(*) FROM ChiTietPhieuMuon d JOIN PhieuMuon p ON p.borrow_id=d.borrow_id WHERE p.user_id=? AND p.status<>'cancelled' AND DATE(p.borrow_date)=?", [cacNguoiDung.readerA, ngay.today]));
        }
        assert.equal((await cacDong("SELECT COUNT(*) AS total FROM ChiTietPhieuMuon WHERE borrow_id=?", [phieuMuonNhieuBanSao.borrow_id]))[0].total, "2");
        const [tanSuat] = xacNhanMaHttp(await guiYeuCau(`/api/statistics/users?${query}&user_id=${cacNguoiDung.readerA}`, "GET", undefined, dichVuToken.staff), 200);
        assert.equal(tanSuat.active_days, 1); assert.equal(tanSuat.login_count, 1);
        assert.equal(tanSuat.usage_event_count, await giaTriDon("SELECT COUNT(*) FROM LichSuSuDung WHERE user_id=? AND DATE(action_date)=?", [cacNguoiDung.readerA, ngay.today]));
        xacNhanMaHttp(await guiYeuCau("/api/statistics/users", "GET", undefined, dichVuToken.readerA), 403);
    });

    await chayKichBan("overdue SELECT detects an owned backdated test loan without updating its stored status", async () => {
        const [goc] = await cacDong("SELECT DATE_FORMAT(borrow_date,'%Y-%m-%d %H:%i:%s') AS borrow_date,DATE_FORMAT(due_date,'%Y-%m-%d %H:%i:%s') AS due_date FROM PhieuMuon WHERE borrow_id=? AND user_id=?", [phieuCanhTranh.borrow_id, phieuCanhTranh.user_id]);
        assert.ok(goc);
        try {
            await coSoDuLieu.execute("UPDATE PhieuMuon SET borrow_date=UTC_TIMESTAMP()-INTERVAL 5 DAY,due_date=UTC_TIMESTAMP()-INTERVAL 2 DAY WHERE borrow_id=? AND user_id=?", [phieuCanhTranh.borrow_id, phieuCanhTranh.user_id]);
            const data = xacNhanMaHttp(await guiYeuCau(`/api/borrows/${phieuCanhTranh.borrow_id}/overdue`, "GET", undefined, dichVuToken.staff), 200);
            assert.equal(data.is_overdue, true); assert.equal(data.overdue_count, 1);
            assert.equal((await cacDong("SELECT status FROM PhieuMuon WHERE borrow_id=?", [phieuCanhTranh.borrow_id]))[0].status, "borrowed");
        } finally { await coSoDuLieu.execute("UPDATE PhieuMuon SET borrow_date=?,due_date=? WHERE borrow_id=? AND user_id=?", [goc.borrow_date, goc.due_date, phieuCanhTranh.borrow_id, phieuCanhTranh.user_id]); }
    });

    await chayKichBan("fines fail closed without configured rates; no money or fine rows are invented", async () => {
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM QuyDinhPhat WHERE is_active=1"), 0);
        const [chiTiet] = await cacDong("SELECT borrow_detail_id FROM ChiTietPhieuMuon WHERE borrow_id=? ORDER BY borrow_detail_id LIMIT 1", [phieuMuonNhieuBanSao.borrow_id]);
        const body = { borrow_detail_id: String(chiTiet.borrow_detail_id), fine_rule_id: "18446744073709551615" };
        xacNhanMaHttp(await guiYeuCau("/api/fines", "POST", body, dichVuToken.staff), 404);
        xacNhanMaHttp(await guiYeuCau("/api/fines", "POST", body, dichVuToken.readerA), 403);
        xacNhanMaHttp(await guiYeuCau("/api/fines/18446744073709551615/payment", "PATCH", { payment_status: "paid" }, dichVuToken.staff), 404);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM Phat"), 0);
    });

    await chayKichBan("forecast reads return insufficient_data and generate stays closed without persisting forecasts", async () => {
        const data = xacNhanMaHttp(await guiYeuCau("/api/forecasts/me", "GET", undefined, dichVuToken.readerA), 200);
        assert.equal(data.status, "insufficient_data"); assert.deepEqual(data.predictions, []); assert.equal(data.persisted, false);
        xacNhanMaHttp(await guiYeuCau(`/api/forecasts/users/${cacNguoiDung.readerA}`, "GET", undefined, dichVuToken.staff), 200);
        xacNhanMaHttp(await guiYeuCau(`/api/forecasts/users/${cacNguoiDung.readerA}`, "GET", undefined, dichVuToken.readerA), 403);
        xacNhanMaHttp(await guiYeuCau(`/api/forecasts/users/${cacNguoiDung.readerA}/generate`, "POST", {}, dichVuToken.staff), 503);
        assert.equal(await giaTriDon("SELECT COUNT(*) FROM DuBaoTanSuat"), 0);
    });
    daChayXong = true;
});
