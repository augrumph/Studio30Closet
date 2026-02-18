import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper, Users, Trophy, ChevronRight, Check } from 'lucide-react'
import { bingoService, generateBingoCard } from '@/lib/api/bingo'
import { cn } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'

export function BingoPlay() {
    const [pin, setPin] = useState('')
    const [game, setGame] = useState(null)
    const [participant, setParticipant] = useState(null)
    const [name, setName] = useState('')
    const [card, setCard] = useState([])
    const [leaderboard, setLeaderboard] = useState([])
    const [loading, setLoading] = useState(false)
    const [joining, setJoining] = useState(false)
    const [step, setStep] = useState('pin') // 'pin', 'name', 'lobby', 'game'
    const { toast } = useToast()

    // Inscrição em tempo real
    useEffect(() => {
        if (!game) return

        const subscription = bingoService.subscribeToGame(game.id, (payload) => {
            if (payload.type === 'GAME_UPDATE') {
                const updatedGame = payload.data
                setGame(updatedGame)
                if (updatedGame.status === 'started' && step === 'lobby') {
                    setStep('game')
                }
            } else if (payload.type === 'PARTICIPANT_UPDATE') {
                fetchLeaderboard()
            }
        })

        fetchLeaderboard()

        return () => {
            subscription.unsubscribe()
        }
    }, [game?.id, step])

    async function fetchLeaderboard() {
        if (!game) return
        const data = await bingoService.getLeaderboard(game.id)
        setLeaderboard(data)
    }

    const handleValidatePin = async (e) => {
        e.preventDefault()
        if (!pin.trim()) return

        setLoading(true)
        try {
            const foundGame = await bingoService.getGameByPin(pin.trim())
            if (foundGame) {
                setGame(foundGame)
                setStep('name')
            } else {
                toast.error('Sala não encontrada ou já iniciada.')
            }
        } catch (error) {
            toast.error('Erro ao buscar sala.')
        } finally {
            setLoading(false)
        }
    }

    const handleJoin = async (e) => {
        e.preventDefault()
        if (!name.trim() || !game) return

        setJoining(true)
        try {
            const newCard = generateBingoCard()
            const data = await bingoService.joinGame(game.id, name.trim(), newCard)
            setParticipant(data)
            setCard(newCard)
            setStep('lobby')
            toast.success('Você entrou na sala! 🎉')
        } catch (error) {
            console.error('Erro ao entrar no jogo:', error)
            toast.error('Erro ao entrar no jogo. Tente outro nome.')
        } finally {
            setJoining(false)
        }
    }

    const toggleNumber = async (rowIndex, colIndex) => {
        const newCard = [...card]
        const cell = newCard[rowIndex][colIndex]

        if (cell.value === 0) return // FREE space

        cell.marked = !cell.marked
        setCard(newCard)

        // Calcula novo score (quantos faltam)
        let markedCount = 0
        newCard.forEach(row => row.forEach(c => {
            if (c.marked) markedCount++
        }))

        const newScore = 25 - markedCount
        await bingoService.updateScore(participant.id, newScore)
    }

    const isCalled = (val) => game?.called_words?.includes(val)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFF1ED]">
                <div className="w-12 h-12 border-4 border-[#E67E5F] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (step === 'pin') {
        return (
            <div className="min-h-screen bg-[#E67E5F] flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
                {/* Decorativo Tropical Background */}
                <div className="absolute top-0 right-0 w-64 h-64 opacity-20 rotate-180 pointer-events-none">
                    <img src="/.gemini/antigravity/brain/ada3793f-c6ac-48ad-8174-49219b1dd8a3/bingo_tropical_assets_1771103421418.png" className="w-full h-full object-contain" />
                </div>
                <div className="absolute bottom-0 left-0 w-64 h-64 opacity-20 pointer-events-none">
                    <img src="/.gemini/antigravity/brain/ada3793f-c6ac-48ad-8174-49219b1dd8a3/bingo_tropical_assets_1771103421418.png" className="w-full h-full object-contain" />
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-md text-center relative z-10"
                >
                    <h2 className="text-2xl font-serif italic mb-2">Sunset Sips</h2>
                    <h1 className="text-7xl font-black mb-8 tracking-tighter uppercase">BINGO</h1>

                    <form onSubmit={handleValidatePin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="GAME PIN"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full px-6 py-6 border-4 border-white bg-transparent rounded-2xl text-4xl font-black text-center text-white placeholder-white/30 outline-none"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="w-full py-5 bg-white text-[#E67E5F] rounded-2xl font-black text-2xl hover:bg-gray-100 transition-all shadow-xl"
                        >
                            ENTRAR
                        </button>
                    </form>
                </motion.div>
            </div>
        )
    }

    if (step === 'name') {
        return (
            <div className="min-h-screen bg-[#FFF1ED] flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 text-center border-2 border-[#E67E5F]/10"
                >
                    <h2 className="text-[#E67E5F] font-serif italic text-xl mb-1">Studio 30 Closet</h2>
                    <h1 className="text-3xl font-black text-[#4A3B32] mb-8">Qual seu apelido?</h1>

                    <form onSubmit={handleJoin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Digite seu nome..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-6 py-5 bg-[#FFF1ED] border-2 border-transparent focus:border-[#E67E5F] rounded-2xl outline-none transition-all text-xl font-bold text-[#4A3B32]"
                            required
                        />
                        <button
                            type="submit"
                            disabled={joining}
                            className="w-full py-5 bg-[#E67E5F] text-white rounded-2xl font-black text-xl shadow-lg shadow-[#E67E5F]/30"
                        >
                            {joining ? 'ENTRANDO...' : 'VAMOS JOGAR! 🍹'}
                        </button>
                    </form>
                </motion.div>
            </div>
        )
    }

    if (step === 'lobby') {
        return (
            <div className="min-h-screen bg-[#E67E5F] flex flex-col items-center justify-center p-6 text-white text-center">
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <h2 className="text-3xl font-serif italic mb-2">Aguardando a Anfitriã...</h2>
                    <p className="text-xl font-bold opacity-80">O jogo começará em instantes!</p>
                    <div className="mt-12 w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="mt-8 font-black uppercase tracking-widest text-sm">{participant.name}, prepare as malas!</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FFF1ED] pb-12 relative overflow-hidden">
            {/* Background Decorativo */}
            <img src="/.gemini/antigravity/brain/ada3793f-c6ac-48ad-8174-49219b1dd8a3/bingo_tropical_assets_1771103421418.png" className="absolute -top-10 -right-10 w-48 h-48 opacity-40 rotate-180 pointer-events-none" />
            <img src="/.gemini/antigravity/brain/ada3793f-c6ac-48ad-8174-49219b1dd8a3/bingo_tropical_assets_1771103421418.png" className="absolute -bottom-10 -left-10 w-48 h-48 opacity-40 pointer-events-none" />

            {/* Header Fixo Customizado */}
            <header className="bg-white/90 backdrop-blur-md px-6 py-6 text-center border-b border-[#E67E5F]/10 mb-6">
                <p className="text-[#E67E5F] font-serif italic text-lg leading-tight">Sunset Sips</p>
                <p className="text-[#E67E5F] text-xs font-bold uppercase tracking-[0.2em] mb-1">Studio 30 Closet</p>
                <h1 className="text-4xl font-black text-[#FFB7A1] italic leading-none">BINGO</h1>
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-6 relative z-10">

                {/* Placar Realtime */}
                <section className="bg-white/50 backdrop-blur rounded-2xl p-4 flex gap-3 overflow-x-auto no-scrollbar border border-[#E67E5F]/5">
                    {leaderboard.map((player) => (
                        <div
                            key={player.name}
                            className={cn(
                                "flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                player.name === participant.name
                                    ? "bg-[#E67E5F] text-white"
                                    : "bg-white text-[#4A3B32] shadow-sm"
                            )}
                        >
                            {player.name}: {player.score}
                        </div>
                    ))}
                </section>

                {/* Cartela 4x4 */}
                <div className="grid grid-cols-4 border-2 border-[#E67E5F] bg-[#FFDED3]">
                    {card.map((row, rIdx) =>
                        row.map((cell, cIdx) => (
                            <motion.button
                                key={`${rIdx}-${cIdx}`}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleNumber(rIdx, cIdx)}
                                className={cn(
                                    "aspect-square border border-[#E67E5F] p-2 flex flex-col items-center justify-center text-center transition-all relative",
                                    cell.marked
                                        ? "bg-[#FAD9CE]"
                                        : isCalled(cell.value)
                                            ? "bg-white animate-pulse"
                                            : "bg-[#FFEFED]"
                                )}
                            >
                                <span className={cn(
                                    "text-[0.7rem] md:text-sm font-bold leading-tight uppercase",
                                    cell.marked ? "text-[#E67E5F]" : "text-[#4A3B32]"
                                )}>
                                    {cell.value}
                                </span>

                                {cell.marked && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="absolute inset-0 border-2 border-[#E67E5F] pointer-events-none"
                                    />
                                )}
                                {isCalled(cell.value) && !cell.marked && (
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-[#E67E5F] rounded-full" />
                                )}
                            </motion.button>
                        ))
                    )}
                </div>

                {/* BINGO Button */}
                <AnimatePresence>
                    {participant.score === 0 && (
                        <motion.button
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="w-full py-8 bg-[#E67E5F] text-white rounded-[2rem] font-black text-4xl shadow-2xl shadow-[#E67E5F]/40 animate-bounce mt-4"
                        >
                            BINGO!!!! 🎉
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Chamadas */}
                <div className="bg-white/40 p-4 rounded-2xl border border-[#E67E5F]/10">
                    <p className="text-[10px] font-black text-[#E67E5F] uppercase mb-2">Já Chamados</p>
                    <div className="flex flex-wrap gap-2">
                        {game.called_words?.slice().reverse().map(word => (
                            <span key={word} className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-[#4A3B32] shadow-sm">
                                {word}
                            </span>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}
