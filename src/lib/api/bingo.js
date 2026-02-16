import { supabase } from '../supabase'

export const bingoService = {
    async createGame(title = 'Bingo da Empresa') {
        const { data, error } = await supabase
            .from('bingo_games')
            .insert({ title, status: 'waiting' })
            .select()
            .single()
        if (error) throw error
        return data
    },

    async getActiveGames() {
        const { data, error } = await supabase
            .from('bingo_games')
            .select('*')
            .eq('status', 'waiting')
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    async joinGame(gameId, name, cardNumbers) {
        const { data, error } = await supabase
            .from('bingo_participants')
            .insert({ game_id: gameId, name, card_numbers: cardNumbers })
            .select()
            .single()
        if (error) throw error
        return data
    },

    async getGame(gameId) {
        const { data, error } = await supabase
            .from('bingo_games')
            .select('*')
            .eq('id', gameId)
            .single()
        if (error) throw error
        return data
    },

    async getParticipants(gameId) {
        const { data, error } = await supabase
            .from('bingo_participants')
            .select('*')
            .eq('game_id', gameId)
        if (error) throw error
        return data
    },

    async callNumber(gameId, numbers) {
        const { data, error } = await supabase
            .from('bingo_games')
            .update({ called_numbers: numbers })
            .eq('id', gameId)
        if (error) throw error
        return data
    },

    async updateGameStatus(gameId, status) {
        const { data, error } = await supabase
            .from('bingo_games')
            .update({ status })
            .eq('id', gameId)
        if (error) throw error
        return data
    },

    subscribeToGame(gameId, onUpdate) {
        return supabase
            .channel(`game:${gameId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'bingo_games',
                filter: `id=eq.${gameId}`
            }, (payload) => onUpdate(payload.new))
            .subscribe()
    }
}

export const generateBingoCard = () => {
    const card = []
    const ranges = [
        [1, 15],  // B
        [16, 30], // I
        [31, 45], // N
        [46, 60], // G
        [61, 75]  // O
    ]

    for (let col = 0; col < 5; col++) {
        const colNumbers = []
        const [min, max] = ranges[col]
        while (colNumbers.length < 5) {
            const num = Math.floor(Math.random() * (max - min + 1)) + min
            if (!colNumbers.includes(num)) {
                colNumbers.push(num)
            }
        }
        card.push(colNumbers.sort((a, b) => a - b))
    }

    // Transpose to 5x5 rows
    const rows = []
    for (let r = 0; r < 5; r++) {
        const row = []
        for (let c = 0; c < 5; c++) {
            if (r === 2 && c === 2) {
                row.push(0) // FREE SPACE
            } else {
                row.push(card[c][r])
            }
        }
        rows.push(row)
    }
    return rows
}
