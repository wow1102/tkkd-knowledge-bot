document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email-input');
    const questionInput = document.getElementById('question-input');
    const sendBtn = document.getElementById('send-btn');
    
    const resultSection = document.getElementById('result-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Components Error
    const errorBox = document.getElementById('error-box');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    
    // Components Success
    const successBox = document.getElementById('success-box');
    const botAnswer = document.getElementById('bot-answer');
    const docName = document.getElementById('doc-name');
    const docLink = document.getElementById('doc-link');

    // Reset UI state before new request
    function resetUI() {
        resultSection.style.display = 'block';
        loadingIndicator.style.display = 'block';
        errorBox.style.display = 'none';
        successBox.style.display = 'none';
    }

    // Show error
    function showError(title, message) {
        loadingIndicator.style.display = 'none';
        errorBox.style.display = 'block';
        successBox.style.display = 'none';
        
        errorTitle.textContent = title;
        errorMessage.textContent = message;
    }

    // Show success
    function showSuccess(data) {
        loadingIndicator.style.display = 'none';
        errorBox.style.display = 'none';
        successBox.style.display = 'block';
        
        botAnswer.textContent = data.answer;
        docName.textContent = data.document_name;
        docLink.href = data.file_link || '#';
    }

    async function handleSend() {
        const email = emailInput.value.trim();
        const question = questionInput.value.trim();

        if (!email || !question) {
            alert('Vui lòng nhập đầy đủ Email và Câu hỏi!');
            return;
        }

        // Disable input while loading
        sendBtn.disabled = true;
        sendBtn.textContent = 'Đang gửi...';
        emailInput.disabled = true;
        questionInput.disabled = true;

        resetUI();

        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, question })
            });

            const data = await response.json();

            if (!response.ok) {
                // If the backend returns a 403 Access Denied, or 400/500 errors
                showError(
                    data.error || 'Lỗi hệ thống', 
                    data.message || 'Không thể lấy thông tin từ máy chủ.'
                );
            } else {
                // Happy path
                showSuccess(data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showError('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc liên hệ IT.');
        } finally {
            // Re-enable inputs
            sendBtn.disabled = false;
            sendBtn.textContent = 'Gửi Câu Hỏi';
            emailInput.disabled = false;
            questionInput.disabled = false;
        }
    }

    // Event listeners
    sendBtn.addEventListener('click', handleSend);
    
    // Try sending on Enter (optional, if user is in textarea they usually need shift+enter to newline)
    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
});
