import { napCauHinhKiemThu, moCoSoDuLieuKiemThu, tuChoi } from "./an-toan.mjs";

let coSoDuLieu;
try {
    const cauHinh = napCauHinhKiemThu();
    if (process.env.TEST_DB_SETUP_CONFIRM !== cauHinh.name) tuChoi("SETUP_CONFIRMATION_REQUIRED");
    coSoDuLieu = await moCoSoDuLieuKiemThu(cauHinh, { setup: true });
    await coSoDuLieu.chuanBi();
    console.log("Integration schema/seed prepared in the verified empty test database. Original SQL files unchanged.");
} catch (loi) {
    console.error(`TEST SETUP REFUSED/FAILED: ${/^[A-Z0-9_]+$/.test(loi.code ?? "") ? loi.code : "SAFETY_CHECK_FAILED"}. No database was created or dropped; inspect partial test setup if applicable.`);
    process.exitCode = 2;
} finally { if (coSoDuLieu) await coSoDuLieu.end(); }
