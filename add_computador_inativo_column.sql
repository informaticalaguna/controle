-- Executar este comando no SQL Editor do Supabase para adicionar a nova coluna na tabela de ordens de serviço e atualizar a função de status:
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS computador_inativo BOOLEAN DEFAULT FALSE NOT NULL;

-- Atualizar a função trigger para considerar o computador_inativo como Concluído
CREATE OR REPLACE FUNCTION public.update_os_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.computador_inativo = TRUE THEN
    NEW.status := 'Concluído';
  ELSIF NEW.data_entrega IS NOT NULL THEN
    NEW.status := 'Concluído';
  ELSIF NEW.entregue = TRUE THEN
    NEW.status := 'Entregue';
  ELSIF NEW.reparo_concluido = TRUE THEN
    NEW.status := 'Pronto para retirada';
  ELSIF NEW.aguardando_pecas = TRUE THEN
    NEW.status := 'Aguardando peças';
  ELSE
    NEW.status := 'Em andamento';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
