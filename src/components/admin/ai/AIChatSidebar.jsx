import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Database, Trash2, X, Plus, History, MessageSquare, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Markdown from 'react-markdown'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore, selectActiveChatMessages } from '@/store/chat-store'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAIStream } from '@/hooks/useAIChat'

export function AIChatSidebar({ isOpen, onClose }) {
    // ✅ Use selectors para evitar re-renders desnecessários
    const chats = useChatStore(state => state.chats)
    const activeChatId = useChatStore(state => state.activeChatId)
    const createChat = useChatStore(state => state.createChat)
    const addMessage = useChatStore(state => state.addMessage)
    const updateMessage = useChatStore(state => state.updateMessage)
    const setActiveChat = useChatStore(state => state.setActiveChat)
    const deleteChat = useChatStore(state => state.deleteChat)
    const updateChatTitle = useChatStore(state => state.updateChatTitle)

    const [input, setInput] = useState('')
    const [showHistory, setShowHistory] = useState(false)
    const messagesEndRef = useRef(null)

    // ✅ Hook otimizado com streaming
    const { streamedContent, isStreaming, startStream } = useAIStream()

    // Ensure there is an active chat when opening
    useEffect(() => {
        if (isOpen && !activeChatId && chats.length === 0) {
            createChat()
        } else if (isOpen && !activeChatId && chats.length > 0) {
            setActiveChat(chats[0].id)
        }
    }, [isOpen, activeChatId, chats.length, createChat, setActiveChat])

    const activeChat = chats.find(c => c.id === activeChatId)
    const messages = activeChat?.messages || []

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Auto-scroll when messages change
    useEffect(() => {
        if (isOpen && !showHistory && messages.length > 1) {
            setTimeout(scrollToBottom, 300)
        }
    }, [messages, isOpen, showHistory])

    // ✅ handleSend otimizado com streaming
    const handleSend = useCallback(async () => {
        if (!input.trim() || isStreaming || !activeChatId) return

        const currentInput = input
        const userMessage = { id: Date.now().toString(), role: 'user', content: currentInput }

        // Add user message to store
        addMessage(activeChatId, userMessage)
        setInput('')

        // Update title if it's the first real interaction and title is generic
        if (messages.length <= 1 && activeChat?.title === 'Nova Conversa') {
            const newTitle = currentInput.length > 30 ? currentInput.substring(0, 30) + '...' : currentInput
            updateChatTitle(activeChatId, newTitle)
        }

        setTimeout(scrollToBottom, 100)

        // Create placeholder message for streaming
        const aiMessageId = (Date.now() + 1).toString()
        addMessage(activeChatId, {
            id: aiMessageId,
            role: 'assistant',
            content: '',
            isStreaming: true
        })

        try {
            // ✅ Streaming de resposta - feedback visual instantâneo
            const response = await startStream(currentInput, (chunk) => {
                updateMessage(activeChatId, aiMessageId, chunk)
                setTimeout(scrollToBottom, 50)
            })

            // ✅ Atualizar mensagem existente com todos os dados finais
            updateMessage(activeChatId, aiMessageId, {
                content: response.answer,
                sql: response.sql,
                data: response.data,
                isStreaming: false
            })
        } catch (error) {
            console.error(error)
            updateMessage(activeChatId, aiMessageId, 'Desculpe, tive um problema ao processar sua pergunta. Tente novamente.')
        }
    }, [input, isStreaming, activeChatId, messages.length, activeChat?.title, addMessage, updateMessage, updateChatTitle, startStream])

    const handleNewChat = () => {
        createChat()
        setShowHistory(false)
        if (window.innerWidth < 768) {
            // Optional: Close history automatically on mobile if we were designing for it, 
            // but here checking innerWidth just in case logic is needed.
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[600px] md:max-w-[700px] p-0 flex flex-col h-[100dvh] border-l border-brand-terracotta/20 bg-white/95 backdrop-blur-xl"
            >
                {/* Header Premium */}
                <div className="px-5 py-4 border-b border-brand-peach/10 bg-white/80 backdrop-blur-md z-10 shrink-0 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-terracotta to-brand-rust flex items-center justify-center shadow-lg shadow-brand-terracotta/20 group overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-[15px] font-bold text-brand-brown tracking-tight flex items-center gap-2">
                                Midi
                                {activeChat && !showHistory && (
                                    <span className="text-xs font-normal text-gray-400 hidden sm:inline-block">
                                        • {activeChat.title}
                                    </span>
                                )}
                            </SheetTitle>
                            <SheetDescription className="m-0 text-[11px] font-medium text-brand-rust/80">
                                Cientista de Dados Studio 30
                            </SheetDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                showHistory ? "bg-brand-peach/20 text-brand-rust" : "hover:bg-brand-peach/10 text-brand-brown/40 hover:text-brand-brown"
                            )}
                            title="Histórico de Conversas"
                        >
                            <History className="w-5 h-5" />
                        </button>

                        <button
                            onClick={handleNewChat}
                            className="p-2 rounded-lg hover:bg-brand-peach/10 text-brand-brown/40 hover:text-brand-brown transition-colors"
                            title="Nova Conversa"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        <div className="w-px h-6 bg-gray-200 mx-1" />

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-brand-peach/10 text-brand-brown/40 hover:text-brand-brown transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative bg-slate-50/50">
                    <AnimatePresence mode="wait">
                        {showHistory ? (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full"
                            >
                                <ScrollArea className="h-full">
                                    <div className="p-6 space-y-4">
                                        <h3 className="text-xs font-bold text-brand-brown/50 uppercase tracking-wider mb-4">Suas Conversas</h3>
                                        {chats.length === 0 ? (
                                            <div className="text-center py-10 text-gray-400">
                                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p>Nenhuma conversa iniciada.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {chats.map((chat) => (
                                                    <div
                                                        key={chat.id}
                                                        onClick={() => {
                                                            setActiveChat(chat.id)
                                                            setShowHistory(false)
                                                        }}
                                                        className={cn(
                                                            "group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                                                            activeChatId === chat.id
                                                                ? "bg-white border-brand-terracotta/30 shadow-sm"
                                                                : "bg-white/50 border-gray-100 hover:bg-white hover:border-gray-200"
                                                        )}
                                                    >
                                                        <div className="flex items-start gap-3 overflow-hidden">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                                                activeChatId === chat.id ? "bg-brand-terracotta/10 text-brand-terracotta" : "bg-gray-100 text-gray-400"
                                                            )}>
                                                                <MessageSquare className="w-5 h-5" />
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <h4 className={cn(
                                                                    "font-medium truncate",
                                                                    activeChatId === chat.id ? "text-brand-brown" : "text-slate-600"
                                                                )}>
                                                                    {chat.title}
                                                                </h4>
                                                                <p className="text-xs text-gray-400 mt-0.5">
                                                                    {chat.createdAt ? format(new Date(chat.createdAt), "d 'de' MMMM, HH:mm", { locale: ptBR }) : 'Recentemente'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteChat(chat.id)
                                                            }}
                                                            className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="chat"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="h-full flex flex-col"
                            >
                                <ScrollArea className="flex-1 px-4 sm:px-8">
                                    <div className="space-y-6 pt-6 pb-6 w-full">
                                        <AnimatePresence initial={false}>
                                            {messages.map((msg, index) => (
                                                <motion.div
                                                    key={msg.id || index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                                    className={cn(
                                                        "flex gap-3 w-full",
                                                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                                    )}
                                                >
                                                    {/* Avatar */}
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
                                                        msg.role === 'user'
                                                            ? "bg-white border border-gray-100 text-brand-brown"
                                                            : "bg-gradient-to-br from-brand-terracotta to-brand-rust text-white"
                                                    )}>
                                                        {msg.role === 'user' ? (
                                                            <User className="w-4 h-4" />
                                                        ) : (
                                                            <Sparkles className="w-4 h-4" />
                                                        )}
                                                    </div>

                                                    {/* Message Bubble */}
                                                    <div className={cn(
                                                        "prose prose-sm rounded-2xl px-5 py-4 text-[15px] leading-7 shadow-sm max-w-[90%] sm:max-w-[95%]",
                                                        msg.role === 'user'
                                                            ? "bg-brand-terracotta text-white rounded-tr-sm"
                                                            : "bg-white text-slate-700 rounded-tl-sm border border-gray-100"
                                                    )}>
                                                        {msg.isError ? (
                                                            <span className="flex items-center gap-2 text-red-100">
                                                                <X className="w-4 h-4" /> {msg.content}
                                                            </span>
                                                        ) : (
                                                            <div className={cn(
                                                                "markdown-content w-full",
                                                                msg.role === 'user' ? "text-white prose-headings:text-white prose-strong:text-white" : "text-slate-700 prose-headings:text-brand-brown prose-strong:text-brand-brown"
                                                            )}>
                                                                <Markdown>{msg.content}</Markdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        {/* ✅ Loading State - Skeleton otimizado */}
                                        {isStreaming && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="flex gap-3 items-start"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-terracotta to-brand-rust flex items-center justify-center shrink-0 shadow-sm">
                                                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                                                </div>
                                                <div className="bg-white px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 max-w-[90%]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="flex gap-1">
                                                            <motion.div
                                                                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                                                                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0 }}
                                                                className="w-1.5 h-1.5 bg-brand-terracotta rounded-full"
                                                            />
                                                            <motion.div
                                                                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                                                                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.15 }}
                                                                className="w-1.5 h-1.5 bg-brand-terracotta rounded-full"
                                                            />
                                                            <motion.div
                                                                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                                                                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.3 }}
                                                                className="w-1.5 h-1.5 bg-brand-terracotta rounded-full"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-brand-rust/60 font-medium">Pensando...</span>
                                                    </div>
                                                    {/* Skeleton lines */}
                                                    <div className="space-y-2">
                                                        <div className="h-2 bg-gray-100 rounded animate-pulse w-full"></div>
                                                        <div className="h-2 bg-gray-100 rounded animate-pulse w-5/6"></div>
                                                        <div className="h-2 bg-gray-100 rounded animate-pulse w-4/6"></div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                        <div ref={messagesEndRef} className="h-4" />
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input Area - Hidden when showing history */}
                {!showHistory && (
                    <div className="p-4 sm:p-6 bg-white border-t border-gray-100 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-[24px] px-4 py-3 focus-within:border-brand-terracotta focus-within:bg-white transition-colors">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Pergunte à Midi..."
                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none shadow-none ring-0 outline-none p-0 text-slate-800 placeholder:text-slate-400 resize-none max-h-32 min-h-[24px] py-1 text-[15px] leading-relaxed"
                                rows={1}
                                style={{ height: 'auto', minHeight: '24px' }}
                                onInput={(e) => {
                                    e.target.style.height = 'auto'
                                    e.target.style.height = e.target.scrollHeight + 'px'
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isStreaming}
                                className={cn(
                                    "p-2 rounded-full transition-all shrink-0 mb-0.5 focus:outline-none shadow-sm",
                                    input.trim() && !isStreaming
                                        ? "bg-brand-terracotta text-white hover:bg-brand-rust hover:shadow-md active:scale-95"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="mt-2 text-center">
                            <p className="text-[10px] text-gray-400 cursor-default">
                                Midi pode cometer erros. Verifique informações importantes.
                            </p>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
