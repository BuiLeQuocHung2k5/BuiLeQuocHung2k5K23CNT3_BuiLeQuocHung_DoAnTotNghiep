import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { HttpError } from "../utils/http-error.js";
import { tokenLifetimeSeconds } from "../utils/jwt.js";

let dummyHash;
function getDummyHash() {
    dummyHash ??= bcrypt.hash(randomBytes(32).toString("hex"), 12);
    return dummyHash;
}

// Explicit allowlist prevents password/hash from reaching any auth response.
function publicUser(user) {
    const { user_id, name, email, phone, avatar, status, created_at, updated_at, roles, permissions } = user;
    return { user_id: String(user_id), name, email, phone, avatar, status, created_at, updated_at, roles, permissions };
}

export function createAuthService(model, tokens) {
    return {
        async register(data) {
            tokens.assertConfigured(); // Fail before hashing or attempting a database write.
            const { password, ...profile } = data;
            const hash = await bcrypt.hash(password, 12);
            return publicUser(await model.registerReader(profile, hash));
        },
        async login(data) {
            tokens.assertConfigured();
            const credentials = await model.findCredentials(data.email);
            const hash = credentials?.password;
            const supportedHash = typeof hash === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
            let valid = false;
            try { valid = await bcrypt.compare(data.password, supportedHash ? hash : await getDummyHash()); } catch { /* Malformed/unsupported stored hashes never authenticate. */ }
            if (!credentials || !supportedHash || !valid) throw new HttpError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
            if (credentials.status !== "active") throw new HttpError(403, "ACCOUNT_INACTIVE", "Tài khoản không còn hoạt động.");
            return { accessToken: tokens.issue(credentials.user_id), tokenType: "Bearer", expiresIn: tokenLifetimeSeconds };
        },
        async principal(id) {
            const user = await model.getPrincipal(id);
            if (!user) throw new HttpError(401, "INVALID_TOKEN", "Tài khoản của token không còn tồn tại.");
            if (user.status !== "active") throw new HttpError(403, "ACCOUNT_INACTIVE", "Tài khoản không còn hoạt động.");
            return publicUser(user);
        },
    };
}
