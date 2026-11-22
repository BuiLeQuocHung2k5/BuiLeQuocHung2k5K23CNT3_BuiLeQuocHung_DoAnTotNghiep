import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, unlink } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";
import { LoiHttp } from "./loi-http.js";

export const GIOI_HAN_AVATAR = 2 * 1024 * 1024;
export const MIME_AVATAR = ["image/jpeg", "image/png", "image/webp"];
const TIEN_TO = "/api/auth/avatars/";
const MA_TEP = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const CHU_KY_PNG = Buffer.from("89504e470d0a1a0a", "hex");

function kichThuocHopLe(rong, cao) {
    return rong > 0 && cao > 0 && rong <= 4096 && cao <= 4096;
}

function laPng(anh) {
    if (anh.length < 45 || !anh.subarray(0, 8).equals(CHU_KY_PNG)) return false;
    let coDuLieu = false;
    for (let viTri = 8; viTri + 12 <= anh.length;) {
        const doDai = anh.readUInt32BE(viTri);
        const ketThuc = viTri + 12 + doDai;
        if (ketThuc > anh.length) return false;
        const loai = anh.toString("ascii", viTri + 4, viTri + 8);
        if (anh.readUInt32BE(ketThuc - 4) !== crc32(anh.subarray(viTri + 4, ketThuc - 4))) return false;
        if (viTri === 8) {
            if (loai !== "IHDR" || doDai !== 13 || !kichThuocHopLe(anh.readUInt32BE(16), anh.readUInt32BE(20))) return false;
            const doSau = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
            if (!doSau[anh[25]]?.includes(anh[24]) || anh[26] || anh[27] || anh[28] > 1) return false;
        } else if (loai === "IHDR") return false;
        if (loai === "IDAT" && doDai > 0) coDuLieu = true;
        if (loai === "IEND") return doDai === 0 && coDuLieu && ketThuc === anh.length;
        viTri = ketThuc;
    }
    return false;
}

function laJpeg(anh) {
    if (anh.length < 4 || anh[0] !== 0xff || anh[1] !== 0xd8) return false;
    let coKhung = false, coScan = false, dangScan = false;
    for (let viTri = 2; viTri < anh.length;) {
        if (dangScan) {
            viTri = anh.indexOf(0xff, viTri);
            if (viTri === -1) return false;
        }
        if (anh[viTri++] !== 0xff) return false;
        while (anh[viTri] === 0xff) viTri++;
        const marker = anh[viTri++];
        if (dangScan && (marker === 0 || (marker >= 0xd0 && marker <= 0xd7))) continue;
        dangScan = false;
        if (marker === 0xd9) return coKhung && coScan && viTri === anh.length;
        if (marker < 0xc0 || marker === undefined || (marker >= 0xd0 && marker <= 0xd8) || viTri + 2 > anh.length) return false;
        const doDai = anh.readUInt16BE(viTri);
        if (doDai < 2 || viTri + doDai > anh.length) return false;
        if ([0xc0, 0xc1, 0xc2].includes(marker)) {
            if (coKhung || doDai < 11 || anh[viTri + 2] !== 8 || !kichThuocHopLe(anh.readUInt16BE(viTri + 5), anh.readUInt16BE(viTri + 3))) return false;
            const soKenh = anh[viTri + 7];
            if (soKenh < 1 || soKenh > 4 || doDai !== 8 + 3 * soKenh) return false;
            coKhung = true;
        } else if (marker === 0xda) {
            if (!coKhung || doDai < 8 || doDai !== 6 + 2 * anh[viTri + 2]) return false;
            coScan = dangScan = true;
        }
        viTri += doDai;
    }
    return false;
}

function laWebp(anh) {
    if (anh.length < 26 || anh.toString("ascii", 0, 4) !== "RIFF" || anh.toString("ascii", 8, 12) !== "WEBP" || anh.readUInt32LE(4) + 8 !== anh.length) return false;
    let coKhung = false;
    for (let viTri = 12; viTri < anh.length;) {
        if (viTri + 8 > anh.length) return false;
        const loai = anh.toString("ascii", viTri, viTri + 4);
        const doDai = anh.readUInt32LE(viTri + 4);
        const dau = viTri + 8;
        const cuoi = dau + doDai + (doDai % 2);
        if (cuoi > anh.length) return false;
        if (loai === "VP8X") {
            if (viTri !== 12 || doDai !== 10 || (anh[dau] & 2) || !kichThuocHopLe(anh.readUIntLE(dau + 4, 3) + 1, anh.readUIntLE(dau + 7, 3) + 1)) return false;
        } else if (loai === "VP8 ") {
            if (coKhung || doDai <= 10 || (anh[dau] & 1) || anh.readUIntBE(dau + 3, 3) !== 0x9d012a
                || !kichThuocHopLe(anh.readUInt16LE(dau + 6) & 0x3fff, anh.readUInt16LE(dau + 8) & 0x3fff)) return false;
            coKhung = true;
        } else if (loai === "VP8L") {
            if (coKhung || doDai <= 5 || anh[dau] !== 0x2f) return false;
            const bit = anh.readUInt32LE(dau + 1);
            if (bit >>> 29 || !kichThuocHopLe((bit & 0x3fff) + 1, ((bit >>> 14) & 0x3fff) + 1)) return false;
            coKhung = true;
        }
        viTri = cuoi;
    }
    return coKhung;
}

export function kiemTraAnhDaiDien(duLieu, mime) {
    if (!MIME_AVATAR.includes(mime)) throw new LoiHttp(415, "UNSUPPORTED_MEDIA_TYPE", "Chọn ảnh JPEG, PNG hoặc WebP.");
    if (Buffer.isBuffer(duLieu) && duLieu.length > GIOI_HAN_AVATAR) throw new LoiHttp(413, "AVATAR_TOO_LARGE", "Ảnh đại diện tối đa 2 MB.");
    const [duoi, kiemTra] = {
        "image/jpeg": ["jpg", laJpeg], "image/png": ["png", laPng], "image/webp": ["webp", laWebp],
    }[mime];
    if (!Buffer.isBuffer(duLieu) || !kiemTra(duLieu)) {
        throw new LoiHttp(400, "INVALID_AVATAR", "Ảnh không hợp lệ. Chọn JPEG, PNG hoặc WebP tĩnh, tối đa 4096 × 4096 pixel.");
    }
    return duoi;
}

export function taoKhoAnhDaiDien(thuMuc = process.env.LIBRIFLOW_AVATAR_DIR || fileURLToPath(new URL(
    process.env.LIBRIFLOW_DEMO_UTC === "1" ? "../../.demo-local/avatars/" : "../../uploads/avatars/", import.meta.url,
))) {
    if (!isAbsolute(thuMuc)) throw new Error("Avatar storage directory must be absolute.");
    function tenTuUrl(url) {
        const ten = typeof url === "string" && url.startsWith(TIEN_TO) ? url.slice(TIEN_TO.length) : "";
        return MA_TEP.test(ten) ? ten : null;
    }
    async function kiemTraThuMuc() {
        if (!(await lstat(thuMuc)).isDirectory()) throw new Error("Avatar storage is not a directory.");
    }
    return {
        async luu(duLieu, mime) {
            const duoi = kiemTraAnhDaiDien(duLieu, mime);
            await mkdir(thuMuc, { recursive: true, mode: 0o700 });
            await kiemTraThuMuc();
            const ten = `${randomUUID()}.${duoi}`;
            const duongDan = join(thuMuc, ten);
            const tep = await open(duongDan, "wx", 0o600);
            try {
                await tep.writeFile(duLieu);
                await tep.close();
            } catch (loi) {
                await tep.close().catch(() => {});
                await unlink(duongDan).catch(() => {});
                throw loi;
            }
            return TIEN_TO + ten;
        },
        async xoa(url) {
            const ten = tenTuUrl(url);
            if (ten) {
                await kiemTraThuMuc();
                await unlink(join(thuMuc, ten));
            }
        },
        async lay(ten) {
            if (MA_TEP.test(ten)) {
                try {
                    await kiemTraThuMuc();
                    const duongDan = join(thuMuc, ten);
                    if ((await lstat(duongDan)).isFile()) return duongDan;
                } catch (loi) { if (loi.code !== "ENOENT") throw loi; }
            }
            throw new LoiHttp(404, "AVATAR_NOT_FOUND", "Không tìm thấy ảnh đại diện.");
        },
    };
}
