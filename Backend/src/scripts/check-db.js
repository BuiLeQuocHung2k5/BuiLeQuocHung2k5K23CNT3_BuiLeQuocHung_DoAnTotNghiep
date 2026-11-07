import boKetNoi, { kiemTraKetNoiCoSoDuLieu, taoThongBaoLoiCoSoDuLieu } from "../config/co-so-du-lieu.js";

try {
    await kiemTraKetNoiCoSoDuLieu();
    console.log("MySQL connected successfully");
} catch (loi) {
    console.error(taoThongBaoLoiCoSoDuLieu(loi));
    process.exitCode = 1;
} finally {
    await boKetNoi.end();
}
