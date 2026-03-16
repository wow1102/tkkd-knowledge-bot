# TKKD Knowledge Bot MVP

Dự án này là một MVP dành cho nhân viên kinh doanh nội bộ để hỏi và tra cứu thông tin từ các tài liệu dự án lưu trữ trên Google Drive, thông qua sức mạnh của OpenAI.

## 🛠 Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/) (Khuyến nghị phiên bản LTS, >= 18.x)
- Tài khoản OpenAI API (Có apiKey)
- Tài khoản Google Cloud Service Account (có thông tin Email và Private Key)

## 📦 Cài đặt
1. **Clone/Tải mã nguồn về máy cục bộ:**
Hãy đảm bảo bạn đang ở thư mục `tkkd-knowledge-bot`.

2. **Cài đặt thư viện:**
Mở Terminal tại thư mục `tkkd-knowledge-bot` và chạy:
```bash
npm install
```

3. **Cấu hình môi trường:**
Tạo một file `.env` ở thư mục gốc (hoặc sao chép từ `.env.example`), với nội dung sau:
```env
PORT=3000
OPENAI_API_KEY=sk-proj-... (Thay bằng key OpenAI của bạn)

# Thông tin xác thực Google Service Account
GOOGLE_SA_EMAIL=tkkd-bot-service@your-project-id.iam.gserviceaccount.com
GOOGLE_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvA...\n-----END PRIVATE KEY-----\n"

# ID của 2 Google Sheets chuyên quản lý (Lấy từ URL của Sheet)
GOOGLE_SHEET_ID_USER_ACCESS=1DpsdBpsnl0v-9c8eT0G4DuDNCbW3YDmT60njNVGssMs
GOOGLE_SHEET_ID_DOC_MASTER=1Pd2IicNeQ6z_rlQHO5vDjDH1VYnvzDBSbyqUOPRKB3I
```

*Lưu ý Quan Trọng:* Tài khoản email của `Google Service Account` (nằm ở biến `GOOGLE_SA_EMAIL`) phải được chia sẻ và cấp quyền **Viewer/Đọc** trên 2 Google Sheets và các file Google Drive chứa tài liệu. Mất quyền này BOT sẽ không tải được dữ liệu.

## 🚀 Cách chạy ứng dụng
Chạy lệnh sau trong Terminal:
```bash
node server.js
```
Nếu thành công, bạn sẽ thấy thông báo:
`Knowledge Bot Server is running at http://localhost:3000`

Mở trình duyệt và truy cập `http://localhost:3000` để bắt đầu trải nghiệm bot.

## 🏗 Cấu trúc Project
```
tkkd-knowledge-bot/
├── public/                  # Static Files cho Frontend
│   ├── index.html           # Web Chat UI 
│   ├── styles.css           # UI Styling (Dark mode, Glassmorphism)
│   └── script.js            # Frontend logic (Gọi API, xử lý chat)
├── services/               
│   ├── googleService.js     # API tương tác với Google Sheets & Drive
│   └── openaiService.js     # API gọi OpenAI GPT-4o-mini trả lời câu hỏi 
├── .env                     # Biến môi trường (Không commit)
├── .env.example             # Ví dụ cấu hình biến môi trường
├── server.js                # Backend API (Express.js) - Endpoint POST /api/ask
├── package.json             # Quản lý dependencies
└── README.md                # Hướng dẫn chạy
```

## 📝 Chức năng (Phase 1)
- Validation người dùng tự động dựa trên thư mục `AI_User_Access`.
- Đồng bộ danh sách tài liệu từ `AI_Document_Master`.
- Đọc văn bản từ file Google Drive làm *context* kiến thức.
- OpenAI đọc nội dung, trả lời đúng trọng tâm KHÔNG tự biên tự diễn (Tạo viền bảo mật không nói lỗi hay vấn đề pricing không có thực).
