-- Executar este comando no SQL Editor do Supabase para adicionar a nova coluna:
ALTER TABLE public.computadores ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT FALSE NOT NULL;
