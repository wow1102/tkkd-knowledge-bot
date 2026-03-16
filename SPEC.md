# TKKD Knowledge Bot MVP

## Mục tiêu
Xây app nội bộ để nhân viên kinh doanh hỏi tài liệu dự án.

## Chức năng phase 1
1. User nhập email và câu hỏi
2. Hệ thống kiểm tra email có active trong Google Sheet AI_User_Access không
3. Nếu inactive thì chặn
4. Nếu active thì tìm tài liệu active trong Google Sheet AI_Document_Master
5. Lấy file Google Drive phù hợp
6. Trả lời ngắn gọn dựa trên tài liệu
7. Trả về tên tài liệu + link file

## Không làm trong phase 1
- pricing
- query bảng hàng nâng cao
- legal analysis sâu
- CRM integration

## Stack mong muốn
- Frontend: simple web chat (HTML/CSS/JS)
- Backend: Node.js (Express)
- Data control: Google Sheets API
- File source: Google Drive API
- LLM: OpenAI API
- Local run: Cấu hình .env và hướng dẫn chạy cục bộ
