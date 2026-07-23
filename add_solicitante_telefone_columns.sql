-- Executar este comando no SQL Editor do Supabase para adicionar as novas colunas na tabela de ordens de serviço:
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS solicitante TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS telefone_contato TEXT;
