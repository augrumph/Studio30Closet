-- Limpar tabelas anteriores para evitar erros de duplicidade ou schema antigo
DROP TABLE IF EXISTS public.bingo_participants;
DROP TABLE IF EXISTS public.bingo_games;

-- Tabela para gerenciar as sessões de bingo
CREATE TABLE public.bingo_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'started', 'finished')),
    called_words TEXT[] DEFAULT '{}',
    title TEXT DEFAULT 'Bingo Studio 30',
    pin TEXT UNIQUE NOT NULL
);



-- Tabela para os participantes e suas cartelas
CREATE TABLE public.bingo_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.bingo_games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    card_numbers JSONB NOT NULL, -- Matriz 5x5
    score INTEGER DEFAULT 24, -- Quantos números faltam para o Bingo (25 - 1 do FREE)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(game_id, name)
);

-- Tenta adicionar ao realtime (ignora se já existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'bingo_games'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bingo_games;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'bingo_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bingo_participants;
    END IF;
END $$;

-- Políticas de Segurança
ALTER TABLE public.bingo_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bingo_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público leitura jogos" ON public.bingo_games FOR SELECT USING (true);
CREATE POLICY "Acesso total admin jogos" ON public.bingo_games FOR ALL USING (true);
CREATE POLICY "Acesso público leitura participantes" ON public.bingo_participants FOR SELECT USING (true);
CREATE POLICY "Acesso público cadastro participantes" ON public.bingo_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Acesso público update pontuação" ON public.bingo_participants FOR UPDATE USING (true);
