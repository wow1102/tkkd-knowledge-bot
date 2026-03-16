/* 
-- SCRIPT TẠO DATABASE (DDL) CHO SUPABASE --
Hãy vào trang chủ Supabase SQL Editor và dán đoạn code này để khởi tạo cấu trúc bảng.
*/

-- Bảng AI_User_Access
CREATE TABLE IF NOT EXISTS public.ai_user_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email varchar(255) UNIQUE NOT NULL,
  name varchar(255),
  status varchar(50) DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT current_timestamp
);

-- Bảng AI_Document_Master
CREATE TABLE IF NOT EXISTS public.ai_document_master (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name varchar(255),
  document_type varchar(255),
  name varchar(255) NOT NULL,
  link text NOT NULL,
  status varchar(50) DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT current_timestamp
);

-- Bật RLS (Row Level Security) - Khuyến nghị cho Supabase
ALTER TABLE public.ai_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_document_master ENABLE ROW LEVEL SECURITY;

-- Cấp quyền ẩn danh cho phép SELECT dữ liệu từ 2 bảng này (Vì Server đang dùng Anon Key)
CREATE POLICY "Cho phép đọc mọi thứ trên User Access" 
  ON public.ai_user_access FOR SELECT 
  USING (true);

CREATE POLICY "Cho phép đọc mọi thứ trên Document Master" 
  ON public.ai_document_master FOR SELECT 
  USING (true);

-- (MẪU) Thêm dữ liệu giả vào bảng để bạn test thử với Real API
-- INSERT INTO public.ai_user_access (email, name, status) 
-- VALUES ('admin@example.com', 'Admin Demo', 'Active');
