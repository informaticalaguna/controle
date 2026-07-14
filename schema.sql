-- 1. TABELAS AUXILIARES
CREATE TABLE IF NOT EXISTS public.secretarias (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marcas (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.equipamentos (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.defeitos (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.locais (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL
);

-- Popular tabelas auxiliares
INSERT INTO public.secretarias (nome) VALUES 
('ADMINISTRAÇÃO'), ('BIBLIOTECA'), ('EDUCAÇÃO'), ('SEPAGRI'), ('PROCURADORIA'), 
('ASS. SOCIAL'), ('GABINETE'), ('CULTURA'), ('TURISMO'), ('OBRAS'), 
('PLANEJAMENTO'), ('FLAMA'), ('GUARDA MUNICIPAL'), ('PROCON'), ('SAÚDE'), ('OUTROS')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.marcas (nome) VALUES 
('LENOVO V50S'), ('LENOVO NEO'), ('POSITIVO MASTER 950 (ANTIGO)'), 
('POSITIVO MASTER 2100 (NOVO)'), ('ACER'), ('DELL XPS'), ('DELL NOTEBOOK'), 
('LENOVO NOTEBOOK'), ('POSITIVO NOTEBOOK'), ('CONCÓRDIA DESKTOP'), ('HP'), 
('POSITIVO'), ('SAMSUNG'), ('LENOVO'), ('OUTROS'), ('VAIO')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.equipamentos (nome) VALUES 
('DESKTOP'), ('ALL IN ONE'), ('NOTEBOOK'), ('OUTROS')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.defeitos (nome) VALUES 
('NÃO LIGA'), ('NÃO DA VÍDEO'), ('TRAVAMENTOS'), ('VÍRUS'), ('LENTIDÃO'), 
('BARULHO'), ('TELA AZUL'), ('NÃO CONECTA INTERNET'), ('NÃO ENCONTRADO DEFEITO'), ('OUTROS')
ON CONFLICT (nome) DO NOTHING;

-- 2. TABELA DE PERFIS DE USUÁRIO (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    cargo TEXT,
    permissao TEXT NOT NULL CHECK (permissao IN ('Administrador', 'Usuário Nível 1')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE COMPUTADORES
CREATE TABLE IF NOT EXISTS public.computadores (
    id SERIAL PRIMARY KEY,
    id_legado TEXT,
    patrimonio NUMERIC UNIQUE,
    data_cadastro DATE DEFAULT CURRENT_DATE NOT NULL,
    secretaria_id INTEGER REFERENCES public.secretarias(id),
    local_id INTEGER REFERENCES public.locais(id),
    marca_id INTEGER REFERENCES public.marcas(id),
    equipamento_id INTEGER REFERENCES public.equipamentos(id),
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    garantia_ativa BOOLEAN DEFAULT FALSE NOT NULL
);

-- 4. TABELA DE ORDENS DE SERVIÇO (OS)
CREATE TABLE IF NOT EXISTS public.ordens_servico (
    id SERIAL PRIMARY KEY,
    computador_id INTEGER REFERENCES public.computadores(id) ON DELETE CASCADE NOT NULL,
    data_abertura DATE DEFAULT CURRENT_DATE NOT NULL,
    defeito_id INTEGER REFERENCES public.defeitos(id) NOT NULL,
    status TEXT DEFAULT 'Em andamento' NOT NULL CHECK (status IN ('Em andamento', 'Pronto para retirada', 'Concluído', 'Entregue')),
    solucao_encontrada TEXT,
    formatado BOOLEAN DEFAULT FALSE NOT NULL,
    backup_realizado BOOLEAN DEFAULT FALSE NOT NULL,
    aguardando_pecas BOOLEAN DEFAULT FALSE NOT NULL,
    reparo_concluido BOOLEAN DEFAULT FALSE NOT NULL,
    entregue BOOLEAN DEFAULT FALSE NOT NULL,
    entregue_para TEXT,
    data_entrega DATE,
    observacao TEXT,
    criado_por TEXT
);

-- 5. FUNÇÕES E TRIGGERS
-- A. Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, cargo, permissao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'Técnico'),
    COALESCE(NEW.raw_user_meta_data->>'permissao', 'Usuário Nível 1')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Trigger de Atualização do Status da OS
CREATE OR REPLACE FUNCTION public.update_os_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_entrega IS NOT NULL THEN
    NEW.status := 'Concluído';
  ELSIF NEW.entregue = TRUE THEN
    NEW.status := 'Entregue';
  ELSIF NEW.reparo_concluido = TRUE THEN
    NEW.status := 'Pronto para retirada';
  ELSE
    NEW.status := 'Em andamento';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER before_os_insert_or_update
  BEFORE INSERT OR UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_os_status();

-- C. Trigger para definir criado_por automaticamente
CREATE OR REPLACE FUNCTION public.set_os_criado_por()
RETURNS TRIGGER AS $$
BEGIN
  SELECT nome_completo INTO NEW.criado_por 
  FROM public.profiles 
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER before_os_insert_criado_por
  BEFORE INSERT ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.set_os_criado_por();

-- 6. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defeitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar se é Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND permissao = 'Administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para Profiles
CREATE POLICY "Qualquer um logado pode ver perfis" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins podem atualizar perfis" ON public.profiles FOR ALL USING (public.is_admin());

-- Políticas para Tabelas Auxiliares (Leitura pública/autenticada, Edição apenas Admin)
CREATE POLICY "Qualquer logado vê secretarias" ON public.secretarias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin edita secretarias" ON public.secretarias FOR ALL USING (public.is_admin());

CREATE POLICY "Qualquer logado vê marcas" ON public.marcas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin edita marcas" ON public.marcas FOR ALL USING (public.is_admin());

CREATE POLICY "Qualquer logado vê equipamentos" ON public.equipamentos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin edita equipamentos" ON public.equipamentos FOR ALL USING (public.is_admin());

CREATE POLICY "Qualquer logado vê defeitos" ON public.defeitos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin edita defeitos" ON public.defeitos FOR ALL USING (public.is_admin());

CREATE POLICY "Qualquer logado vê locais" ON public.locais FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Qualquer logado insere/atualiza locais" ON public.locais FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Políticas para Computadores
CREATE POLICY "Qualquer um (mesmo não logado) lê computadores" ON public.computadores FOR SELECT USING (true);
CREATE POLICY "Qualquer logado insere computadores" ON public.computadores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Qualquer logado atualiza computadores" ON public.computadores FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Apenas Admin deleta computadores" ON public.computadores FOR DELETE USING (public.is_admin());

-- Políticas para Ordens de Serviço
CREATE POLICY "Qualquer um (mesmo não logado) lê OS" ON public.ordens_servico FOR SELECT USING (true);
CREATE POLICY "Qualquer logado insere OS" ON public.ordens_servico FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Qualquer logado atualiza OS" ON public.ordens_servico FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Apenas Admin deleta OS" ON public.ordens_servico FOR DELETE USING (public.is_admin());
