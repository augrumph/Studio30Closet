import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Database, Trash2, X, Plus, History, MessageSquare, ChevronRight } from 'lucide-react'
import { perguntarIA } from '@/lib/api/ai'
import { cn } from '@/lib/utils'
import Markdown from 'react-markdown'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '@/store/chat-store'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function AIChatSidebar({ isOpen, onClose }) {
    const {
        chats,
        activeChatId,
        createChat,
        addMessage,
        setActiveChat,
        deleteChat,
        updateChatTitle
    } = useChatStore()

    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const messagesEndRef = useRef(null)

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

    const handleSend = async () => {
        if (!input.trim() || isLoading || !activeChatId) return

        const currentInput = input
        const userMessage = { id: Date.now().toString(), role: 'user', content: currentInput }

        // Add user message to store
        addMessage(activeChatId, userMessage)
        setInput('')
        setIsLoading(true)

        // Update title if it's the first real interaction and title is generic
        if (messages.length <= 1 && activeChat?.title === 'Nova Conversa') {
            const newTitle = currentInput.length > 30 ? currentInput.substring(0, 30) + '...' : currentInput
            updateChatTitle(activeChatId, newTitle)
        }

        setTimeout(scrollToBottom, 100)

        try {
            const response = await perguntarIA(currentInput)

            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.answer,
                sql: response.sql,
                data: response.data
            }
            addMessage(activeChatId, aiMessage)
        } catch (error) {
            console.error(error)
            addMessage(activeChatId, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Desculpe, tive um problema ao processar sua pergunta. Tente novamente.',
                isError: true
            })
        } finally {
            setIsLoading(false)
        }
    }

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

                                        {/* Loading State - Thinking Animation */}
                                        {isLoading && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex gap-3 items-center"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-brand-terracotta flex items-center justify-center shrink-0 animate-pulse">
                                                    <Sparkles className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="flex items-center gap-1 bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                                                    <div className="flex gap-1">
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0 }}
                                                            className="w-1.5 h-1.5 bg-brand-terracotta rounded-full"
                                                        />
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.2 }}
                                                            className="w-1.5 h-1.5 bg-brand-terracotta/70 rounded-full"
                                                        />
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.4 }}
                                                            className="w-1.5 h-1.5 bg-brand-terracotta/40 rounded-full"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-brand-rust/70 font-medium ml-2 animate-pulse">Pensando...</span>
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
                                disabled={!input.trim() || isLoading}
                                className={cn(
                                    "p-2 rounded-full transition-all shrink-0 mb-0.5 focus:outline-none",
                                    input.trim() && !isLoading
                                        ? "bg-brand-terracotta text-white hover:bg-brand-rust"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
