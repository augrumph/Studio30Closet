import { motion, AnimatePresence } from 'framer-motion'
import { Package, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Componente para exibir lista de itens da venda
 */
export function VendaItemsList({ items, onRemoveItem }) {
    return (
        <div className="space-y-3">
            <AnimatePresence initial={false}>
                {(items && Array.isArray(items) ? items : []).map((item, idx) => (
                    <motion.div
                        key={`${item.productId}-${idx}`}
                        initial={{ opacity: 0, height: 0, margin: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                        exit={{ opacity: 0, height: 0, padding: 0 }}
                        className="p-4 flex items-center justify-between gap-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#C75D3B]/20 transition-all group"
                    >
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                            {item.image ? (
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                    <Package className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <p className="font-bold text-[#4A3B32] text-sm">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-bold text-[#C75D3B] bg-[#FDF0ED] px-2 py-0.5 rounded text-[10px]">
                                    QTD: {item.quantity}
                                </span>
                                {item.selectedColor && (
                                    <span className="text-xs font-semibold text-white bg-[#4A3B32] px-2 py-0.5 rounded text-[10px]">
                                        🎨 {item.selectedColor}
                                    </span>
                                )}
                                {item.selectedSize && (
                                    <span className="text-xs font-semibold text-white bg-[#C75D3B] px-2 py-0.5 rounded text-[10px]">
                                        📏 {item.selectedSize}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-bold text-[#4A3B32] text-sm">
                                    R$ {(item.price || 0).toLocaleString('pt-BR')}
                                </p>
                                <p className="text-xs text-[#4A3B32]/50">x{item.quantity}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemoveItem(idx)}
                                className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                aria-label={`Remover ${item.name} da venda`}
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {items.length === 0 && (
                <div className="py-20 text-center space-y-3 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30">
                    <Package className="w-12 h-12 text-gray-200 mx-auto" />
                    <div>
                        <p className="text-gray-400 font-medium">Nenhum produto adicionado ainda.</p>
                        <p className="text-xs text-gray-400/60">Use a busca acima para incluir itens na venda.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
