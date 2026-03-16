# Phase 3 - Pricing with Approval

## 1. Mục tiêu

Thêm workflow tạo phiếu tính giá có duyệt vào app nội bộ TKKD.

Người dùng nội bộ có thể yêu cầu:

- "Cho tôi phiếu tính giá mã căn DK-A1203"
- "Tính giá mã căn X theo chính sách hiện hành"
- "Tính lãi phát sinh đến ngày ..."

Hệ thống phải:
1. parse yêu cầu
2. lấy đúng dữ liệu căn
3. lấy đúng policy active
4. tính toán bằng rule/template deterministic
5. sinh output draft
6. gửi duyệt
7. chỉ xuất final khi đã được approve

---

## 2. Phạm vi phase này

### Làm trong phase 3
1. thêm flow pricing request
2. thêm deterministic pricing engine hoặc template-based calculator
3. thêm approval workflow
4. thêm pricing request log
5. thêm UI tối giản cho request và approval

### Không làm trong phase 3
- không CRM integration
- không multi-agent
- không exception engine nâng cao
- không tự động gửi khách hàng ngoài hệ thống
- không để LLM tự tính số tiền

---

## 3. Data sources

### Sheet 1: `AI_Inventory_Master`
Dùng để lấy dữ liệu căn:
- `project_name`
- `unit_code`
- `list_price`
- các trường cần thiết khác

### Sheet 2: `AI_Pricing_Policy`
Cột tối thiểu:
- `project_name`
- `policy_name`
- `policy_version`
- `effective_date`
- `status`
- `discount_type`
- `discount_value`
- `payment_schedule`
- `interest_rule`
- `note`

### Sheet 3: `AI_Pricing_Request_Log`
Cột tối thiểu:
- `request_id`
- `timestamp`
- `email`
- `project_name`
- `unit_code`
- `request_type`
- `status`
- `approver`
- `approval_time`
- `output_file_link`
- `note`

### Sheet 4: `AI_Pricing_Approver`
Cột tối thiểu:
- `project_name`
- `approver_email`
- `approver_role`
- `status`

---

## 4. User stories

### User story 1
Là một sales, tôi muốn nhập mã căn để hệ thống sinh phiếu tính giá nháp nhanh hơn cách làm tay.

### User story 2
Là một TKKD hoặc approver, tôi muốn chỉ những phiếu đã duyệt mới được coi là bản final.

### User story 3
Là người quản trị, tôi muốn truy vết được policy version nào đã dùng để tính.

---

## 5. Nguyên tắc kiến trúc bắt buộc

### LLM được phép làm
- parse ý định
- extract trường đầu vào
- format câu trả lời / UI response

### LLM không được phép làm
- tự tính discount
- tự tính net price
- tự tính lãi phát sinh bằng suy luận ngôn ngữ
- bỏ qua approval workflow
- bịa output pricing

### Pricing engine phải là deterministic
Có thể làm bằng một trong 2 cách:
1. code rule rõ ràng ở backend
2. đổ input vào Google Sheet/Excel template có công thức rồi đọc output

---

## 6. Input yêu cầu

Tối thiểu cần parse được:
- `project_name` (nếu có)
- `unit_code`
- `calculation_date`
- `request_type`

### Ví dụ request_type
- `pricing_sheet`
- `interest_calculation`
- `net_price_preview`

### Nếu thiếu project_name
Có thể suy ra từ inventory row nếu `unit_code` là duy nhất.

---

## 7. Output yêu cầu

Draft pricing output phải có tối thiểu:

- `project_name`
- `unit_code`
- `list_price`
- `discount`
- `net_price`
- `payment_schedule`
- `interest_rule`
- `calculation_date`
- `policy_version`
- `approval_status`

### Nếu sinh file
Có thể có:
- `draft_output_link`
- `final_output_link`

---

## 8. Approval workflow

### Trạng thái bắt buộc
- `draft`
- `pending_approval`
- `approved`
- `rejected`

### Luồng chuẩn
1. user gửi request pricing
2. hệ thống sinh draft
3. tạo log `pending_approval`
4. gán approver theo `AI_Pricing_Approver`
5. approver xem request
6. approver approve hoặc reject
7. nếu approved:
   - cho phép final output
8. nếu rejected:
   - giữ trạng thái rejected
   - ghi note

### Yêu cầu
- final output không được lộ ra trước approval
- mọi state transition phải được log

---

## 9. Hành vi bắt buộc

1. App phải có tab hoặc mode `Pricing Request`.
2. User nhập:
   - email
   - unit_code
   - optional project_name
   - optional calculation_date
3. Hệ thống kiểm tra email active.
4. Hệ thống parse request.
5. Hệ thống lấy inventory row.
6. Hệ thống lấy active policy.
7. Hệ thống tính draft pricing deterministic.
8. Hệ thống tạo approval request.
9. App phải hiển thị approval status.
10. Có thể thêm view tối giản cho approver để bấm approve/reject.

---

## 10. Error handling

Các lỗi bắt buộc phải xử lý:

1. email không active
2. unit_code không tồn tại
3. không có policy active
4. policy dữ liệu thiếu
5. approver không tồn tại cho project
6. pricing engine fail
7. output file fail

### Yêu cầu
- báo lỗi rõ ràng
- không trả final output giả
- không dùng fallback bằng model để “đoán số”

---

## 11. Logging

Mỗi pricing request phải được log với các field:

- `request_id`
- `timestamp`
- `email`
- `project_name`
- `unit_code`
- `request_type`
- `status`
- `policy_version`
- `approver`
- `approval_time`
- `output_file_link`
- `note`

### Mục tiêu logging
- truy vết policy version
- truy vết ai duyệt
- truy vết output nào đã dùng
- debug case sai số

---

## 12. UI yêu cầu

### Pricing Request tab
Hiển thị tối thiểu:
- email
- unit_code
- optional project_name
- optional calculation_date
- submit button
- draft output section
- approval status
- policy version

### Approval view tối giản
Hiển thị:
- request_id
- project_name
- unit_code
- policy_version
- draft summary
- approve button
- reject button
- note field

---

## 13. Acceptance criteria

Phase 3 được coi là đạt nếu:

1. User active tạo được pricing request
2. Unit hợp lệ được lookup đúng
3. Policy active được chọn đúng
4. Số tiền được tính bằng deterministic logic hoặc template
5. Draft pricing output sinh ra đúng format
6. Approval workflow chạy được
7. Final output chỉ có sau `approved`
8. Mọi request đều có log
9. Không có bước nào để model tự tính số kinh doanh

---

## 14. Test cases tối thiểu

1. valid unit + active policy
2. valid unit + no active policy
3. invalid unit_code
4. create draft rồi approve
5. create draft rồi reject

Mỗi case cần ghi:
- parsed input
- selected inventory row
- selected policy
- draft output
- approval state
- kết quả đúng/sai

---

## 15. Technical constraints

- tái sử dụng app phase 1 + phase 2
- tiếp tục dùng Google Sheets làm data control layer
- không thêm multi-agent
- không thêm CRM integration
- code phải tách rõ:
  - parser service
  - inventory lookup service
  - pricing policy service
  - pricing calculation service
  - approval service
  - logging service
