
-- Create a storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Add access control policy for the documents bucket
INSERT INTO storage.policies (name, definition, bucket_id)
VALUES (
  'Public Documents Policy',
  '(bucket_id = ''documents''::text)',
  'documents'
)
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Create document_files table to store metadata
CREATE TABLE IF NOT EXISTS public.document_files (
  id SERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS document_files_lead_id_idx ON public.document_files (lead_id);
CREATE INDEX IF NOT EXISTS document_files_category_idx ON public.document_files (category);
CREATE INDEX IF NOT EXISTS document_files_subcategory_idx ON public.document_files (subcategory);
