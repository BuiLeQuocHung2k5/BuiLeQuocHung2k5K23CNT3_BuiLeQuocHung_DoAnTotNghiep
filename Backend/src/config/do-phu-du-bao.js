import { readFile, stat } from "node:fs/promises";
import { MUC_TIEU_DU_BAO, laNgayUtcHopLe, dichNgayUtc } from "../utils/thuat-toan-du-bao.js";

// Xác nhận do người vận hành cung cấp; không suy độ phủ từ MIN/MAX ngày mượn, login hoặc client.
export function kiemTraXacNhanDoPhu(banGhi, nguCanh) {
    if (!nguCanh || !banGhi || typeof banGhi.database_name !== "string" || !banGhi.database_name.trim() || typeof banGhi.server_uuid !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(banGhi.server_uuid)) return null;
    const cacTruong = ["verified", "complete", "target", "timezone", "user_timestamps_timezone", "database_name", "server_uuid", "start_date", "end_date", "verified_at", "evidence_ref"];
    if (Object.keys(banGhi).some(khoa => !cacTruong.includes(khoa))) return null;
    if (banGhi.verified !== true || banGhi.complete !== true || banGhi.target !== MUC_TIEU_DU_BAO || banGhi.timezone !== "UTC" || banGhi.user_timestamps_timezone !== "UTC") return null;
    if (banGhi.database_name !== nguCanh.database_name || banGhi.server_uuid !== nguCanh.server_uuid) return null;
    if (typeof banGhi.evidence_ref !== "string" || !banGhi.evidence_ref.trim() || banGhi.evidence_ref.length > 200) return null;
    if (!laNgayUtcHopLe(banGhi.start_date) || !laNgayUtcHopLe(banGhi.end_date) || banGhi.start_date > banGhi.end_date) return null;
    if (typeof banGhi.verified_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(banGhi.verified_at)) return null;
    const mocXacMinh = Date.parse(banGhi.verified_at), mocQuanSat = Date.parse(nguCanh.observed_at);
    if (!Number.isFinite(mocXacMinh) || !Number.isFinite(mocQuanSat) || new Date(mocXacMinh).toISOString().replace(".000Z", "Z") !== banGhi.verified_at || mocXacMinh > mocQuanSat) return null;
    try { if (mocXacMinh < Date.parse(`${dichNgayUtc(banGhi.end_date, 1)}T00:00:00Z`)) return null; } catch { return null; }
    return Object.freeze({ verified: true, target: banGhi.target, timezone: "UTC", start_date: banGhi.start_date, end_date: banGhi.end_date });
}

export function taoBoCungCapDoPhu({ getPath: layDuongDan = () => process.env.FORECAST_COVERAGE_FILE, read: docTep = readFile, fileStat: docThongTinTep = stat } = {}) {
    return async nguCanh => {
        const duongDan = layDuongDan();
        if (typeof duongDan !== "string" || !duongDan.trim()) return null;
        try {
            const thongTin = await docThongTinTep(duongDan);
            if (!thongTin.isFile() || thongTin.size > 16384) return null;
            const duLieuTho = await docTep(duongDan, "utf8");
            if (Buffer.byteLength(duLieuTho, "utf8") > 16384) return null;
            return kiemTraXacNhanDoPhu(JSON.parse(duLieuTho), nguCanh);
        } catch { return null; } // Không đưa đường dẫn, nội dung tệp, định danh server hoặc bằng chứng riêng tư vào log/response.
    };
}
