import { useState } from 'react'
import { Search, Package, Plus } from 'lucide-react'
import { useAdminProducts } from '@/hooks/useAdminProducts'
import { cn } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'

export function ProductSelect({ onSelect }) {
    const [searchTerm, setSearchTerm] = useState('')
    const { data: productsData, isLoading } = useAdminProducts({ 
        search: searchTerm, 
        pageSize: 10,
        full: true 
    })
    const [isOpen, setIsOpen] = useState(false)

    const products = productsData?.products || []

    return (
        <div className="relative">
            <button 
                type="button"
                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Plus className="w-5 h-5" />
                Adicionar Produto para Devolução
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                autoFocus
                                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="Buscar produto por nome ou referência..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {isLoading && (
                            <div className="p-4 text-center">
                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        )}
                        {!isLoading && products.length === 0 && (
                            <div className="p-8 text-center">
                                <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Nenhum produto encontrado</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-1 p-1">
                            {products.map(product => (
                                <button
                                    key={product.id}
                                    type="button"
                                    className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                                    onClick={() => {
                                        onSelect(product)
                                        setIsOpen(false)
                                        setSearchTerm('')
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                        {product.images?.[0] ? (
                                            <img 
                                                src={getOptimizedImageUrl(product.images[0], 200)} 
                                                alt="" 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-5 h-5 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                            {product.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-black text-indigo-600">
                                                R$ {Number(product.price || 0).toFixed(2)}
                                            </span>
                                            {product.sku && (
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    REF: {product.sku}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 mr-2" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
