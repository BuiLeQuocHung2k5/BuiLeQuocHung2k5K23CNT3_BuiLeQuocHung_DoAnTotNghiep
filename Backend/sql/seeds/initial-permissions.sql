USE libriflow;

INSERT IGNORE INTO VaiTro (name, description) VALUES
('admin','Quan tri vien he thong'),
('librarian','Thu thu'),
('reader','Ban doc');

INSERT IGNORE INTO QuyenHan (name, description) VALUES
('book_view','Xem thong tin sach'),
('book_create','Them sach'),
('book_update','Sua thong tin sach'),
('book_delete','Xoa dau sach'),
('copy_manage','Quan ly ban sao sach'),
('borrow_manage','Quan ly phieu muon'),
('return_process','Xu ly tra sach'),
('fine_manage','Quan ly tien phat'),
('user_manage','Quan ly nguoi dung'),
('report_view','Xem bao cao'),
('forecast_view','Xem du bao tan suat'),
('category_manage','Quan ly danh muc sach');

INSERT IGNORE INTO VaiTro_QuyenHan (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM VaiTro r CROSS JOIN QuyenHan p WHERE r.name='admin';

INSERT IGNORE INTO VaiTro_QuyenHan (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM VaiTro r JOIN QuyenHan p
ON p.name IN ('book_view','book_create','book_update','copy_manage','borrow_manage','return_process','fine_manage','report_view','forecast_view','category_manage')
WHERE r.name='librarian';

INSERT IGNORE INTO VaiTro_QuyenHan (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM VaiTro r JOIN QuyenHan p ON p.name='book_view'
WHERE r.name='reader';
