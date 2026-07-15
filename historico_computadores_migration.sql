-- 1. CRIAR A TABELA DE HISTÓRICO DE ALTERAÇÕES
CREATE TABLE IF NOT EXISTS public.historico_computadores (
    id SERIAL PRIMARY KEY,
    computador_id INTEGER REFERENCES public.computadores(id) ON DELETE CASCADE NOT NULL,
    data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Secretaria (Anterior e Nova)
    secretaria_anterior_id INTEGER REFERENCES public.secretarias(id),
    secretaria_nova_id INTEGER REFERENCES public.secretarias(id),
    
    -- Local / Setor (Anterior e Novo)
    local_anterior TEXT,
    local_novo TEXT,
    
    -- Usuário / Dono (Anterior e Novo)
    usuario_anterior TEXT,
    usuario_novo TEXT,
    
    -- Quem fez a alteração
    alterado_por TEXT
);

-- 2. FUNÇÃO DA TRIGGER PARA REGISTRAR A TRANSAÇÃO
CREATE OR REPLACE FUNCTION public.log_computador_alteracao()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- Só registra se houve mudança em Secretaria, Local/Setor ou Usuário
  IF OLD.secretaria_id IS DISTINCT FROM NEW.secretaria_id OR
     OLD.local IS DISTINCT FROM NEW.local OR
     OLD.usuario IS DISTINCT FROM NEW.usuario THEN
     
    -- Tenta buscar o nome do usuário autenticado no perfil do Supabase (RBAC)
    SELECT nome_completo INTO v_user_name 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    INSERT INTO public.historico_computadores (
      computador_id,
      secretaria_anterior_id,
      secretaria_nova_id,
      local_anterior,
      local_novo,
      usuario_anterior,
      usuario_novo,
      alterado_por
    )
    VALUES (
      OLD.id,
      OLD.secretaria_id,
      NEW.secretaria_id,
      OLD.local,
      NEW.local,
      OLD.usuario,
      NEW.usuario,
      COALESCE(v_user_name, 'Sistema / Importação')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CRIAR A TRIGGER DE ATUALIZAÇÃO
CREATE OR REPLACE TRIGGER trigger_log_computador_alteracao
  AFTER UPDATE ON public.computadores
  FOR EACH ROW EXECUTE FUNCTION public.log_computador_alteracao();

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.historico_computadores ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICA DE LEITURA (APENAS PARA USUÁRIOS AUTENTICADOS)
CREATE POLICY "Qualquer logado vê o histórico" ON public.historico_computadores 
    FOR SELECT USING (auth.role() = 'authenticated');
