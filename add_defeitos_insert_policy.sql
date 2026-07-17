-- Executar este comando no SQL Editor do Supabase para permitir que qualquer técnico logado possa cadastrar novos defeitos personalizados ao usar a opção "OUTROS":
CREATE POLICY "Qualquer logado insere defeitos" ON public.defeitos 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');
