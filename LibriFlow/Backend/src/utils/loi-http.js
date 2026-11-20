export class LoiHttp extends Error {
    // Giữ các thuộc tính status/code/details để tương thích middleware và hợp đồng lỗi JSON.
    constructor(trangThai, maLoi, thongBao, cacChiTiet) {
        super(thongBao);
        this.status = trangThai;
        this.code = maLoi;
        this.details = cacChiTiet;
    }
}
