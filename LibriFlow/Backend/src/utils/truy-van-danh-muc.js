import { LoiHttp } from "./loi-http.js";

export async function thucHienGiaoDich(boKetNoi, congViec) {
    const ketNoi = await boKetNoi.getConnection();
    try {
        await ketNoi.beginTransaction();
        const ketQua = await congViec(ketNoi);
        await ketNoi.commit();
        return ketQua;
    } catch (loi) {
        try { await ketNoi.rollback(); } catch { /* Giữ nguyên lỗi ban đầu. */ }
        throw loi;
    } finally { ketNoi.release(); }
}

export async function truyVanPhanTrang(boKetNoi, sqlDem, sqlLayDanhSach, cacThamSo, truyVan, chuanHoa) {
    const [[cacSoDem], [cacDong]] = await Promise.all([
        boKetNoi.execute(sqlDem, cacThamSo),
        boKetNoi.query(sqlLayDanhSach, [...cacThamSo, truyVan.limit, truyVan.offset]),
    ]);
    const tongSo = Number(cacSoDem[0].total);
    if (!Number.isSafeInteger(tongSo)) throw new Error("Unsupported row count");
    return { items: cacDong.map(chuanHoa), total: tongSo };
}

export function taoMauTimKiem(tuKhoa) { return `%${tuKhoa.replace(/[=%_]/g, "=$&")}%`; }

export async function thucHienThaoTacDanhMuc(congViec, taiNguyen) {
    try { return await congViec(); }
    catch (loi) {
        if (loi.code === "ER_DUP_ENTRY") throw new LoiHttp(409, "DUPLICATE_VALUE", taiNguyen === "CATEGORY" ? "Tên danh mục đã tồn tại." : "Barcode hoặc ISBN đã tồn tại.");
        if (["ER_NO_REFERENCED_ROW", "ER_NO_REFERENCED_ROW_2"].includes(loi.code)) throw new LoiHttp(400, "INVALID_REFERENCE", "Sách được tham chiếu không tồn tại.");
        if (["ER_ROW_IS_REFERENCED", "ER_ROW_IS_REFERENCED_2"].includes(loi.code)) throw new LoiHttp(409, `${taiNguyen}_IN_USE`, "Bản ghi có dữ liệu liên quan nên không thể xóa.");
        throw loi;
    }
}
