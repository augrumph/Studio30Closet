import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, Trash2, ToggleLeft, ToggleRight, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
    getCollections,
    createCollection,
    updateCollection,
    deleteCollection
} from '@/lib/api/collections'

/**
 * Modal para gerenciar Coleções (criar, ativar/desativar, excluir)
 */
export function CollectionsManagerModal({ isOpen, onClose }) {
    const navigate = useNavigate()
    const [collections, setCollections] = useState([])
    const [newTitle, setNewTitle] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen) {
            loadCollections()
        }
    }, [isOpen])

    const loadCollections = async () => {
        setLoading(true)
        try {
            const data = await getCollections()
            setCollections(data)
        } catch (err) {
            toast.error('Erro ao carregar coleções')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!newTitle.trim()) return

        try {
            const created = await createCollection({ title: newTitle.trim() })
            setCollections(prev => [...prev, created])
            setNewTitle('')
            toast.success(`Coleção "${created.title}" criada!`)
        } catch (err) {
            toast.error('Erro ao criar coleção')
        }
    }

    const handleToggleActive = async (collection) => {
        try {
            const updated = await updateCollection(collection.id, { active: !collection.active })
            setCollections(prev => prev.map(c => c.id === updated.id ? updated : c))
            toast.success(`Coleção "${updated.title}" ${updated.active ? 'ativada' : 'desativada'}`)
        } catch (err) {
            toast.error('Erro ao atualizar coleção')
        }
    }

    const handleDelete = async (collection) => {
        if (!confirm(`Tem certeza que deseja excluir a coleção "${collection.title}"?`)) return

        try {
            await deleteCollection(collection.id)
            setCollections(prev => prev.filter(c => c.id !== collection.id))
            toast.success(`Coleção "${collection.title}" excluída`)
        } catch (err) {
            toast.error('Erro ao excluir coleção')
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal Content */}
                <motion.div
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-xl">
                                <Layers className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-xl font-bold text-[#4A3B32]">Gerenciar Coleções</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {/* Create Form */}
                        <form onSubmit={handleCreate} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Nome da nova coleção (ex: Inverno 2025)"
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newTitle.trim()}
                                className="px-4 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Criar
                            </button>
                        </form>

                        {/* List */}
                        {loading ? (
                            <div className="text-center py-8 text-gray-400">Carregando...</div>
                        ) : collections.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p>Nenhuma coleção criada ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {collections.map(collection => (
                                    <div
                                        key={collection.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${collection.active
                                            ? 'bg-white border-gray-100'
                                            : 'bg-gray-50 border-gray-100 opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${collection.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            <span className="font-medium text-[#4A3B32]">{collection.title}</span>
                                            <span className="text-xs text-gray-400">({collection.slug})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    onClose()
                                                    navigate(`/admin/collections/${collection.id}`)
                                                }}
                                                className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors flex items-center gap-1.5"
                                                title="Gerenciar Produtos"
                                            >
                                                <Layers className="w-4 h-4" />
                                                <span className="text-xs font-bold">Produtos</span>
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(collection)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                title={collection.active ? 'Desativar' : 'Ativar'}
                                            >
                                                {collection.active
                                                    ? <ToggleRight className="w-5 h-5 text-green-600" />
                                                    : <ToggleLeft className="w-5 h-5 text-gray-400" />
                                                }
                                            </button>
                                            <button
                                                onClick={() => handleDelete(collection)}
                                                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-gray-50 text-center">
                        <p className="text-xs text-gray-400">
                            Após criar coleções, vá em <strong>Ver Coleções</strong> para adicionar produtos.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence >
    )
}
