-- sheet_title, sheet_description 컬럼 추가
ALTER TABLE public.excel_uploads ADD COLUMN IF NOT EXISTS sheet_title text;
ALTER TABLE public.excel_uploads ADD COLUMN IF NOT EXISTS sheet_description text;
