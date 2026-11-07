import boKetNoi from "./config/co-so-du-lieu.js";
import { dungUngDung } from "./app-factory.js";

export function taoUngDung(cauHinhThayThe = {}) {
    return dungUngDung({ database: boKetNoi, ...cauHinhThayThe });
}

export default taoUngDung();
