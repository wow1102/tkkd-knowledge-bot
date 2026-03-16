/**
 * Lọc dòng dữ liệu dựa trên JSON Conditions trả về từ Parser
 * Thực hiện 100% Deterministic Filtering.
 */

// Helper xoá dấu (như bạn đã cấu hình trước đây)
const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
};

const filterInventory = (inventoryList, filters) => {
    if (!inventoryList || inventoryList.length === 0) return [];
    
    return inventoryList.filter(unit => {
        
        // 1. Phân loại theo Project
        if (filters.project_name) {
            const unitProj = removeVietnameseTones(unit.project_name);
            const reqProj = removeVietnameseTones(filters.project_name);
            if (unitProj && !unitProj.includes(reqProj)) return false;
        }

        // 2. Bedroom Type
        if (filters.bedroom_type) {
            const unitBed = removeVietnameseTones(unit.bedroom_type);
            const reqBed = removeVietnameseTones(filters.bedroom_type);
            if (unitBed && !unitBed.includes(reqBed) && !reqBed.includes(unitBed)) return false;
        }
        
        // 3. Direction
        if (filters.direction) {
            const unitDir = removeVietnameseTones(unit.direction);
            const reqDir = removeVietnameseTones(filters.direction);
            if (unitDir && !unitDir.includes(reqDir)) return false;
        }

        // 4. Giá (Min - Max) -> Ép kiểu Number an toàn
        const listPrice = Number(unit.list_price);
        if (!isNaN(listPrice)) {
            if (filters.min_price && listPrice < filters.min_price) return false;
            if (filters.max_price && listPrice > filters.max_price) return false;
        }

        // 5. Khoảng tầng (Floor)
        const unitFloor = Number(unit.floor);
        if (!isNaN(unitFloor)) {
            if (filters.floor_min && unitFloor < filters.floor_min) return false;
            if (filters.floor_max && unitFloor > filters.floor_max) return false;
        }

        // 6. Trạng thái (luôn cần match chính xác, nếu JSON parse có `available` thì unit cũng phải available)
        if (filters.status) {
             const unitStatus = removeVietnameseTones(unit.status);
             const reqStatus = removeVietnameseTones(filters.status);
             // Chỉ lấy nếu trạng thái khớp (mặc định AI gán 'available')
             if (unitStatus !== reqStatus && !unitStatus.includes(reqStatus)) return false;
        }

        return true;
    });
};

module.exports = { filterInventory };
