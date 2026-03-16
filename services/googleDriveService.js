const { google } = require('googleapis');
const pdfParse = require('pdf-parse');
require('dotenv').config();

// Kiểm tra credential của Google Service Account, nếu thiếu thì báo lỗi rõ
if (!process.env.GOOGLE_SA_EMAIL || !process.env.GOOGLE_SA_PRIVATE_KEY) {
  console.error("❌ LỖI NGHIÊM TRỌNG: Thiếu cấu hình GOOGLE_SA_EMAIL hoặc GOOGLE_SA_PRIVATE_KEY trong .env");
  console.error("=> Vui lòng kiểm tra lại file .env của bạn để sử dụng Google Drive API.");
}

// Khởi tạo Google Auth client với quyền đọc Google Drive
const auth = new google.auth.JWT(
  process.env.GOOGLE_SA_EMAIL,
  null,
  process.env.GOOGLE_SA_PRIVATE_KEY ? process.env.GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  ['https://www.googleapis.com/auth/drive.readonly']
);

const drive = google.drive({ version: 'v3', auth });

/**
 * Hàm hỗ trợ trích xuất File ID từ link Google Drive
 * @param {string} input - Có thể là File ID hoặc URL của Google Drive
 * @returns {string|null}
 */
const extractFileId = (input) => {
  if (!input) return null;
  // Nếu không có slash (/), coi như toàn bộ chuỗi đã là fileId
  if (!input.includes('/')) return input;

  // Biểu thức chính quy (Regex) quét tìm ID hợp lệ của Google Drive trong link
  const matchId = input.match(/[-\w]{25,}/);
  return matchId ? matchId[0] : null;
};

/**
 * Đọc File từ Google Drive và lấy metadata, link cũng như nội dung text (nếu hỗ trợ)
 * @param {string} fileIdOrLink - Truyền Google Drive File ID hoặc một đường link
 */
const getDriveFileInfo = async (fileIdOrLink) => {
  if (process.env.GOOGLE_SA_EMAIL === 'your-service-account@project.iam.gserviceaccount.com' || !process.env.GOOGLE_SA_EMAIL) {
    return {
      fileId: 'mock-file-id',
      name: 'Mock Document.pdf',
      mimeType: 'application/pdf',
      url: fileIdOrLink,
      textContent: 'Dự án này có chính sách thanh toán rất linh hoạt. Khách hàng đóng 20% ký HĐMB. Ngân hàng hỗ trợ vay 80% với lãi suất 0% trong 24 tháng. Dự án hỗ trợ phí quản lý 2 năm. Còn dự án mới nhất sắp ra mắt sẽ có chiết khấu thêm 5% cho khách hàng booking sớm. Vinhome Dương Kinh: Booking 50 triệu.',
      hasContent: true,
      message: 'MOCK MODE: Đã trích xuất nội dung giả lập'
    };
  }

  const fileId = extractFileId(fileIdOrLink);
  
  if (!fileId) {
    throw new Error('Giá trị đầu vào không phải là Google Drive File ID hoặc Link hợp lệ.');
  }

  try {
    // 1. Lấy metadata của file (tên, kiểu file, link sử dụng)
    const metadataRes = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, webViewLink, webContentLink',
    });

    const fileMetadata = metadataRes.data;
    
    // Khởi tạo object kết quả fallback mặc định
    const result = {
      fileId: fileMetadata.id,
      name: fileMetadata.name,
      mimeType: fileMetadata.mimeType,
      url: fileMetadata.webViewLink || fileMetadata.webContentLink || fileIdOrLink,
      textContent: null, // Sẽ điền nội dung chữ vào đây nếu bóc tách thành công
      hasContent: false, // Flag cắm cờ biết chắc đã lấy được text hay chưa
      message: ''        // Thông báo ngữ cảnh
    };

    // 2. Tùy thuộc vào loại file, mình có thể bóc tách nội dung
    if (fileMetadata.mimeType === 'application/vnd.google-apps.document') {
      // Nếu là Google Docs => export thẳng ra file text thuần túy
      const exportRes = await drive.files.export({
        fileId,
        mimeType: 'text/plain',
      });
      result.textContent = exportRes.data;
      result.hasContent = true;
      result.message = 'Nội dung Google Docs đã được trích xuất thành text';
    } 
    else if (fileMetadata.mimeType === 'text/plain') {
      // Nếu file text thuần túy up lên Drive => Tải thẳng nội dung
      const mediaRes = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'text' }
      );
      result.textContent = mediaRes.data;
      result.hasContent = true;
      result.message = 'Nội dung file text gốc đã được tải về';
    }
    else if (fileMetadata.mimeType === 'application/pdf') {
      // Nếu file PDF => Tải mảng nhị phân về và thử dùng pdf-parse để đọc text layer
      try {
        const mediaRes = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        
        const dataBuffer = Buffer.from(mediaRes.data);
        const pdfData = await pdfParse(dataBuffer);
        
        // Cố gắng lấy text layer, nếu không có (hoặc file là pdf dạng ảnh scan chèn vào), text sẽ toàn space rỗng
        const text = pdfData.text ? pdfData.text.trim() : '';
        if (text) {
          result.textContent = text;
          result.hasContent = true;
          result.message = 'Nội dung PDF có text layer trích xuất thành công';
        } else {
          result.message = 'File PDF có thể là bản scan (hoặc không lấy được chữ). Trả về fallback Link và Metadata.';
        }
      } catch (pdfError) {
        console.warn('Cảnh báo: Lỗi khi parse PDF chữ, file_id:', fileId, pdfError.message);
        result.message = 'Lỗi trong quá trình thu nạp chữ từ PDF. Yêu cầu trả về fallback Link và Metadata.';
      }
    } else {
        // Fallback default cho các file khác
        result.message = `Định dạng ${fileMetadata.mimeType} chưa được hỗ trợ trích text. Trả về fallback Link và Metadata.`;
    }

    // Luôn trả về object ở cuối, ít nhất chứa link và metadata
    return result;

  } catch (error) {
    console.error(`Lỗi API khi truy xuất file có ID ${fileId}:`, error.message);
    throw error;
  }
};

module.exports = {
  extractFileId,
  getDriveFileInfo
};
