-- Create bingo_games table
CREATE TABLE IF NOT EXISTS public.bingo_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'started', 'finished')),
    called_numbers INTEGER[] DEFAULT '{}',
    admin_id UUID REFERENCES auth.users(id),
    title TEXT DEFAULT 'Bingo da Empresa'
);

-- Create bingo_participants table
CREATE TABLE IF NOT EXISTS public.bingo_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.bingo_games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    card_numbers INTEGER[][] NOT NULL, -- 5x5 matrix
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(game_id, name)
);

-- Enable RLS
ALTER TABLE public.bingo_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bingo_participants ENABLE ROW LEVEL SECURITY;

-- Policies for bingo_games
CREATE POLICY "Allow public read for active games" ON public.bingo_games
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage games" ON public.bingo_games
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for bingo_participants
CREATE POLICY "Allow public insert to join game" ON public.bingo_participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow participants to read their own data" ON public.bingo_participants
    FOR SELECT USING (true); -- Simplified for public participation

CREATE POLICY "Allow admins to manage participants" ON public.bingo_participants
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bingo_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bingo_participants;
