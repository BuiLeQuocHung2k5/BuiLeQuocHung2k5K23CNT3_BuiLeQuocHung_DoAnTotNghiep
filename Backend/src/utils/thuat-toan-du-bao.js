export const PHIEN_BAN_MO_HINH_DU_BAO = "borrow_daily_sma7_v1";
export const MUC_TIEU_DU_BAO = "borrow_receipts_per_user_per_day";
export const SO_NGAY_LICH_SU_DU_BAO = 28;
const SO_MILI_GIAY_MOI_NGAY = 86400000;

export function laNgayUtcHopLe(giaTri) {
    if (typeof giaTri !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(giaTri) || giaTri < "1000-01-01") return false;
    const miliGiay = Date.parse(`${giaTri}T00:00:00Z`);
    return Number.isFinite(miliGiay) && new Date(miliGiay).toISOString().slice(0, 10) === giaTri;
}
export function dichNgayUtc(ngay, viTriBatDau) {
    if (!laNgayUtcHopLe(ngay) || !Number.isInteger(viTriBatDau)) throw new Error("Invalid UTC day");
    const next = new Date(Date.parse(`${ngay}T00:00:00Z`) + viTriBatDau * SO_MILI_GIAY_MOI_NGAY).toISOString().slice(0, 10);
    if (!laNgayUtcHopLe(next)) throw new Error("UTC day out of range");
    return next;
}
function taoKetQuaThieuDuLieu(lyDo, boSung = {}) {
    return { status: "insufficient_data", reason: lyDo, model_version: PHIEN_BAN_MO_HINH_DU_BAO, target: MUC_TIEU_DU_BAO, timezone: "UTC", horizon_days: 7, predictions: [], evaluation: { status: "insufficient_data", sample_count: 0, mae: null, folds: [] }, ...boSung };
}
function dinhDangSoThapPhan(phanTramGiaTri) { return `${phanTramGiaTri / 100n}.${String(phanTramGiaTri % 100n).padStart(2, "0")}`; }
function tinhTrungBinhPhanTram(cacGiaTri) { return (cacGiaTri.reduce((tong, giaTri) => tong + BigInt(giaTri), 0n) * 100n + 3n) / 7n; }
function laSoDemHopLe(giaTri) { return typeof giaTri === "number" && Number.isSafeInteger(giaTri) && giaTri >= 0 && giaTri <= 9999999999; }

// Chuỗi đếm có thể thiếu ngày; chỉ độ phủ đã xác minh mới cho phép quy ngày vắng thành 0.
export function duBaoLuotMuonTheoNgay({ cutoff_date: ngayCatDuLieu, user_created_at: ngayTaoNguoiDung, user_status: trangThaiNguoiDung, rows: cacDong, coverage: doPhu }) {
    if (!laNgayUtcHopLe(ngayCatDuLieu)) return taoKetQuaThieuDuLieu("INVALID_CUTOFF");
    if (trangThaiNguoiDung !== "active") return taoKetQuaThieuDuLieu("USER_INACTIVE");
    if (!doPhu || doPhu.verified !== true || doPhu.timezone !== "UTC" || doPhu.target !== MUC_TIEU_DU_BAO || !laNgayUtcHopLe(doPhu.start_date) || !laNgayUtcHopLe(doPhu.end_date) || doPhu.start_date > doPhu.end_date) return taoKetQuaThieuDuLieu("COVERAGE_UNVERIFIED");
    const ketQuaTao = typeof ngayTaoNguoiDung === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ngayTaoNguoiDung) ? Date.parse(ngayTaoNguoiDung.replace(" ", "T") + "Z") : NaN;
    if (!Number.isFinite(ketQuaTao) || new Date(ketQuaTao).toISOString().slice(0, 19).replace("T", " ") !== ngayTaoNguoiDung) return taoKetQuaThieuDuLieu("INVALID_USER_CREATION_DATE");
    try {
        const ngayCuoi = dichNgayUtc(ngayCatDuLieu, -1), ngayBatDauTrain = dichNgayUtc(ngayCatDuLieu, -7), ngayBatDauLichSu = dichNgayUtc(ngayCatDuLieu, -SO_NGAY_LICH_SU_DU_BAO);
        const ngayDayDuDauTien = ngayTaoNguoiDung.endsWith("00:00:00") ? ngayTaoNguoiDung.slice(0, 10) : dichNgayUtc(ngayTaoNguoiDung.slice(0, 10), 1);
        const dau = [ngayBatDauTrain, ngayDayDuDauTien, doPhu.start_date].sort().at(-1);
        const cuoi = [ngayCuoi, doPhu.end_date].sort()[0];
        const observed_days = Math.max(0, (Date.parse(cuoi)-Date.parse(dau))/86400000 + 1);
        if (doPhu.end_date < ngayCuoi || doPhu.start_date > ngayBatDauTrain) return taoKetQuaThieuDuLieu("INCOMPLETE_COVERAGE", {observed_days});
        if (ngayDayDuDauTien > ngayBatDauTrain) return taoKetQuaThieuDuLieu("USER_HISTORY_TOO_SHORT", {observed_days});
        if (!Array.isArray(cacDong) || cacDong.length > SO_NGAY_LICH_SU_DU_BAO) return taoKetQuaThieuDuLieu("INVALID_HISTORY");
        const cacSoDem = new Map();
        for (const dongDuLieu of cacDong) {
            if (!dongDuLieu || !laNgayUtcHopLe(dongDuLieu.day) || dongDuLieu.day < ngayBatDauLichSu || dongDuLieu.day >= ngayCatDuLieu || cacSoDem.has(dongDuLieu.day) || !laSoDemHopLe(dongDuLieu.borrow_count) || dongDuLieu.day < ngayTaoNguoiDung.slice(0, 10)) return taoKetQuaThieuDuLieu("INVALID_HISTORY");
            cacSoDem.set(dongDuLieu.day, dongDuLieu.borrow_count);
        }
        const batDau = [ngayBatDauLichSu, doPhu.start_date, ngayDayDuDauTien].sort().at(-1), chuoiDuLieu = [];
        for (let ngay = batDau; ngay < ngayCatDuLieu; ngay = dichNgayUtc(ngay, 1)) chuoiDuLieu.push({ day: ngay, count: cacSoDem.get(ngay) ?? 0 });
        const tapHuanLuyenCuoi = chuoiDuLieu.slice(-7), duBaoPhanTram = tinhTrungBinhPhanTram(tapHuanLuyenCuoi.map(diemDuLieu => diemDuLieu.count));
        // Bỏ hôm nay chưa kết thúc; bảy ngày dự báo bắt đầu từ ngày mai đến hôm nay + 7.
        const cacDuBao = Array.from({ length: 7 }, (_, chiSo) => ({ forecast_date: dichNgayUtc(ngayCatDuLieu, chiSo + 1), predicted_count: dinhDangSoThapPhan(duBaoPhanTram) }));
        const cacDotDanhGia = []; let tongSaiSoBayPhan = 0n, soMau = 0;
        // Khớp API: bảy ngày train đã kết thúc, bỏ một ngày origin rồi đánh giá bảy ngày tiếp theo.
        for (let viTriBatDauTest = chuoiDuLieu.length - 7; viTriBatDauTest >= 8; viTriBatDauTest -= 7) {
            const tapHuanLuyen = chuoiDuLieu.slice(viTriBatDauTest - 8, viTriBatDauTest - 1), tapKiemTra = chuoiDuLieu.slice(viTriBatDauTest, viTriBatDauTest + 7), tongBayNgay = tapHuanLuyen.reduce((tong, diem) => tong + BigInt(diem.count), 0n);
            let saiSoDot = 0n;
            for (const diemDuLieu of tapKiemTra) { const chenhLech = tongBayNgay - BigInt(diemDuLieu.count) * 7n; saiSoDot += chenhLech < 0n ? -chenhLech : chenhLech; }
            tongSaiSoBayPhan += saiSoDot; soMau += tapKiemTra.length;
            cacDotDanhGia.unshift({ train_start: tapHuanLuyen[0].day, train_end: tapHuanLuyen.at(-1).day, excluded_origin_date: chuoiDuLieu[viTriBatDauTest - 1].day, test_start: tapKiemTra[0].day, test_end: tapKiemTra.at(-1).day, sample_count: tapKiemTra.length, mae: Number((Number(saiSoDot) / (7 * tapKiemTra.length)).toFixed(6)) });
        }
        return {
            status: "ready", model_version: PHIEN_BAN_MO_HINH_DU_BAO, target: MUC_TIEU_DU_BAO, timezone: "UTC", horizon_days: 7,
            history: tapHuanLuyenCuoi,
            training: { start_date: tapHuanLuyenCuoi[0].day, end_date: ngayCuoi, observed_days: 7, borrow_count: tapHuanLuyenCuoi.reduce((tong, diemDuLieu) => tong + diemDuLieu.count, 0) },
            coverage: { status: "verified", start_date: doPhu.start_date, end_date: doPhu.end_date }, predictions: cacDuBao,
            evaluation: soMau ? { status: "evaluated", method: "rolling_origin_7_day_blocks_gap1", sample_count: soMau, mae: Number((Number(tongSaiSoBayPhan) / (7 * soMau)).toFixed(6)), folds: cacDotDanhGia } : { status: "insufficient_data", reason: "NEED_15_COVERED_DAYS", sample_count: 0, mae: null, folds: [] },
        };
    } catch { return taoKetQuaThieuDuLieu("INVALID_HISTORY"); }
}
