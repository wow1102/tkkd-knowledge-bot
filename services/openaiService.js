const { OpenAI } = require('openai');
require('dotenv').config();

const getOpenAIClient = () => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
        console.warn("⚠️ Cảnh báo: OPENAI_API_KEY chưa được cấu hình. Sử dụng Mock data.");
        return null;
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

/**
 * Hàm gọi OpenAI API để sinh câu trả lời theo nghiệp vụ Bất động sản
 * 
 * @param {string} question - Câu hỏi của User
 * @param {Object} documentMetadata - Thông tin tài liệu đã chọn (ví dụ: { name: 'Chinh_sach_ban_hang.pdf' })
 * @param {string} content - Nội dung chữ (text) trích xuất từ tài liệu (nếu có)
 * @returns {string} - Trả về nội dung câu trả lời
 */
async function generateAnswer(question, documentMetadata, content) {
    const openai = getOpenAIClient();
    const docName = documentMetadata && documentMetadata.name ? documentMetadata.name : 'Tài liệu không xác định';

    // Mock Mode: Trạng thái không có API Key
    if (!openai) {
        return `[MOCK MODE] Dựa trên dữ liệu từ tài liệu ${docName}, đây là câu trả lời khởi tạo sẵn do thiếu API Key...`;
    }

    const systemPrompt = `Bạn là trợ lý nội bộ cho phòng kinh doanh bất động sản.
Chỉ trả lời dựa trên dữ liệu được cung cấp.
Nếu không đủ dữ liệu, nói rõ là chưa đủ dữ liệu.
Không được tự bịa.
Trả lời ngắn gọn, đúng nghiệp vụ, và nêu tên tài liệu đã dùng.`;

    const docContent = content && content.trim().length > 0 
        ? content 
        : "(Không có nội dung cụ thể nào được trích xuất từ tài liệu này)";

    const userPrompt = `Tên tài liệu cung cấp: ${docName}

-- Nội dung dữ liệu --
${docContent}
----------------------

Câu hỏi của Sales:
${question}
`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Hoặc 'gpt-4o' tùy nhu cầu
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.1, // Set thấp để LLM không nói nhảm/bịa đặt
            max_tokens: 500,
        });
        
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('[ERROR] Lỗi gọi OpenAI API:', error.message);
        throw new Error('Đã xảy ra lỗi khi kết nối với OpenAI để tạo câu trả lời.');
    }
}

// Helper: Loại bỏ dấu tiếng Việt để so sánh chuỗi dễ hơn
const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
};

/**
 * Chọn tài liệu phù hợp nhất qua các bước lọc thủ công trước khi gọi LLM
 * Quy tắc:
 * 1. Ưu tiên project_name matching
 * 2. Ưu tiên document_type matching
 * 3. Lọc status = active
 * 4. Dùng LLM chọn hoặc trả NO_MATCH
 */
async function selectBestDocument(activeDocs, question) {
    if (!activeDocs || activeDocs.length === 0) return 'NO_MATCH';

    // 3. Đảm bảo chỉ dùng tài liệu active (đã bắt ở getActiveDocuments, nhưng lọc lại cho chắc)
    let filteredDocs = activeDocs.filter(doc => {
        const statusKey = Object.keys(doc).find(k => k.toLowerCase().includes('status'));
        if (statusKey) {
            return doc[statusKey].toLowerCase() === 'active';
        }
        return true;
    });

    if (filteredDocs.length === 0) return 'NO_MATCH';

    const normalizedQuestion = removeVietnameseTones(question);

    // 1. Lọc theo project_name khớp câu hỏi
    const docsMatchingProject = filteredDocs.filter(doc => {
        const projectKey = Object.keys(doc).find(k => k.toLowerCase().includes('project'));
        if (projectKey && doc[projectKey]) {
            const projectName = removeVietnameseTones(doc[projectKey]);
            // Nếu từ khóa dự án xuất hiện trong câu hỏi
            if (projectName && normalizedQuestion.includes(projectName)) return true;
        }
        return false;
    });

    if (docsMatchingProject.length > 0) {
        filteredDocs = docsMatchingProject; // Thu hẹp xuống các tài liệu thuộc dự án đó
    }

    // 2. Ưu tiên document_type khớp intent
    const docsMatchingType = filteredDocs.filter(doc => {
        const typeKey = Object.keys(doc).find(k => k.toLowerCase().includes('type'));
        if (typeKey && doc[typeKey]) {
            const docType = removeVietnameseTones(doc[typeKey]);
            // Nếu tìm thấy loại tài liệu trong câu hỏi (ví dụ: "chính sách", "bảng giá")
            if (docType && normalizedQuestion.includes(docType)) return true;
        }
        return false;
    });

    if (docsMatchingType.length > 0) {
        filteredDocs = docsMatchingType;
    }

    // Nếu chỉ có 1 tài liệu sau khi lọc => Đó là tài liệu best khớp logic
    if (filteredDocs.length === 1) {
        return filteredDocs[0];
    }

    // 4. Nếu có nhiều tài liệu, bắt đầu mượn LLM chọn lại 1 lần nữa từ cái danh sách bị bóp nhỏ này
    const openai = getOpenAIClient();
    
    if (!openai) {
        return filteredDocs[0]; // mock: trả về tài liệu đầu tiên
    }

    // Render danh sách tài liệu phục vụ prompt
    const docListText = filteredDocs.map((doc, index) => {
        const nameKey = Object.keys(doc).find(k => k.toLowerCase().includes('name') && !k.toLowerCase().includes('project'));
        const name = nameKey ? doc[nameKey] : `Doc_${index}`;
        const pKey = Object.keys(doc).find(k => k.toLowerCase().includes('project'));
        const pName = pKey ? doc[pKey] : '';
        const tKey = Object.keys(doc).find(k => k.toLowerCase().includes('type'));
        const tName = tKey ? doc[tKey] : '';

        return `[ID: ${index}] Tên: ${name} | Dự án: ${pName} | Loại: ${tName}`;
    }).join('\n');
    
    const prompt = `Bạn là hệ thống điều phối tài liệu Sales Bất Động Sản.
Nhiệm vụ: Chọn MỘT tài liệu duy nhất trong danh sách bên dưới phù hợp với câu hỏi.

Danh sách tài liệu:
${docListText}

Câu hỏi: "${question}"

QUY TẮC CỨNG:
1. Nếu bạn chắc chắn có tài liệu giải quyết được câu trả lời, trả về DUY NHẤT con số ID (ví dụ: 0 hoặc 1 hoặc 2...).
2. Nếu không có cái nào phù hợp, hoặc bạn không chắc tài liệu nào trả lời được, trả về DUY NHẤT chuỗi: NO_MATCH.
3. Tuyệt đối không thêm dấu chấm, không diễn giải, không nói gì thêm.
`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 10,
            temperature: 0.0 // Set bằng 0 để đảm bảo phân loại luôn chuẩn không bị múa word
        });
        
        const result = response.choices[0].message.content.trim();
        
        // 5. Nếu không chắc trả NO_MATCH
        if (result === 'NO_MATCH') {
            return 'NO_MATCH';
        }

        const selectedIndex = parseInt(result, 10);
        if (!isNaN(selectedIndex) && filteredDocs[selectedIndex]) {
            return filteredDocs[selectedIndex]; // Trả về object tài liệu
        }
        
        return 'NO_MATCH';
    } catch (error) {
        console.error('[ERROR] Lỗi gọi OpenAI Routing AI:', error.message);
        return 'NO_MATCH';
    }
}


module.exports = {
    generateAnswer,
    selectBestDocument
};
