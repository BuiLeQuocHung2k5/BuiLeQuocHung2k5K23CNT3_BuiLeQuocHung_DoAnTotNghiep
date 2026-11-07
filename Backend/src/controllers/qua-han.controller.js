import { kiemTraMa } from "../utils/kiem-tra-sach.js";
import { baoDuLieuKhongHopLe } from "../utils/kiem-tra-danh-muc-ban-sao.js";
import { kiemTraTruyVanTienPhat, xacDinhPhamViDocTienPhat } from "../utils/kiem-tra-tien-phat.js";

export function taoBoDieuKhienQuaHan(dichVu) {
    return {
        async lietKe(req, res) { const ketQua = await dichVu.lietKe(kiemTraTruyVanTienPhat(req.query, xacDinhPhamViDocTienPhat(req.auth, "borrow_manage"))); res.json({ success: true, data: ketQua.items, pagination: ketQua.pagination, as_of: ketQua.as_of }); },
        async layTheoPhieuMuon(req, res) {
            const phamVi = xacDinhPhamViDocTienPhat(req.auth, "borrow_manage");
            if (Object.keys(req.query).length) baoDuLieuKhongHopLe("query", "Endpoint này không nhận query; phạm vi đọc lấy từ JWT.");
            res.json({ success: true, data: await dichVu.layTheoPhieuMuon(kiemTraMa(req.params.id), phamVi) });
        },
    };
}
