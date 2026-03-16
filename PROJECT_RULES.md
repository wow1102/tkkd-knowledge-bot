# Project Rules

## 1. Mục tiêu của project

Đây là app nội bộ cho TKKD / phòng kinh doanh BĐS.

Mục tiêu hiện tại chỉ là:
1. bot hỏi đáp tài liệu
2. tra bảng hàng
3. pricing có duyệt

Không mở rộng ngoài 3 mục tiêu này nếu chưa được yêu cầu rõ.

---

## 2. Scope rules

### Phải giữ scope nhỏ và thực dụng
- ưu tiên MVP chạy được
- ưu tiên code đơn giản
- ưu tiên dễ debug
- ưu tiên tái sử dụng app hiện tại

### Không được tự thêm
- multi-agent
- CRM integration
- ERP integration
- vector database
- enterprise auth redesign
- notification system phức tạp
- workflow orchestration quá nặng

Nếu muốn thêm tính năng ngoài spec, phải đề xuất plan trước và chờ duyệt.

---

## 3. Data rules

### Google Sheets là data control layer chính
Ở các phase hiện tại, ưu tiên dùng Google Sheets cho:
- user access
- document master
- inventory master
- pricing policy
- approver mapping
- request log

### Không thêm database mới nếu chưa cần
Không tự động thêm PostgreSQL, MongoDB, Redis, Elasticsearch hoặc dịch vụ khác nếu chưa có yêu cầu rõ.

### Chỉ dùng dữ liệu active
- document phải có `status = active`
- policy phải có `status = active`
- user phải có `status = active`

Không được dùng dữ liệu archive để trả kết quả cuối.

---

## 4. Rules for LLM usage

### LLM được phép làm
- parse intent
- extract fields
- classify request type
- format final response text
- select best document from a small filtered candidate list

### LLM không được phép làm
- bịa inventory rows
- bịa policy
- tính toán giá kinh doanh bằng suy luận ngôn ngữ
- bỏ qua approval workflow
- tự quyết dữ liệu nào active nếu metadata đã rõ
- sinh final pricing output mà chưa approved

### Nguyên tắc chung
- model hỗ trợ hiểu ngữ nghĩa
- business logic phải nằm ở backend deterministic code hoặc template

---

## 5. Inventory rules

### Với phase inventory query
- parser có thể dùng model
- filtering phải làm trong backend
- kết quả cuối phải truy ngược được về row thật trong sheet
- phải có `updated_at` trong output nếu dữ liệu hỗ trợ
- nếu không có kết quả, trả empty state rõ ràng

### Không được
- dùng model để nghĩ ra danh sách căn
- trả căn không tồn tại trong dữ liệu
- bỏ qua trạng thái `available/reserved/sold/...`

---

## 6. Pricing rules

### Pricing phải deterministic
Phần tính toán giá phải dùng:
- rule code rõ ràng
hoặc
- template Google Sheet/Excel có công thức cố định

### Approval là bắt buộc
Mọi final pricing output phải qua approval.

### Trạng thái tối thiểu
- `draft`
- `pending_approval`
- `approved`
- `rejected`

### Không được
- để model tự tính discount/net price/interest
- xuất final output khi chưa approved
- bỏ log pricing request
- dùng policy không active

---

## 7. Planning rules

### Mọi thay đổi lớn phải bắt đầu bằng implementation plan
Trước khi viết code cho phase mới hoặc thay đổi lớn:
1. đọc spec tương ứng
2. tạo implementation plan
3. chỉ code sau khi plan được chấp nhận

### Plan tốt phải có
- mục tiêu
- file/module sẽ sửa
- data flow
- error handling
- logging
- test plan

---

## 8. Coding rules

### Ưu tiên code dễ hiểu
- tên biến rõ
- tên service rõ
- tách module theo chức năng
- comment ngắn, đúng chỗ
- không tạo abstraction quá sớm

### Service nên tách riêng
- auth/user access service
- google sheets service
- google drive/document service
- parser service
- inventory filter service
- pricing calculator service
- approval service
- logging service

### Không được
- nhét mọi logic vào một file lớn
- trộn parser, business rule và UI vào cùng một chỗ
- hardcode business numbers trong prompt

---

## 9. UI rules

### UI phải tối giản
- dễ dùng nội bộ
- không cần đẹp quá sớm
- ưu tiên rõ trạng thái
- ưu tiên hiển thị lỗi rõ
- ưu tiên hiển thị source / policy version / approval status

### Không cần ở giai đoạn này
- animation phức tạp
- dashboard quá to
- realtime collaboration
- role UI nhiều tầng phức tạp

---

## 10. Logging rules

Mỗi flow chính phải có log tối thiểu.

### Inventory log tối thiểu
- timestamp
- email
- question
- parsed_filters
- result_count
- status

### Pricing log tối thiểu
- request_id
- timestamp
- email
- project_name
- unit_code
- status
- policy_version
- approver
- approval_time

### Nguyên tắc
Không có log thì coi như flow chưa đủ tin cậy.

---

## 11. Error handling rules

Phải xử lý rõ các lỗi sau:
- user inactive
- thiếu dữ liệu sheet
- thiếu cột bắt buộc
- request parse lỗi
- no match
- no active policy
- approver missing
- pricing engine fail

### Không được
- crash app im lặng
- fallback bằng cách bịa câu trả lời
- bỏ qua lỗi để trả output không chắc chắn

---

## 12. Test rules

### Mỗi phase phải có test cases thật
- phase 1: tài liệu / policy / form / booking
- phase 2: inventory query
- phase 3: pricing + approval

### Mỗi test cần ghi
- input
- parsed result
- selected source
- output
- pass/fail
- issue note

---

## 13. Deployment mindset

- build nhỏ
- test thật
- sửa data trước khi sửa prompt
- sửa metadata trước khi tăng độ phức tạp
- giữ hệ thống có thể rollback
- chỉ scale khi phase hiện tại chạy ổn

---

## 14. Definition of done

### Phase được coi là xong khi
1. user flow chạy được
2. dữ liệu dùng đúng source active
3. output đúng với test cases thật
4. có log
5. không có hallucination ở business-critical step
6. lỗi được báo rõ
7. code còn dễ hiểu để sửa tiếp

Nếu chưa đạt đủ các điều kiện trên, chưa được mở rộng scope.
