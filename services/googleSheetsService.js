const { google } = require('googleapis');
require('dotenv').config();

// Kiểm tra credential của Google Service Account, nếu thiếu thì báo lỗi rõ
if (!process.env.GOOGLE_SA_EMAIL || !process.env.GOOGLE_SA_PRIVATE_KEY) {
  console.error("❌ LỖI NGHIÊM TRỌNG: Thiếu cấu hình GOOGLE_SA_EMAIL hoặc GOOGLE_SA_PRIVATE_KEY trong .env");
  console.error("=> Vui lòng kiểm tra lại file .env của bạn.");
}

// Khởi tạo Google Auth client
const auth = new google.auth.JWT(
  process.env.GOOGLE_SA_EMAIL,
  null,
  // Đảm bảo xuống dòng đúng cách đối với private key lưu trong .env
  process.env.GOOGLE_SA_PRIVATE_KEY ? process.env.GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  ['https://www.googleapis.com/auth/spreadsheets.readonly']
);

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Lấy cấu hình cho Sheet AI_User_Access từ .env
 */
const getUserAccessConfig = () => {
    // Hỗ trợ cả biến cũ (GOOGLE_SHEET_ID_USER_ACCESS) và biến mới cho an toàn
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID_USER_ACCESS || process.env.GOOGLE_SHEET_ID_USER_ACCESS;
    const sheetName = process.env.GOOGLE_SHEET_NAME_USER_ACCESS || 'AI_User_Access';
    return { spreadsheetId, sheetName };
};

/**
 * Lấy cấu hình cho Sheet AI_Document_Master từ .env
 */
const getDocMasterConfig = () => {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID_DOC_MASTER || process.env.GOOGLE_SHEET_ID_DOC_MASTER;
    const sheetName = process.env.GOOGLE_SHEET_NAME_DOC_MASTER || 'AI_Document_Master';
    return { spreadsheetId, sheetName };
};


/**
 * getUserByEmail(email)
 * Đọc từ sheet AI_User_Access và tìm user theo email
 */
async function getUserByEmail(email) {
  if (process.env.GOOGLE_SA_EMAIL === 'your-service-account@project.iam.gserviceaccount.com' || !process.env.GOOGLE_SA_EMAIL) {
    console.log("[MOCK] Trả về mock user từ AI_User_Access do thiếu cấu hình credential");
    return {
      "Email": email,
      "Name": "User Của Tôi",
      "Status": "Active"
    };
  }

  const { spreadsheetId, sheetName } = getUserAccessConfig();
  
  if (!spreadsheetId) {
    throw new Error("Thiếu cấu hình GOOGLE_SPREADSHEET_ID_USER_ACCESS trong .env");
  }

  try {
    // Gọi API đọc dữ liệu của sheet
    // Range có dạng "SheetName!A:Z"
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, 
    });

    const rows = response.data.values;
    // Nếu sheet không có dữ liệu
    if (!rows || rows.length === 0) {
      return null;
    }

    // Lấy tiêu đề ở dòng đầu tiên
    const headers = rows[0]; 
    const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
    
    // Nếu không có title cột nào chứa chữ 'email', mặc định coi cột đầu tiên (index 0) là email
    const colEmail = emailIndex !== -1 ? emailIndex : 0;

    // Bắt đầu duyệt từ dòng thứ 2 (index 1) do dòng 0 là header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[colEmail] === email) {
        // Tái tạo lại object chứa thông tin user dựa trên header
        const user = headers.reduce((acc, currentHeader, index) => {
            acc[currentHeader] = row[index] || '';
            return acc;
        }, {});
        
        return user;
      }
    }
    
    // Không tìm thấy user
    return null; 
  } catch (error) {
    console.error(`Lỗi khi đọc sheet ${sheetName}:`, error.message);
    throw error;
  }
}


/**
 * getActiveDocuments()
 * Đọc từ sheet AI_Document_Master và trả về danh sách các tài liệu active
 */
async function getActiveDocuments() {
  if (process.env.GOOGLE_SA_EMAIL === 'your-service-account@project.iam.gserviceaccount.com' || !process.env.GOOGLE_SA_EMAIL) {
    console.log("[MOCK] Trả về mock files từ AI_Document_Master do thiếu cấu hình credential");
    return [
      {
        "ID": "1",
        "Project Name": "Dự án mới",
        "Document Type": "Chính sách bán hàng",
        "Name": "Chinh_sach_ban_hang_2026.pdf",
        "Status": "Active",
        "Link": "https://docs.google.com/mocklink/1"
      },
      {
        "ID": "2",
        "Project Name": "Vinhome Dương Kinh",
        "Document Type": "Bảng giá",
        "Name": "Bang_gia_duong_kinh.pdf",
        "Status": "Active",
        "Link": "https://docs.google.com/mocklink/2"
      }
    ];
  }

  const { spreadsheetId, sheetName } = getDocMasterConfig();

  if (!spreadsheetId) {
    throw new Error("Thiếu cấu hình GOOGLE_SPREADSHEET_ID_DOC_MASTER trong .env");
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status'));
    
    const activeDocs = [];

    // Bắt đầu duyệt từ dòng 1 (bỏ qua header)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const doc = headers.reduce((acc, currentHeader, index) => {
            acc[currentHeader] = row[index] || '';
            return acc;
        }, {});

        // Kiểm tra xem dòng này có thỏa mãn điều kiện 'active' không.
        // Nếu file có cột 'status', chỉ lấy record có giá trị 'active'.
        // Nếu không có tiêu đề là 'status', thì trả về tất cả.
        if (statusIndex === -1 || (row[statusIndex] && row[statusIndex].toLowerCase() === 'active')) {
            activeDocs.push(doc);
        }
    }

    return activeDocs;
  } catch (error) {
    console.error(`Lỗi khi đọc sheet ${sheetName}:`, error.message);
    throw error;
  }
}

module.exports = {
  getUserByEmail,
  getActiveDocuments
};
