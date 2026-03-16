require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
// const { getUserByEmail, getActiveDocuments } = require('./services/googleSheetsService'); -- Chuyển sang Supabase
const { getUserByEmail, getActiveDocuments } = require('./services/supabaseService');
const { getDriveFileInfo } = require('./services/googleDriveService');
const { selectBestDocument, generateAnswer } = require('./services/openaiService');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mục tiêu: Endpoint POST /ask
app.post('/ask', async (req, res) => {
    try {
        // 2. Nhận email và question
        const { email, question } = req.body;
        
        console.log(`\n[INFO] New Request | Email: ${email} | Question: "${question}"`);

        if (!email || !question) {
            console.warn('[WARN] Missing email or question in request body.');
            return res.status(400).json({ error: 'Email and question are required' });
        }

        // 3. Kiểm tra email trong AI_User_Access
        console.log(`[INFO] Checking user access for: ${email}...`);
        const user = await getUserByEmail(email);
        
        // 4. Nếu user null hoặc không tìm thấy
        if (!user) {
            console.warn(`[WARN] Access Denied for email: ${email}`);
            return res.status(403).json({ 
                error: 'Access Denied', 
                message: 'Email của bạn không có quyền truy cập ứng dụng.' 
            });
        }
        console.log(`[INFO] User ${email} is active. Proceeding...`);

        // 5. Đọc AI_Document_Master, chỉ lấy status = active
        console.log(`[INFO] Fetching active documents from AI_Document_Master...`);
        const activeDocs = await getActiveDocuments();
        
        if (!activeDocs || activeDocs.length === 0) {
            console.warn('[WARN] No active documents found in Master List.');
            return res.status(404).json({ error: 'No active documents available' });
        }
        console.log(`[INFO] Found ${activeDocs.length} active document(s).`);

        // 6. Chọn tài liệu phù hợp nhất
        console.log(`[INFO] Selecting the most relevant document...`);
        const selectedDoc = await selectBestDocument(activeDocs, question);
        
        if (selectedDoc === 'NO_MATCH') {
            console.log(`[INFO] No relevant document found.`);
            return res.json({
                answer: "Chúng tôi chưa có tài liệu nào trả lời cho câu hỏi này.",
                document_name: "N/A",
                file_link: ""
            });
        }
        
        const nameKey = Object.keys(selectedDoc).find(k => k.toLowerCase().includes('name') && !k.toLowerCase().includes('project'));
        const docName = nameKey ? selectedDoc[nameKey] : 'Unknown';
        
        const linkKey = Object.keys(selectedDoc).find(k => k.toLowerCase().includes('link') || k.toLowerCase().includes('url'));
        const docLink = linkKey ? selectedDoc[linkKey] : null;

        console.log(`[INFO] Best document selected: ${docName}`);

        // Đọc nội dung file từ Google Drive
        console.log(`[INFO] Fetching content from Google Drive...`);
        
        let content = '';
        let fileUrl = docLink;
        try {
            if (docLink) {
                 const driveInfo = await getDriveFileInfo(docLink);
                 content = driveInfo.textContent || '';
                 if (driveInfo.url) fileUrl = driveInfo.url;
                 console.log(`[INFO] Drive Status: ${driveInfo.message}`);
            } else {
                 console.warn('[WARN] Không tìm thấy link tài liệu để lấy text.');
            }
        } catch (driveErr) {
            console.error('[WARN] Lỗi khi lấy content từ Drive:', driveErr.message);
        }

        console.log(`[INFO] Generating answer with OpenAI...`);
        const answer = await generateAnswer(question, { name: docName }, content);
        console.log(`[INFO] Answer generated successfully.`);

        // 7. Trả về answer + document_name + file_link
        res.json({
            answer: answer,
            document_name: docName,
            file_link: fileUrl || ""
        });

    } catch (error) {
        console.error('[ERROR] /ask Endpoint Error:', error.message);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            message: 'Đã xảy ra lỗi trong quá trình xử lý yêu cầu.' 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`====== TKKD Knowledge Bot MVP ======`);
    console.log(`[INFO] Server is running at http://localhost:${PORT}`);
});

// Cho phép Vercel nhận diện app express dưới dạng serverless function
module.exports = app;
