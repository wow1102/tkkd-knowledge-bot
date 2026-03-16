let currentTab = 'knowledge-bot';

// UI Switch Tabs
function switchTab(tabId) {
    currentTab = tabId;
    
    // Đổi button class (Tabs)
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Hiện đúng khung nhập
    document.getElementById('tab-knowledge').style.display = tabId === 'knowledge-bot' ? 'block' : 'none';
    document.getElementById('tab-inventory').style.display = tabId === 'inventory-query' ? 'block' : 'none';

    // Ẩn bảng kết quả cũ đi
    document.getElementById('result-section').style.display = 'none';
}

function formatCurrency(num) {
    if (!num) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

// Hàm format timestamp
function formatTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
}

// Reset khu vực hiển thị kết quả về rỗng
function resetResultArea() {
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('loading-indicator').style.display = 'block';
    
    document.getElementById('error-box').style.display = 'none';
    document.getElementById('empty-box').style.display = 'none';
    document.getElementById('success-knowledge').style.display = 'none';
    document.getElementById('success-inventory').style.display = 'none';
}

function showError(title, message) {
    document.getElementById('loading-indicator').style.display = 'none';
    document.getElementById('error-box').style.display = 'block';
    document.getElementById('error-title').innerText = title;
    document.getElementById('error-message').innerText = message;
}

function showEmptyState() {
    document.getElementById('loading-indicator').style.display = 'none';
    document.getElementById('empty-box').style.display = 'block';
}

// ----------- PHASE 1: KNOWLEDGE BOT -----------
async function askKnowledge() {
    const email = document.getElementById('email-input').value.trim();
    const question = document.getElementById('question-input').value.trim();

    if (!email || !question) {
        alert("Vui lòng nhập Email và Câu hỏi!");
        return;
    }

    resetResultArea();

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, question })
        });
        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'Lỗi', data.message || 'Hệ thống gián đoạn.');
            return;
        }

        if (!data.document_name) {
            showEmptyState();
            return;
        }

        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('success-knowledge').style.display = 'block';
        document.getElementById('bot-answer').innerText = data.answer;
        document.getElementById('doc-name').innerText = data.document_name;
        document.getElementById('doc-link').href = data.file_link || '#';

    } catch (error) {
        showError('Lỗi kết nối', 'Mất mạng hoặc máy chủ không phản hồi.');
    }
}

// ----------- PHASE 2: INVENTORY QUERY -----------
async function askInventory() {
    const email = document.getElementById('email-input').value.trim();
    const question = document.getElementById('inventory-input').value.trim();

    if (!email || !question) {
        alert("Vui lòng nhập Email và Yêu cầu tìm bảng hàng!");
        return;
    }

    resetResultArea();

    try {
        const response = await fetch('/inventory-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, question })
        });
        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'Lỗi', data.message || 'Lọc dứ liệu thất bại.');
            return;
        }

        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('filter-debug').innerText = JSON.stringify(data.filters);

        // Trường hợp không có dữ liệu
        if (!data.results || data.results.length === 0) {
            showEmptyState();
            return;
        }

        // Bỏ data vào Table Mới
        document.getElementById('success-inventory').style.display = 'block';
        document.getElementById('inventory-count').innerText = data.results.length;
        
        const tbody = document.getElementById('inventory-body');
        tbody.innerHTML = '';

        data.results.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${item.unit_code}</b></td>
                <td>${item.bedroom_type || '-'}</td>
                <td>${item.area ? item.area + 'm²' : '-'}</td>
                <td>${item.direction || '-'}</td>
                <td>${item.floor || '-'}</td>
                <td>${item.tower || '-'}</td>
                <td style="color:var(--primary-color); font-weight:bold;">${formatCurrency(item.list_price)}</td>
                <td><span class="status-badge status-${(item.status || 'available').toLowerCase()}">${item.status}</span></td>
                <td>${formatTime(item.updated_at)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        showError('Lỗi kết nối', 'Dịch vụ Tra bảng hàng đang gặp gián đoạn.');
    }
}
