-- Excel Uploads 테이블 생성
CREATE TABLE IF NOT EXISTS public.excel_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name varchar(255) NOT NULL,
  file_size integer,
  file_url text,
  sheet_name varchar(255),
  total_rows integer,
  parsed_data jsonb DEFAULT '[]'::jsonb,
  column_headers text[],
  upload_note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_excel_uploads_created_at ON public.excel_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_excel_uploads_file_name ON public.excel_uploads(file_name);

-- RLS 비활성화 (개발 환경)
ALTER TABLE public.excel_uploads DISABLE ROW LEVEL SECURITY;
