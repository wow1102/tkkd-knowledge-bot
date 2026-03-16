const { google } = require('googleapis');

// Initialize Google Auth client
const getAuthClient = () => {
    if (!process.env.GOOGLE_SA_EMAIL || !process.env.GOOGLE_SA_PRIVATE_KEY) {
        console.warn("⚠️ Missing Google Service Account credentials. Running in MOCK DATA mode.");
        return null; 
    }
    
    // Replace literal '\n' in private key with actual line breaks
    const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    return new google.auth.JWT(
        process.env.GOOGLE_SA_EMAIL,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
    );
};

// 1. Check if email is active in Google Sheet 'AI_User_Access'
async function checkUserAccess(email) {
    const auth = getAuthClient();
    if (!auth) {
        // MOCK MODE: Authenticate if email contains 'active' or 'nv'
        return email.toLowerCase().includes('active') || email.toLowerCase().includes('nv'); 
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID_USER_ACCESS;

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:B', // Assuming A=Email, B=Status
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) return false;

        for (let i = 1; i < rows.length; i++) { // Skip header row
            const rowEmail = rows[i][0] ? rows[i][0].toLowerCase() : '';
            const rowStatus = rows[i][1] ? rows[i][1].toLowerCase() : '';
            if (rowEmail === email.toLowerCase() && rowStatus === 'active') {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error in checkUserAccess', error.message);
        throw new Error('Google sheets api error');
    }
}

// 2. Lookup active documents in 'AI_Document_Master'
async function getActiveDocuments() {
    const auth = getAuthClient();
    if (!auth) {
         // MOCK MODE
        return [
            { name: 'Chính sách bán hàng dự án ABC 2024', fileId: 'mock123', link: 'https://docs.google.com/mock-link' }
        ];
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID_DOC_MASTER;

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:D', // Assuming A=DocName, B=Status, C=FileID, D=DriveLink
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        const activeDocs = [];
        for (let i = 1; i < rows.length; i++) {
            const status = rows[i][1] ? rows[i][1].toLowerCase() : '';
            if (status === 'active') {
                activeDocs.push({
                    name: rows[i][0],
                    fileId: rows[i][2], // We need the actual drive file id here
                    link: rows[i][3]
                });
            }
        }
        return activeDocs;
    } catch (error) {
        console.error('Error in getActiveDocuments', error.message);
        throw new Error('Google sheets api error');
    }
}

// 3. Get file content from Google Drive
async function getDocumentContent(fileId) {
    const auth = getAuthClient();
    if (!auth) {
        // MOCK DATA
        return "Dự án ABC bắt đầu mở bán từ ngày 01/12/2026. Phân khu 1 bao gồm 200 căn hộ cao cấp. Khách hàng mua trong tuần đầu tiên tặng thẻ thành viên VIP. Lưu ý tài liệu không đề cập đến bảng hàng chi tiết hay mức giá.";
    }

    const drive = google.drive({ version: 'v3', auth });

    try {
        // Attempt to export Google Doc as text
        const res = await drive.files.export({
            fileId: fileId,
            mimeType: 'text/plain' 
        });
        return res.data;
    } catch (error) {
        // If it fails (e.g., standard file instead of GDoc), try simple get
        try {
            const res = await drive.files.get({
                fileId: fileId,
                alt: 'media'
            }, { responseType: 'text' });
            return res.data;
        } catch (e) {
            console.error(`Error downloading file ${fileId} from Drive`, e.message);
            return "";
        }
    }
}

module.exports = {
    checkUserAccess,
    getActiveDocuments,
    getDocumentContent
};
