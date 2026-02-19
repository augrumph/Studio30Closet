import { useState, useEffect } from 'react'
import { bingoService, BINGO_WORDS } from '@/lib/api/bingo'
import { Loader2, Plus, Users, RotateCcw, Eye, EyeOff, Play, Trophy, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/contexts/ToastContext'
import { cn } from '@/lib/utils'

export function BingoAdmin() {
    const [game, setGame] = useState(null)
    const [participants, setParticipants] = useState([])
    const [loading, setLoading] = useState(true)
    const [showBoard, setShowBoard] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        async function init() {
            try {
                const activeGame = await bingoService.getOrCreateGame()
                setGame(activeGame)
            } catch (error) {
                console.error('Erro ao buscar jogo:', error)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    useEffect(() => {
        if (!game) return

        const subscription = bingoService.subscribeToGame(game.id, (payload) => {
            if (payload.type === 'GAME_UPDATE') {
                setGame(payload.data)
            } else if (payload.type === 'PARTICIPANT_UPDATE') {
                fetchParticipants()
            }
        })

        fetchParticipants()

        return () => {
            subscription.unsubscribe()
        }
    }, [game?.id])

    async function fetchParticipants() {
        if (!game) return
        const { data } = await bingoService.getParticipants(game.id)
        if (data) setParticipants(data)
    }

    const drawWord = async () => {
        const available = BINGO_WORDS.filter(w => !game.called_words?.includes(w))
        if (available.length === 0) {
            toast.error('Todas as palavras já foram chamadas!')
            return
        }

        const nextWord = available[Math.floor(Math.random() * available.length)]
        const newList = [...(game.called_words || []), nextWord]

        try {
            await bingoService.drawWord(game.id, newList)
            toast.success(`Palavra chamada: ${nextWord}`)
        } catch (error) {
            toast.error('Erro ao sortear')
        }
    }

    const resetGame = async () => {
        if (!confirm('Deseja realmente resetar o jogo? Todos os participantes serão removidos.')) return
        try {
            await bingoService.resetGame(game.id)
            window.location.reload()
        } catch (error) {
            toast.error('Erro ao resetar')
        }
    }

    const startGame = async () => {
        try {
            await bingoService.updateStatus(game.id, 'started')
            toast.success('Jogo iniciado! Boa sorte a todos!')
        } catch (error) {
            toast.error('Erro ao iniciar jogo')
        }
    }

    if (loading || !game) {
        return (
            <AnimatePresence>
                {showBoard && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
                    >
                        <div className="grid grid-cols-10 gap-2">
                            {numbers.map(num => (
                                <div
                                    key={num}
                                    className={cn(
                                        "aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-500",
                                        game.called_numbers?.includes(num)
                                            ? "bg-[#4A3B32] text-white scale-110 shadow-lg"
                                            : "bg-gray-50 text-gray-300"
                                    )}
                                >
                                    {num}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
                    </div >

            {/* Sidebar de Progresso */ }
            < div className = "space-y-6" >
                        <div className="bg-[#FAF3F0] rounded-3xl p-6 border border-[#C75D3B]/10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Users className="w-6 h-6 text-[#C75D3B]" />
                                    <h2 className="text-xl font-black text-[#4A3B32]">Jogadores</h2>
                                </div>
                                <span className="bg-white px-3 py-1 rounded-full text-[#C75D3B] font-bold text-sm">
                                    {participants.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {participants.length === 0 && (
                                    <p className="text-gray-400 text-center py-8">Aguardando participantes entrarem...</p>
                                )}
                                {participants.map((p, i) => (
                                    <motion.div
                                        layout
                                        key={p.name}
                                        className={cn(
                                            "p-4 rounded-2xl flex items-center justify-between transition-all",
                                            p.score === 0 ? "bg-amber-100 border-2 border-amber-400 animate-pulse" : "bg-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs">
                                                {i + 1}
                                            </div>
                                            <span className="font-bold text-[#4A3B32]">{p.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "text-xl font-black",
                                                p.score <= 3 ? "text-red-500" : "text-[#C75D3B]"
                                            )}>
                                                {p.score === 0 ? 'BINGO!' : p.score}
                                            </span>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">faltam</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-3xl p-6 text-white overflow-hidden relative">
                            <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12" />
                            <h3 className="text-lg font-bold mb-2">Resumo da Rodada</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-xs">Chamados</p>
                                    <p className="text-2xl font-black">{game.called_numbers?.length || 0}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Restantes</p>
                                    <p className="text-2xl font-black">{75 - (game.called_numbers?.length || 0)}</p>
                                </div>
                            </div>
                        </div>
                    </div >

                </div >
        </div >
    )
    }
