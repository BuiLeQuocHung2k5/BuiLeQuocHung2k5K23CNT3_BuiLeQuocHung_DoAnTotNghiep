-- Select the intended existing database in the SQL client before execution.
-- No USE statement: do not redirect a test connection to the main database.
-- Requires the existing schema and admin/librarian roles from the seed.
START TRANSACTION;

INSERT IGNORE INTO QuyenHan (name, description)
VALUES ('category_manage', 'Quan ly danh muc sach');

INSERT IGNORE INTO VaiTro_QuyenHan (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM VaiTro r
CROSS JOIN QuyenHan p
WHERE r.name IN ('admin', 'librarian')
  AND p.name = 'category_manage';

COMMIT;
