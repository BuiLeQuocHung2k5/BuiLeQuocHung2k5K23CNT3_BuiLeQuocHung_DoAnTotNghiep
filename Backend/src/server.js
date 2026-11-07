import ungDung from "./app.js";
import boKetNoi, { kiemTraKetNoiCoSoDuLieu, taoThongBaoLoiCoSoDuLieu } from "./config/co-so-du-lieu.js";

const CONG_API = process.env.PORT || 3000;

try {
    await kiemTraKetNoiCoSoDuLieu();
    console.log("MySQL connected successfully");
    const mayChu = ungDung.listen(CONG_API, "127.0.0.1", () => {
        console.log(`LibriFlow API running at http://localhost:${CONG_API}`);
    });
    mayChu.on("error", async (loi) => {
        console.error(`API startup failed (${loi.code || "UNKNOWN"}).`);
        await boKetNoi.end();
        process.exitCode = 1;
    });
} catch (loi) {
    console.error(taoThongBaoLoiCoSoDuLieu(loi));
    await boKetNoi.end();
    process.exitCode = 1;
}
