import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const docTep = duongDan => readFileSync(new URL(duongDan, import.meta.url), "utf8");
const duLieuKhoiTao = docTep("../sql/seeds/initial-permissions.sql");
const banGoc = docTep("../sql/libriflow_database.sql");
const cauTruc = docTep("../sql/schema.sql");
const tepChuyenDoi = docTep("../sql/migrations/001_add_category_manage.sql").replace(/^--.*$/gm, "");

function layTenCacQuyen(cauSql) {
    const cacGiaTri = cauSql.match(/INSERT IGNORE INTO QuyenHan \(name, description\) VALUES([\s\S]*?);/)[1];
    return [...cacGiaTri.matchAll(/\('([^']+)'\s*,/g)].map(ketQuaKhop => ketQuaKhop[1]);
}

test("seed adds only category_manage, keeps all prior permissions and reader grants", () => {
    assert.deepEqual(layTenCacQuyen(duLieuKhoiTao), [...layTenCacQuyen(banGoc), "category_manage"]);
    const cacDongQuyen = cauSql => [...cauSql.matchAll(/INSERT IGNORE INTO VaiTro_QuyenHan[\s\S]*?;/g)].map(ketQuaKhop => ketQuaKhop[0]);
    const cacQuyenCu = cacDongQuyen(banGoc), cacQuyenMoi = cacDongQuyen(duLieuKhoiTao);
    assert.equal(cacQuyenMoi.length, cacQuyenCu.length);
    assert.equal(cacQuyenMoi[0], cacQuyenCu[0]); // Admin vẫn nhận mọi quyền qua CROSS JOIN.
    assert.equal(cacQuyenMoi[1].replace(",'category_manage'", ""), cacQuyenCu[1]);
    assert.equal(cacQuyenMoi[2], cacQuyenCu[2]); // Reader vẫn chỉ có book_view.
});

test("migration static contract: additive idempotent inserts and natural-key lookup, no DDL or fixed IDs", () => {
    const cacCauLenh = tepChuyenDoi.split(";").map(giaTri => giaTri.trim()).filter(Boolean);
    assert.equal(cacCauLenh.length, 4);
    assert.equal(cacCauLenh[0], "START TRANSACTION");assert.equal(cacCauLenh[3], "COMMIT");
    assert.match(cacCauLenh[1], /^INSERT IGNORE INTO QuyenHan \(name, description\)\s+VALUES \('category_manage', 'Quan ly danh muc sach'\)$/);
    assert.match(cacCauLenh[2], /^INSERT IGNORE INTO VaiTro_QuyenHan \(role_id, permission_id\)\s+SELECT r.role_id, p.permission_id/);
    assert.match(cacCauLenh[2], /WHERE r.name IN \('admin', 'librarian'\)\s+AND p.name = 'category_manage'$/);
    assert.ok(!/\b(?:ALTER|DROP|DELETE|UPDATE|TRUNCATE|CREATE|USE|reader)\b/i.test(tepChuyenDoi));
    assert.ok(!/\b\d+\b/.test(tepChuyenDoi));
    assert.match(cauTruc, /CREATE TABLE IF NOT EXISTS QuyenHan \([\s\S]*?name VARCHAR\(100\) NOT NULL UNIQUE/);
    assert.match(cauTruc, /CREATE TABLE IF NOT EXISTS VaiTro \([\s\S]*?name VARCHAR\(50\) NOT NULL UNIQUE/);
    assert.match(cauTruc, /CREATE TABLE IF NOT EXISTS VaiTro_QuyenHan \([\s\S]*?PRIMARY KEY \(role_id, permission_id\)/);
    // UNIQUE(name) và khóa chính ghép chặn dữ liệu trùng khi chạy lại INSERT IGNORE.
    // Chỉ kiểm tra tĩnh; chưa thực thi hoặc kết luận đã kiểm chứng tính lặp an toàn trên MySQL.
});
