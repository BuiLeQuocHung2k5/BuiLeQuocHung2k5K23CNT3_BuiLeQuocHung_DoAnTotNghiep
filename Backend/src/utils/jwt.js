import jwt from "jsonwebtoken";
import { LoiHttp } from "./loi-http.js";

const BEN_PHAT_HANH = "libriflow-api";
const DOI_TUONG_TOKEN = "libriflow-client";
export const THOI_HAN_TOKEN_GIAY = 15 * 60;

export function taoDichVuJwt({ getSecret: layKhoaTuCauHinh = () => process.env.JWT_SECRET } = {}) {
    function layKhoaBiMat() {
        const giaTri = layKhoaTuCauHinh();
        if (typeof giaTri !== "string" || Buffer.byteLength(giaTri.trim(), "utf8") < 32) {
            throw new LoiHttp(503, "JWT_NOT_CONFIGURED", "Xác thực chưa sẵn sàng: cấu hình JWT_SECRET ngẫu nhiên tối thiểu 32 byte trong môi trường server.");
        }
        return giaTri;
    }
    return {
        kiemTraDaCauHinh() { layKhoaBiMat(); },
        phatHanhToken(maNguoiDung) {
            return jwt.sign({}, layKhoaBiMat(), { algorithm: "HS256", subject: String(maNguoiDung), expiresIn: THOI_HAN_TOKEN_GIAY, issuer: BEN_PHAT_HANH, audience: DOI_TUONG_TOKEN });
        },
        xacMinhToken(tokenTruyCapMau) {
            const khoa = layKhoaBiMat(); // Lỗi cấu hình vẫn trả 503, không trở thành đường bỏ qua xác thực.
            let noiDungToken;
            try {
                noiDungToken = jwt.verify(tokenTruyCapMau, khoa, { algorithms: ["HS256"], issuer: BEN_PHAT_HANH, audience: DOI_TUONG_TOKEN, maxAge: THOI_HAN_TOKEN_GIAY });
            } catch (loi) {
                throw new LoiHttp(401, loi.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN", "Bearer token không hợp lệ hoặc đã hết hạn.");
            }
            if (typeof noiDungToken !== "object" || typeof noiDungToken.sub !== "string" || !/^[1-9]\d{0,19}$/.test(noiDungToken.sub) ||
                BigInt(noiDungToken.sub) > 18446744073709551615n || !Number.isInteger(noiDungToken.iat) || !Number.isInteger(noiDungToken.exp) ||
                noiDungToken.iat > Math.floor(Date.now() / 1000) || noiDungToken.exp <= noiDungToken.iat || noiDungToken.exp - noiDungToken.iat > THOI_HAN_TOKEN_GIAY) {
                throw new LoiHttp(401, "INVALID_TOKEN", "Bearer token không hợp lệ hoặc đã hết hạn.");
            }
            return noiDungToken.sub;
        },
    };
}
