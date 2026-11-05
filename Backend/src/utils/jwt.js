import jwt from "jsonwebtoken";
import { HttpError } from "./http-error.js";

const issuer = "libriflow-api";
const audience = "libriflow-client";
export const tokenLifetimeSeconds = 15 * 60;

export function createJwtService({ getSecret = () => process.env.JWT_SECRET } = {}) {
    function secret() {
        const value = getSecret();
        if (typeof value !== "string" || Buffer.byteLength(value.trim(), "utf8") < 32) {
            throw new HttpError(503, "JWT_NOT_CONFIGURED", "Xác thực chưa sẵn sàng: cấu hình JWT_SECRET ngẫu nhiên tối thiểu 32 byte trong môi trường server.");
        }
        return value;
    }
    return {
        assertConfigured() { secret(); },
        issue(userId) {
            return jwt.sign({}, secret(), { algorithm: "HS256", subject: String(userId), expiresIn: tokenLifetimeSeconds, issuer, audience });
        },
        verify(token) {
            const key = secret(); // Configuration failures stay 503, never become an auth bypass.
            let payload;
            try {
                payload = jwt.verify(token, key, { algorithms: ["HS256"], issuer, audience, maxAge: tokenLifetimeSeconds });
            } catch (error) {
                throw new HttpError(401, error.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN", "Bearer token không hợp lệ hoặc đã hết hạn.");
            }
            if (typeof payload !== "object" || typeof payload.sub !== "string" || !/^[1-9]\d{0,19}$/.test(payload.sub) ||
                BigInt(payload.sub) > 18446744073709551615n || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) ||
                payload.iat > Math.floor(Date.now() / 1000) || payload.exp <= payload.iat || payload.exp - payload.iat > tokenLifetimeSeconds) {
                throw new HttpError(401, "INVALID_TOKEN", "Bearer token không hợp lệ hoặc đã hết hạn.");
            }
            return payload.sub;
        },
    };
}
