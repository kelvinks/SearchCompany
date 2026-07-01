-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Companies Table
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  business_number varchar(20) unique, -- business number (can be null for pre-startups)
  company_name varchar(255) not null,
  location varchar(500),
  main_products varchar(500),
  support_field varchar(255),
  additional_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Support Histories Table
create table public.support_histories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  business_number varchar(20), -- synced key (business registration number)
  year varchar(4) not null,
  program_name varchar(255) not null,
  project_name varchar(500),
  status varchar(50) not null check (status in ('선정', '완료', '포기', '제외')),
  selected_amount bigint default 0 not null,
  support_amount bigint default 0 not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Search Logs Table
create table public.search_logs (
  id uuid primary key default gen_random_uuid(),
  type varchar(50) not null check (type in ('BATCH', 'MANUAL')),
  risk_level varchar(50) not null check (risk_level in ('High Risk', 'Safe', 'Manual Search')),
  title varchar(255) not null,
  org_name varchar(255),
  doc_num varchar(255),
  description text,
  total_count integer,
  duplicate_count integer,
  business_number varchar(20), -- synced key
  additional_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexing for performance
create index idx_companies_business_number on public.companies(business_number);
create index idx_companies_company_name on public.companies(company_name);
create index idx_support_histories_company_id on public.support_histories(company_id);
create index idx_support_histories_business_number on public.support_histories(business_number);

-- Triggers to automatically sync business_number from companies table
CREATE OR REPLACE FUNCTION public.sync_support_history_business_number_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  SELECT business_number INTO NEW.business_number
  FROM public.companies
  WHERE id = NEW.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_support_history_business_number_on_insert
BEFORE INSERT OR UPDATE OF company_id ON public.support_histories
FOR EACH ROW
EXECUTE FUNCTION public.sync_support_history_business_number_on_insert();

CREATE OR REPLACE FUNCTION public.sync_support_history_business_number_on_company_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.business_number IS DISTINCT FROM NEW.business_number THEN
    UPDATE public.support_histories
    SET business_number = NEW.business_number
    WHERE company_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_support_history_business_number_on_company_update
AFTER UPDATE OF business_number ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.sync_support_history_business_number_on_company_update();

-- Create Excel Uploads Table
CREATE TABLE public.excel_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name varchar(255) NOT NULL,
  file_size integer,
  file_url text,
  sheet_name varchar(255),
  total_rows integer,
  parsed_data jsonb DEFAULT '[]'::jsonb,
  column_headers text[],
  upload_note text,
  program_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for excel_uploads
CREATE INDEX idx_excel_uploads_created_at ON public.excel_uploads(created_at DESC);
CREATE INDEX idx_excel_uploads_file_name ON public.excel_uploads(file_name);
