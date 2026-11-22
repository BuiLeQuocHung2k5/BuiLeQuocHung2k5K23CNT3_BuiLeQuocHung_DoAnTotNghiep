import { LoiHttp } from "../utils/loi-http.js";

// Tên cột lấy từ schema.sql; giá trị luôn truyền bằng tham số SQL.
const CAC_COT = "book_id, category_id, series_id, isbn, title, author, publisher, description, publication_year, created_at, updated_at";
const CAC_COT_DUOC_GHI = ["category_id", "series_id", "isbn", "title", "author", "publisher", "description", "publication_year"];

function chuanHoaBanGhi(dongDuLieu) {
    if (!dongDuLieu) return null;
    const sach = { ...dongDuLieu, book_id: String(dongDuLieu.book_id) };
    for (const khoa of ["category_id", "series_id"]) sach[khoa] = dongDuLieu[khoa] === null ? null : String(dongDuLieu[khoa]);
    return sach;
}

export function taoMoHinhSach(boKetNoi) {
    async function layTheoMa(ma, ketNoi = boKetNoi, canKhoa = false) {
        const [cacDong] = await ketNoi.execute(`SELECT ${CAC_COT} FROM Sach WHERE book_id = ?${canKhoa ? " FOR UPDATE" : ""}`, [ma]);
        return chuanHoaBanGhi(cacDong[0]);
    }

    async function thucHienGiaoDich(congViec) {
        const ketNoi = await boKetNoi.getConnection();
        try {
            await ketNoi.beginTransaction();
            const ketQua = await congViec(ketNoi);
            await ketNoi.commit();
            return ketQua;
        } catch (loi) {
            try { await ketNoi.rollback(); } catch { /* Giữ nguyên lỗi ban đầu. */ }
            if (loi.code === "ER_DUP_ENTRY") throw new LoiHttp(409, "DUPLICATE_ISBN", "ISBN này đã thuộc về một đầu sách.", [{ field: "isbn", message: "ISBN đã tồn tại." }]);
            throw loi;
        } finally {
            ketNoi.release();
        }
    }

    return {
        layTheoMa: layTheoMa,
        async lietKe({ limit: gioiHan, offset: viTriBatDau, search: tuKhoa }) {
            const dieuKienLoc = tuKhoa ? " WHERE (title LIKE ? ESCAPE '=' OR author LIKE ? ESCAPE '=' OR publisher LIKE ? ESCAPE '=')" : "";
            // Tìm chuỗi con theo nghĩa đen, kể cả các ký tự %, _ và =.
            const mauTimKiem = `%${tuKhoa.replace(/[=%_]/g, "=$&")}%`;
            const cacThamSo = tuKhoa ? [mauTimKiem, mauTimKiem, mauTimKiem] : [];
            const [[cacSoDem], [cacDong]] = await Promise.all([
                boKetNoi.execute(`SELECT COUNT(*) AS total FROM Sach${dieuKienLoc}`, cacThamSo),
                // mysql2 định dạng an toàn các tham số LIMIT/OFFSET dạng số.
                boKetNoi.query(`SELECT ${CAC_COT} FROM Sach${dieuKienLoc} ORDER BY book_id DESC LIMIT ? OFFSET ?`, [...cacThamSo, gioiHan, viTriBatDau]),
            ]);
            const tongSo = Number(cacSoDem[0].total);
            if (!Number.isSafeInteger(tongSo)) throw new Error("Unsupported row count");
            return { books: cacDong.map(chuanHoaBanGhi), total: tongSo };
        },
        async taoMoi(duLieu) {
            return thucHienGiaoDich(async (ketNoi) => {
                const [ketQua] = await ketNoi.execute(
                    `INSERT INTO Sach (${CAC_COT_DUOC_GHI.join(", ")}) VALUES (${CAC_COT_DUOC_GHI.map(() => "?").join(", ")})`,
                    CAC_COT_DUOC_GHI.map((khoa) => duLieu[khoa]),
                );
                return layTheoMa(String(ketQua.insertId), ketNoi);
            });
        },
        async thayThe(ma, duLieu) {
            return thucHienGiaoDich(async (ketNoi) => {
                if (!await layTheoMa(ma, ketNoi, true)) return null;
                await ketNoi.execute(`UPDATE Sach SET ${CAC_COT_DUOC_GHI.map((khoa) => `${khoa} = ?`).join(", ")} WHERE book_id = ?`,
                    [...CAC_COT_DUOC_GHI.map((khoa) => duLieu[khoa]), ma]);
                return layTheoMa(ma, ketNoi);
            });
        },
        async xoa(ma) {
            return thucHienGiaoDich(async (ketNoi) => {
                if (!await layTheoMa(ma, ketNoi, true)) return "missing";
                const [cacBanSao] = await ketNoi.execute("SELECT copy_id FROM BanSaoSach WHERE book_id = ? LIMIT 1", [ma]);
                if (cacBanSao.length) return "referenced";
                // Ràng buộc RESTRICT là lớp bảo vệ cuối khi có thay đổi khóa ngoại đồng thời.
                await ketNoi.execute("DELETE FROM Sach WHERE book_id = ?", [ma]);
                return "deleted";
            });
        },
    };
}
