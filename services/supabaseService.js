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

module.exports = {
    getUserByEmail,
    getActiveDocuments
};
