const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Kiểm tra Key của Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-ref')) {
    console.warn("⚠️ Cảnh báo: SUPABASE_URL hoặc SUPABASE_ANON_KEY chưa được cấu hình. Sử dụng Mock data.");
} else {
    supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * Đọc từ bảng ai_user_access để xác thực email
 */
async function getUserByEmail(email) {
    if (!supabase) {
        console.log("[MOCK SUPABASE] Trả về mock user từ database giả lập");
        return { email: email, name: "Mock User", status: "Active" };
    }

    try {
        const { data, error } = await supabase
            .from('ai_user_access')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            // Error code khi ko tìm thấy row
            if (error.code === 'PGRST116') return null; 
            throw error;
        }
        
        return data; // Object chứa { email, name, status... }
    } catch (err) {
        console.error("Lỗi khi fetch User từ Supabase:", err.message);
        throw err;
    }
}

/**
 * Đọc từ bảng ai_document_master và lấy các tài liệu Active
 */
async function getActiveDocuments() {
    if (!supabase) {
        console.log("[MOCK SUPABASE] Trả về mock files từ database giả lập");
        return [
            {
                id: 1,
                project_name: "Dự án mới",
                document_type: "Chính sách bán hàng",
                name: "Chinh_sach_ban_hang_2026.pdf",
                status: "Active",
                link: "https://docs.google.com/mocklink/1" // Link này sẽ được Google Drive service phân tích (nếu mock Google Drive đang bật thì link tự parse luôn)
            },
            {
                id: 2,
                project_name: "Vinhome Dương Kinh",
                document_type: "Bảng giá",
                name: "Bang_gia_duong_kinh.pdf",
                status: "Active",
                link: "https://docs.google.com/mocklink/2"
            }
        ];
    }

    try {
        const { data, error } = await supabase
            .from('ai_document_master')
            .select('*')
            .eq('status', 'Active'); // Hoặc condition tuỳ chỉnh bạn setup

        if (error) {
            throw error;
        }

        return data || [];
    } catch (err) {
        console.error("Lỗi khi fetch Documents từ Supabase:", err.message);
        throw err;
    }
}

/**
 * Đọc bảng hàng từ ai_inventory_master (chỉ lấy status = active)
 */
async function getActiveInventory() {
    if (!supabase) {
        console.log("[MOCK SUPABASE] Trả về mock inventory từ database giả lập");
        return [
            {
                unit_code: "DK-A12.03", project_name: "Vinhomes Dương Kinh",
                bedroom_type: "2PN", area: 65, direction: "Đông Nam", floor: 12, tower: "A",
                list_price: 3600000000, status: "available", updated_at: new Date().toISOString()
            },
            {
                unit_code: "DK-B05.01", project_name: "Vinhomes Dương Kinh",
                bedroom_type: "1PN", area: 45, direction: "Tây Bắc", floor: 5, tower: "B",
                list_price: 2800000000, status: "available", updated_at: new Date().toISOString()
            },
            {
                unit_code: "LM-C15.02", project_name: "LandMark",
                bedroom_type: "3PN", area: 110, direction: "Đông Nam", floor: 15, tower: "C",
                list_price: 5500000000, status: "available", updated_at: new Date().toISOString()
            }
        ];
    }

    try {
        const { data, error } = await supabase
            .from('ai_inventory_master')
            .select('*')
            // .eq('status', 'available') // Lọc cứng ở DB nếu cần, hoặc để script phía server lo
            ;

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("Lỗi khi fetch Inventory từ Supabase:", err.message);
        throw err;
    }
}

/**
 * Ghi log request inventory
 */
async function logInventoryRequest(email, question, parsed_filters, result_count) {
    if (!supabase) {
        console.log(`[MOCK SUPABASE] Đã ghi log request Inventory Query. Question: ${question} | Kết quả: ${result_count}`);
        return;
    }

    try {
        await supabase
            .from('ai_inventory_log')
            .insert([{
                email,
                question,
                parsed_filters: JSON.stringify(parsed_filters),
                result_count,
                status: result_count > 0 ? "success" : "no_match"
            }]);
    } catch (err) {
        console.error("Lỗi khi ghi Log Inventory:", err.message);
    }
}

module.exports = {
    getUserByEmail,
    getActiveDocuments,
    getActiveInventory,
    logInventoryRequest
};
