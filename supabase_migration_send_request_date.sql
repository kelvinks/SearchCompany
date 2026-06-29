-- 접수일, 요청일 컬럼 추가
ALTER TABLE public.excel_uploads ADD COLUMN IF NOT EXISTS send_date date;
ALTER TABLE public.excel_uploads ADD COLUMN IF NOT EXISTS request_date date;
