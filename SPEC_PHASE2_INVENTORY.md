# Phase 2 - Inventory Query

## 1. Mục tiêu

Thêm chức năng tra bảng hàng vào app nội bộ TKKD.

Người dùng nội bộ có thể nhập câu hỏi bằng ngôn ngữ tự nhiên, ví dụ:

- "căn 1PN hướng Đông Nam dưới 4 tỷ"
- "2PN nhỏ nhất còn hàng"
- "căn tầng 10 đến 15 còn không"
- "danh sách căn dưới 5 tỷ dự án Vinhomes Dương Kinh"

Hệ thống phải phân tích câu hỏi thành bộ điều kiện có cấu trúc, lọc dữ liệu từ bảng hàng active, và trả về danh sách căn phù hợp.

---

## 2. Phạm vi phase này

### Làm trong phase 2
1. Thêm một flow tra bảng hàng.
2. Đọc dữ liệu từ Google Sheet inventory active.
3. Parse câu hỏi tự nhiên thành structured filters.
4. Lọc dữ liệu bằng backend code.
5. Trả về kết quả dạng bảng.
6. Ghi log mỗi request inventory.

### Không làm trong phase 2
- không pricing
- không approval workflow
- không CRM integration
- không multi-agent
- không vector database
- không legal analysis
- không exception engine phức tạp

---

## 3. Data source

### Google Sheet chính
`AI_Inventory_Master`

### Cột dữ liệu kỳ vọng
- `project_name`
- `unit_code`
- `product_type`
- `bedroom_type`
- `area`
- `direction`
- `floor`
- `tower`
- `list_price`
- `status`
- `updated_at`

### Quy tắc dữ liệu
- mỗi dòng là 1 căn
- không merge cell
- `list_price` là số
- `floor` là số
- `status` dùng một bộ chuẩn:
  - `available`
  - `reserved`
  - `sold`
  - `hold`
  - `blocked`

---

## 4. User story

### User story 1
Là một sales nội bộ, tôi muốn hỏi bằng câu tự nhiên để hệ thống trả ra danh sách căn phù hợp mà không cần lọc Excel thủ công.

### User story 2
Là một TKKD, tôi muốn hệ thống chỉ dùng bảng hàng active và có timestamp để tránh dùng nhầm dữ liệu cũ.

---

## 5. Hành vi bắt buộc

1. App phải có một mode hoặc tab riêng cho `Inventory Query`.
2. Người dùng nhập:
   - email
   - câu hỏi inventory
3. Hệ thống kiểm tra email có active không.
4. Nếu user không active:
   - từ chối truy cập
5. Nếu user active:
   - parse câu hỏi thành structured filters
   - đọc bảng `AI_Inventory_Master`
   - lọc bằng backend logic
   - không dùng LLM để bịa ra kết quả cuối
6. Trả về:
   - `unit_code`
   - `bedroom_type`
   - `area`
   - `direction`
   - `list_price`
   - `status`
   - `updated_at`
7. Nếu không có kết quả:
   - trả thông báo rõ ràng
8. Ghi log cho mỗi truy vấn.

---

## 6. Parser yêu cầu

LLM chỉ được dùng để parse intent và extract filters.

### Output parser mong muốn
Trả về JSON có thể có các trường sau:

- `project_name`
- `bedroom_type`
- `product_type`
- `direction`
- `min_price`
- `max_price`
- `tower`
- `floor_min`
- `floor_max`
- `status`
- `sort_by`
- `sort_order`

### Nguyên tắc parser
- nếu thiếu trường nào thì để `null`
- không trả lời business answer ở parser
- không tự đoán dữ liệu không có trong câu hỏi

### Ví dụ
Input:
`căn 1PN hướng Đông Nam dưới 4 tỷ`

Output JSON:
```json
{
  "project_name": null,
  "bedroom_type": "1PN",
  "product_type": null,
  "direction": "Đông Nam",
  "min_price": null,
  "max_price": 4000000000,
  "tower": null,
  "floor_min": null,
  "floor_max": null,
  "status": "available",
  "sort_by": null,
  "sort_order": null
}
```

---

## 7. Backend filtering requirements

Filtering phải được thực hiện trong backend code.

### Bắt buộc

* không được để model tự nghĩ ra danh sách căn
* chỉ được trả dòng có thật từ `AI_Inventory_Master`
* chỉ dùng dữ liệu active hiện tại
* có thể thêm rule mặc định:

  * nếu người dùng không nói rõ status, ưu tiên `available`

### Điều kiện lọc

Hệ thống phải hỗ trợ:

* lọc theo `project_name`
* lọc theo `bedroom_type`
* lọc theo `direction`
* lọc theo `tower`
* lọc theo `floor`
* lọc theo ngưỡng giá
* lọc theo trạng thái

---

## 8. Output UI

Kết quả nên hiển thị dạng bảng đơn giản.

### Cột hiển thị

* Unit code
* Bedroom
* Area
* Direction
* Floor
* Tower
* Price
* Status
* Updated at

### Empty state

Nếu không có căn phù hợp:

* hiển thị thông báo: `Không có căn phù hợp với điều kiện hiện tại.`

---

## 9. Logging

Mỗi request inventory phải được log.

### Log fields

* `timestamp`
* `email`
* `question`
* `parsed_filters`
* `result_count`
* `status`
* `note`

### Mục tiêu logging

* debug parser
* biết câu hỏi nào fail nhiều
* biết user đang dùng kiểu query nào

---

## 10. Error handling

### Trường hợp cần xử lý

1. email không active
2. sheet inventory không đọc được
3. dữ liệu sheet thiếu cột
4. parser trả dữ liệu lỗi
5. không có kết quả khớp

### Yêu cầu

* báo lỗi rõ
* không crash app
* không trả kết quả giả

---

## 11. Acceptance criteria

Phase 2 được coi là đạt nếu:

1. User active hỏi được inventory bằng ngôn ngữ tự nhiên
2. Hệ thống parse được ít nhất 10 query mẫu phổ biến
3. Kết quả trả về là các dòng có thật từ sheet
4. Có trường `updated_at` trong output
5. Không có hallucination inventory
6. Có request logging
7. User inactive bị chặn

---

## 12. Test cases tối thiểu

1. `căn 1PN hướng Đông Nam dưới 4 tỷ`
2. `2PN nhỏ nhất còn hàng`
3. `căn tầng 10 đến 15`
4. `danh sách căn dưới 5 tỷ dự án Vinhomes Dương Kinh`
5. `căn không tồn tại`

Mỗi test cần ghi:

* parsed filters
* result count
* output đúng/sai
* lỗi nếu có

---

## 13. Technical constraints

* tái sử dụng app MVP hiện tại
* tiếp tục dùng Google Sheets làm data control layer
* không thêm DB mới ở phase này
* code phải đơn giản, dễ debug
* ưu tiên service tách riêng:

  * parser service
  * inventory sheet service
  * inventory filter service
  * logging service
