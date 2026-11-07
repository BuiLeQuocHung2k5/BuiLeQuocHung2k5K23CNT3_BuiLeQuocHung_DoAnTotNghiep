import { LoiHttp } from "./loi-http.js";

const MA_TOI_DA = 18446744073709551615n;
const CAC_TRUONG = new Set(["category_id", "series_id", "title", "author", "publisher", "description", "publication_year"]);

function baoDuLieuKhongHopLe(tenTruong, thongBao) {
    throw new LoiHttp(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", [{ field: tenTruong, message: thongBao }]);
}

// Giữ ID BIGINT dạng chuỗi để JavaScript không làm tròn mất chính xác.
export function kiemTraMa(giaTri, tenTruong = "id") {
    if (typeof giaTri === "number") {
        if (!Number.isSafeInteger(giaTri)) baoDuLieuKhongHopLe(tenTruong, "ID dạng số phải là số nguyên an toàn; dùng chuỗi cho ID lớn.");
        giaTri = String(giaTri);
    }
    if (typeof giaTri !== "string" || !/^[1-9]\d{0,19}$/.test(giaTri) || BigInt(giaTri) > MA_TOI_DA) {
        baoDuLieuKhongHopLe(tenTruong, "ID phải là số nguyên dương trong phạm vi BIGINT UNSIGNED.");
    }
    return giaTri;
}

function kiemTraChuoiGioiHan(giaTri, tenTruong, doDaiToiDa, batBuoc = false) {
    if (giaTri === undefined || giaTri === null) {
        if (batBuoc) baoDuLieuKhongHopLe(tenTruong, "Trường bắt buộc.");
        return null;
    }
    if (typeof giaTri !== "string" || !giaTri.isWellFormed()) baoDuLieuKhongHopLe(tenTruong, "Phải là chuỗi Unicode hợp lệ.");
    giaTri = giaTri.trim();
    if ((batBuoc && !giaTri) || [...giaTri].length > doDaiToiDa) {
        baoDuLieuKhongHopLe(tenTruong, `Độ dài ${batBuoc ? "từ 1 đến" : "tối đa"} ${doDaiToiDa} ký tự.`);
    }
    return giaTri;
}

export function kiemTraNoiDungSach(noiDung) {
    if (!noiDung || typeof noiDung !== "object" || Array.isArray(noiDung)) baoDuLieuKhongHopLe("body", "Phải là một JSON object.");
    for (const tenTruong of Object.keys(noiDung)) if (!CAC_TRUONG.has(tenTruong)) baoDuLieuKhongHopLe(tenTruong, "Trường không được phép ghi.");
    const duLieu = {
        title: kiemTraChuoiGioiHan(noiDung.title, "title", 255, true),
        author: kiemTraChuoiGioiHan(noiDung.author, "author", 150, true),
        publisher: kiemTraChuoiGioiHan(noiDung.publisher, "publisher", 150),
    };
    for (const tenTruong of ["category_id", "series_id"]) {
        duLieu[tenTruong] = noiDung[tenTruong] === undefined || noiDung[tenTruong] === null ? null : kiemTraMa(noiDung[tenTruong], tenTruong);
    }
    const moTa = noiDung.description;
    if (moTa !== undefined && moTa !== null &&
        (typeof moTa !== "string" || !moTa.isWellFormed() || Buffer.byteLength(moTa, "utf8") > 65535)) {
        baoDuLieuKhongHopLe("description", "Phải là chuỗi Unicode không vượt quá 65535 byte UTF-8.");
    }
    duLieu.description = moTa ?? null;
    const nam = noiDung.publication_year;
    if (nam !== undefined && nam !== null && (!Number.isInteger(nam) || nam < 0 || nam > 65535)) {
        baoDuLieuKhongHopLe("publication_year", "Phải là số nguyên từ 0 đến 65535 hoặc null (SMALLINT UNSIGNED).");
    }
    duLieu.publication_year = nam ?? null;
    return duLieu;
}

export function kiemTraTruyVanSach(truyVan) {
    for (const tenTruong of Object.keys(truyVan)) {
        if (!["page", "limit", "search"].includes(tenTruong)) baoDuLieuKhongHopLe(tenTruong, "Tham số không được hỗ trợ.");
    }
    function kiemTraSoNguyenDuong(giaTri, tenTruong, giaTriMacDinh, toiDa) {
        if (giaTri === undefined) return giaTriMacDinh;
        if (typeof giaTri !== "string" || !/^[1-9]\d*$/.test(giaTri) || !Number.isSafeInteger(Number(giaTri)) || Number(giaTri) > toiDa) {
            baoDuLieuKhongHopLe(tenTruong, `Phải là số nguyên dương không vượt quá ${toiDa}.`);
        }
        return Number(giaTri);
    }
    const trang = kiemTraSoNguyenDuong(truyVan.page, "page", 1, Number.MAX_SAFE_INTEGER);
    const gioiHan = kiemTraSoNguyenDuong(truyVan.limit, "limit", 10, 100);
    const viTriBatDau = (trang - 1) * gioiHan;
    if (!Number.isSafeInteger(viTriBatDau)) baoDuLieuKhongHopLe("page", "Vị trí phân trang vượt phạm vi cho phép.");
    const tuKhoa = kiemTraChuoiGioiHan(truyVan.search, "search", 255) ?? "";
    return { page: trang, limit: gioiHan, offset: viTriBatDau, search: tuKhoa };
}
