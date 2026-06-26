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
  representative varchar(255),
  additional_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Support Histories Table
create table public.support_histories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  year varchar(4) not null,
  program_name varchar(255) not null,
  status varchar(50) not null check (status in ('완료', '포기', '제외', '진행중')),
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
  brn varchar(20),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexing for performance
create index idx_companies_business_number on public.companies(business_number);
create index idx_companies_company_name on public.companies(company_name);
create index idx_support_histories_company_id on public.support_histories(company_id);
