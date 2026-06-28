-- 1. Create deleted_companies table
CREATE TABLE IF NOT EXISTS public.deleted_companies (
  id uuid PRIMARY KEY,
  business_number varchar(20),
  company_name varchar(255) NOT NULL,
  location varchar(500),
  main_products varchar(500),
  support_field varchar(255),
  additional_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone,
  deleted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create deleted_support_histories table
CREATE TABLE IF NOT EXISTS public.deleted_support_histories (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES public.deleted_companies(id) ON DELETE CASCADE NOT NULL,
  business_number varchar(20),
  year varchar(4) NOT NULL,
  program_name varchar(255) NOT NULL,
  project_name varchar(500),
  status varchar(50) NOT NULL,
  selected_amount bigint DEFAULT 0 NOT NULL,
  support_amount bigint DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamp with time zone,
  deleted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Trigger Function to archive data BEFORE DELETE on companies
CREATE OR REPLACE FUNCTION public.archive_company_data_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Copy company info to deleted_companies table
  INSERT INTO public.deleted_companies (
    id, business_number, company_name, location, main_products, support_field, additional_data, created_at
  ) VALUES (
    OLD.id, OLD.business_number, OLD.company_name, OLD.location, OLD.main_products, OLD.support_field, OLD.additional_data, OLD.created_at
  )
  ON CONFLICT (id) DO NOTHING;

  -- Copy support histories associated with the deleted company
  INSERT INTO public.deleted_support_histories (
    id, company_id, business_number, year, program_name, project_name, status, selected_amount, support_amount, notes, created_at
  )
  SELECT 
    id, company_id, business_number, year, program_name, project_name, status, selected_amount, support_amount, notes, created_at
  FROM public.support_histories
  WHERE company_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply TRIGGER to companies table
DROP TRIGGER IF EXISTS trg_archive_company_data_before_delete ON public.companies;
CREATE TRIGGER trg_archive_company_data_before_delete
BEFORE DELETE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.archive_company_data_before_delete();

-- 5. Create restore_company_data RPC database function
CREATE OR REPLACE FUNCTION public.restore_company_data(target_company_id uuid)
RETURNS void AS $$
BEGIN
  -- Restore company back to companies table
  INSERT INTO public.companies (
    id, business_number, company_name, location, main_products, support_field, additional_data, created_at
  )
  SELECT 
    id, business_number, company_name, location, main_products, support_field, additional_data, created_at
  FROM public.deleted_companies
  WHERE id = target_company_id;

  -- Restore support histories associated with the company
  INSERT INTO public.support_histories (
    id, company_id, business_number, year, program_name, project_name, status, selected_amount, support_amount, notes, created_at
  )
  SELECT 
    id, company_id, business_number, year, program_name, project_name, status, selected_amount, support_amount, notes, created_at
  FROM public.deleted_support_histories
  WHERE company_id = target_company_id;

  -- Delete from archive table (cascade deletes child histories)
  DELETE FROM public.deleted_companies
  WHERE id = target_company_id;
END;
$$ LANGUAGE plpgsql;
