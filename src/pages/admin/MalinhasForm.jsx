import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Search,
    User,
    ShoppingBag,
    Calendar as CalendarIcon,
    Clock,
    Check,
    X,
    Package
} from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useAdminMalinha, useAdminMalinhasMutations } from '@/hooks/useAdminMalinhas'
import { useCustomerSearch } from '@/hooks/useAdminCustomers'
import { useAdminProducts } from '@/hooks/useAdminProducts'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { triggerConfetti, triggerFireworks } from '@/components/magicui/confetti'
import { sendNewMalinhaEmail } from '@/lib/email-service'
import { apiClient } from '@/lib/api-client'

export function MalinhasForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = !!id

    // Hooks
    const { createMalinha, updateMalinha, isCreating, isUpdating } = useAdminMalinhasMutations()
    const { data: orderData, isLoading: isLoadingOrder } = useAdminMalinha(id)

    // Search Hooks
    const [customerSearch, setCustomerSearch] = useState('')
    const { customers: filteredCustomers } = useCustomerSearch(customerSearch)

    const [productSearchInput, setProductSearchInput] = useState('')
    const [productSearch, setProductSearch] = useState('')
    const debouncedProductSearch = useDebounce(productSearchInput, 400)

    // Sync debounced search
    useEffect(() => {
        setProductSearch(debouncedProductSearch)
    }, [debouncedProductSearch])

    const { products: allProducts } = useAdminProducts({
        search: productSearch,
        active: 'true',
        pageSize: 50,
        full: false // ⚡ Optimization: Lite search
    }) // Fetches products based on search

    // Local filtering for products (Now using backend results)
    const filteredProducts = allProducts

    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        deliveryDate: '',
        pickupDate: '',
        status: 'pending',
        items: []
    })

    const [variantModal, setVariantModal] = useState({ open: false, product: null, selectedColor: null, selectedSize: null })


    const [showCustomerSearch, setShowCustomerSearch] = useState(false)

    useEffect(() => {
        if (isEdit && orderData) {
            setFormData({
                customerId: orderData.customerId || orderData.customer?.id,
                customerName: orderData.customerName || orderData.customer?.name,
                deliveryDate: orderData.deliveryDate ? orderData.deliveryDate.split('T')[0] : '',
                pickupDate: orderData.pickupDate ? orderData.pickupDate.split('T')[0] : '',
                status: orderData.status,
                items: (orderData.items || []).map(item => ({
                    productId: item.productId,
                    productName: item.productName || item.name || '',
                    price: item.price,
                    costPrice: item.costPrice || 0,
                    selectedSize: item.selectedSize,
                    selectedColor: item.selectedColor || item.color || 'Padrão',
                    image: item.image
                }))
            })
        }
    }, [isEdit, orderData])

    const addItemToCart = (product, color, size) => {
        // Validação: garantir que product tem ID
        if (!product.id) {
            toast.error('Erro: Produto sem ID válido');
            return;
        }

        const newItem = {
            productId: product.id,
            productName: product.name,
            price: product.price,
            image: product.images?.[0] || product.image || null,
            selectedSize: size,
            selectedColor: color,
            quantity: 1
        }
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }))

        toast.success(`Adicionado: ${product.name} (${color} - ${size})`, {
            description: `${formData.items.length + 1} itens na malinha`,
            duration: 2000
        })

        // Trigger small confetti for delight
        triggerConfetti({ particleCount: 40, spread: 50 })
    }

    // Retorna estoque efetivo: DB - itens já na malinha (exceto os desta malinha em edição)
    const getEffectiveStock = (product, color, size) => {
        const variant = product.variants?.find(v => v.colorName === color)
        const sizeEntry = variant?.sizeStock?.find(s => s.size === size)
        const dbStock = Number(sizeEntry?.quantity) || 0
        const inMalinha = formData.items
            .filter(i => i.productId === product.id && i.selectedColor === color && i.selectedSize === size)
            .reduce((acc, i) => acc + (i.quantity || 1), 0)
        return dbStock + inMalinha
    }

    const initiateAddProduct = (product) => {
        const variants = product.variants || []

        if (variants.length === 0) {
            // Produto sem variantes
            addItemToCart(product, 'Padrão', 'Único')
            return
        }

        // Produto com variantes → sempre abre o modal
        const firstAvailable = variants.find(v =>
            (v.sizeStock || []).some(s => getEffectiveStock(product, v.colorName, s.size) > 0)
        )

        setVariantModal({
            open: true,
            product,
            selectedColor: firstAvailable?.colorName || null,
            selectedSize: null
        })
    }

    const removeItem = (idx) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.customerId || formData.items.length === 0) {
            toast.error('Selecione um cliente e ao menos um produto.')
            return
        }

        const totalValue = formData.items.reduce((sum, item) => sum + item.price, 0)

        // Validar preços dos produtos
        const invalidPriceItems = formData.items.filter(item => !item.price || item.price <= 0)
        if (invalidPriceItems.length > 0) {
            // console.log('Itens com preço inválido:', invalidPriceItems)
            toast.error(`${invalidPriceItems.length} produto(s) sem preço válido. Remova-os da malinha.`)
            return
        }

        // SIMPLIFICADO: Enviar apenas IDs dos produtos
        // Os dados completos (preços, nomes, etc) serão buscados do banco via getOrderById
        const payload = {
            customerId: formData.customerId,
            deliveryDate: formData.deliveryDate,
            pickupDate: formData.pickupDate,
            status: formData.status,
            totalValue,
            items: formData.items.map(item => {
                // Validar que productId existe
                if (!item.productId) {
                    throw new Error(`Erro: Item sem produto válido`);
                }
                return {
                    productId: item.productId,
                    quantity: item.quantity || 1,
                    selectedSize: item.selectedSize,
                    selectedColor: item.selectedColor || 'Padrão', // 🔒 CRÍTICO para reserva de estoque
                    price: item.price || 0,
                    costPrice: item.costPrice || 0
                };
            })
        }

        // console.log('Payload enviado:', payload)

        const action = isEdit
            ? updateMalinha({ id: parseInt(id), data: payload })
            : createMalinha(payload)

        toast.promise(action, {
            loading: isEdit ? 'Atualizando malinha...' : 'Criando malinha...',
            success: (result) => {
                triggerFireworks()

                sendNewMalinhaEmail({
                    customerName: formData.customerName,
                    customerEmail: null,
                    itemsCount: formData.items.length,
                    orderId: result?.order?.id || result?.id || (isEdit ? parseInt(id) : null)
                }).catch(console.error)

                navigate('/admin/malinhas')
                return isEdit ? 'Malinha atualizada!' : 'Malinha criada com sucesso!'
            },
            error: (err) => formatUserFriendlyError(err)
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/admin/malinhas"
                                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                <ArrowLeft className="w-5 h-5 text-[#4A3B32]" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-display font-bold text-[#4A3B32]">
                                    {isEdit ? 'Editar Malinha' : 'Montar Nova Malinha'}
                                </h1>
                                <p className="text-sm text-[#4A3B32]/60">
                                    {formData.items.length} {formData.items.length === 1 ? 'item selecionado' : 'itens selecionados'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!formData.customerId || formData.items.length === 0}
                            className="px-6 py-3 bg-[#C75D3B] text-white rounded-xl font-bold hover:bg-[#A64D31] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            {isEdit ? 'Salvar' : 'Confirmar Malinha'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* COLUNA ESQUERDA: Catálogo de Produtos */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Busca de Produtos */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-[#C75D3B]/10 rounded-xl">
                                    <Search className="w-5 h-5 text-[#C75D3B]" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-[#4A3B32]">Catálogo de Produtos</h3>
                                    <p className="text-xs text-gray-400">Clique nos tamanhos para adicionar à malinha</p>
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar produtos..."
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium"
                                    value={productSearchInput}
                                    onChange={(e) => setProductSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setProductSearch(productSearchInput)
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Grid de Produtos - 3 colunas compactas */}
                        <div className="grid md:grid-cols-3 gap-3">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => {
                                    // Calculate quantity of this product CURRENTLY in the malinha (being edited/created)
                                    // We add this back to the "global stock" to see if we can add MORE or change it.
                                    const quantityInMalinha = formData.items
                                        .filter(item => item.productId === product.id)
                                        .reduce((acc, item) => acc + (item.quantity || 1), 0)

                                    const addedCount = quantityInMalinha // For UI "added" state
                                    const isAdded = addedCount > 0

                                    // Fix: Available stock = Database Stock + Stock Held By This Malinha
                                    const effectiveStock = (product.stock || 0) + quantityInMalinha
                                    const canBeAdded = effectiveStock > 0

                                    return (
                                        <motion.div
                                            key={product.id}
                                            layout
                                            className={cn(
                                                "bg-white rounded-xl shadow-sm border transition-all overflow-hidden group relative",
                                                isAdded ? "border-[#C75D3B]/40" : "border-gray-200 hover:border-[#C75D3B]/20 hover:shadow-md"
                                            )}
                                        >
                                            {/* Imagem do Produto - Clicável para abrir modal */}
                                            <div
                                                className={cn(
                                                    "relative aspect-square overflow-hidden bg-gray-100",
                                                    canBeAdded && "cursor-pointer group/image"
                                                )}
                                                onClick={async () => {
                                                    if (!canBeAdded) return
                                                    try {
                                                        const fullProduct = await apiClient(`/products/${product.id}?full=true`)
                                                        initiateAddProduct(fullProduct)
                                                    } catch (err) {
                                                        toast.error('Erro ao carregar detalhes do produto')
                                                    }
                                                }}
                                            >
                                                <img
                                                    src={getOptimizedImageUrl(product.images?.[0], 400)}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform group-hover/image:scale-105"
                                                />
                                                {!canBeAdded && (
                                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold">ESGOTADO</span>
                                                    </div>
                                                )}
                                                {canBeAdded && (
                                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs font-bold">
                                                        {product.stock} unid.
                                                    </div>
                                                )}
                                                {canBeAdded && (
                                                    <div className="absolute inset-0 bg-[#C75D3B]/0 group-hover/image:bg-[#C75D3B]/20 transition-all flex items-center justify-center">
                                                        <div className="opacity-0 group-hover/image:opacity-100 transition-opacity bg-white/90 px-4 py-2 rounded-lg">
                                                            <Plus className="w-5 h-5 text-[#C75D3B]" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info do Produto */}
                                            <div className="p-3">
                                                <h4 className="font-bold text-[#4A3B32] text-sm mb-1 line-clamp-1">{product.name}</h4>
                                                <p className="text-base font-bold text-[#C75D3B] mb-2">
                                                    R$ {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>

                                                {isAdded && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const lastIdx = formData.items.map((item, idx) => item.productId === product.id ? idx : -1).filter(i => i !== -1).pop()
                                                                if (lastIdx !== undefined) removeItem(lastIdx)
                                                            }}
                                                            className="flex-1 px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-1"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            Remover
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )
                                })
                            ) : (
                                <div className="col-span-3 py-20 text-center">
                                    <ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-medium">
                                        {productSearch ? 'Nenhum produto encontrado' : 'Busque produtos para começar'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUNA DIREITA: Painel da Malinha */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-4">
                            {/* Cliente */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-[#C75D3B] to-[#A64D31]" />
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-[#C75D3B]" />
                                            <h3 className="font-bold text-[#4A3B32]">Cliente</h3>
                                        </div>
                                        {formData.customerId && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, customerId: '', customerName: '' }))}
                                                className="text-xs font-bold text-[#C75D3B] hover:underline"
                                            >
                                                Trocar
                                            </button>
                                        )}
                                    </div>

                                    {formData.customerId ? (
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            <div className="w-10 h-10 rounded-full bg-[#C75D3B]/10 flex items-center justify-center text-[#C75D3B] font-bold">
                                                {formData.customerName.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[#4A3B32] text-sm truncate">{formData.customerName}</p>
                                                <p className="text-xs text-gray-400">Selecionada</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar..."
                                                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none"
                                                    value={customerSearch}
                                                    onChange={(e) => {
                                                        setCustomerSearch(e.target.value)
                                                        setShowCustomerSearch(true)
                                                    }}
                                                    onFocus={() => setShowCustomerSearch(true)}
                                                />
                                            </div>
                                            <AnimatePresence>
                                                {showCustomerSearch && customerSearch && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg max-h-40 overflow-y-auto"
                                                    >
                                                        {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(p => ({ ...p, customerId: c.id, customerName: c.name }))
                                                                    setShowCustomerSearch(false)
                                                                    setCustomerSearch('')
                                                                }}
                                                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                                                                    {c.name.charAt(0)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-[#4A3B32] truncate">{c.name}</p>
                                                                    <p className="text-xs text-gray-400">{c.phone}</p>
                                                                </div>
                                                            </button>
                                                        )) : (
                                                            <div className="p-3 text-center text-xs text-gray-400">Não encontrada</div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Malinha - Itens */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-[#C75D3B] to-[#A64D31]" />
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <ShoppingBag className="w-4 h-4 text-[#C75D3B]" />
                                            <h3 className="font-bold text-[#4A3B32]">Malinha</h3>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400">
                                            {formData.items.length} {formData.items.length === 1 ? 'item' : 'itens'}
                                        </span>
                                    </div>

                                    {formData.items.length > 0 ? (
                                        <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                                            <AnimatePresence>
                                                {formData.items.map((item, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 20 }}
                                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group hover:bg-gray-100 transition-all"
                                                    >
                                                        <div className="w-12 h-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
                                                            <img src={getOptimizedImageUrl(item.image, 200)} alt={item.productName} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-[#4A3B32] truncate">{item.productName}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs px-2 py-0.5 bg-white rounded text-gray-500 font-bold">
                                                                    {item.selectedSize}
                                                                </span>
                                                                <span className="text-xs font-bold text-[#C75D3B]">
                                                                    R$ {(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center">
                                            <ShoppingBag className="w-12 h-12 mx-auto text-gray-200 mb-2" />
                                            <p className="text-xs text-gray-400">Adicione produtos da lista</p>
                                        </div>
                                    )}

                                    {/* Total */}
                                    {formData.items.length > 0 && (
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-[#4A3B32]">Total</span>
                                                <span className="text-xl font-bold text-[#C75D3B]">
                                                    R$ {formData.items.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Datas */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <CalendarIcon className="w-4 h-4 text-[#C75D3B]" />
                                    <h3 className="font-bold text-[#4A3B32]">Agendamento</h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Entrega</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                                            value={formData.deliveryDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-2 block">Coleta</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2.5 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium"
                                            value={formData.pickupDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, pickupDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                                <h3 className="font-bold text-[#4A3B32] mb-3 text-sm">Status</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'pending', label: 'Pendente' },
                                        { value: 'shipped', label: 'Enviada' },
                                        { value: 'completed', label: 'Concluída' },
                                        { value: 'cancelled', label: 'Cancelada' }
                                    ].map(({ value, label }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, status: value }))}
                                            className={cn(
                                                "px-3 py-2 rounded-lg text-xs font-bold transition-all",
                                                formData.status === value
                                                    ? "bg-[#C75D3B] text-white shadow-md"
                                                    : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Variante */}
            <AnimatePresence>
                {variantModal.open && variantModal.product && (() => {
                    const p = variantModal.product
                    const variants = p.variants || []
                    const closeModal = () => setVariantModal({ open: false, product: null, selectedColor: null, selectedSize: null })
                    const selectedVariant = variants.find(v => v.colorName === variantModal.selectedColor)
                    const canAdd = !!variantModal.selectedColor && !!variantModal.selectedSize

                    return (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[80vh] overflow-y-auto"
                        >
                            <div className="p-4 border-b border-[#4A3B32]/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-[#4A3B32]/5 overflow-hidden">
                                        {p.images?.[0] ? (
                                            <img src={getOptimizedImageUrl(p.images[0], 200)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-5 h-5 text-[#4A3B32]/20" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#4A3B32]">{p.name}</h3>
                                        <p className="text-sm text-[#C75D3B] font-bold">
                                            R$ {Number(p.price || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <button type="button" onClick={closeModal} className="p-2 hover:bg-[#4A3B32]/5 rounded-xl">
                                    <X className="w-5 h-5 text-[#4A3B32]/50" />
                                </button>
                            </div>

                            <div className="p-4 space-y-5">
                                {/* Cores */}
                                <div>
                                    <p className="text-xs font-bold text-[#4A3B32]/50 uppercase mb-3">Cor</p>
                                    <div className="flex flex-wrap gap-2">
                                        {variants.map((v) => {
                                            const hasStock = (v.sizeStock || []).some(s =>
                                                getEffectiveStock(p, v.colorName, s.size) > 0
                                            )
                                            return (
                                                <button
                                                    key={v.colorName}
                                                    type="button"
                                                    disabled={!hasStock}
                                                    onClick={() => setVariantModal(prev => ({
                                                        ...prev,
                                                        selectedColor: v.colorName,
                                                        selectedSize: null
                                                    }))}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                                                        variantModal.selectedColor === v.colorName
                                                            ? "bg-[#4A3B32] text-white border-[#4A3B32]"
                                                            : hasStock
                                                                ? "bg-white text-[#4A3B32] border-[#4A3B32]/20 hover:border-[#4A3B32]/50"
                                                                : "bg-gray-50 text-[#4A3B32]/30 border-gray-100 line-through cursor-not-allowed"
                                                    )}
                                                >
                                                    {v.colorName}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Tamanhos — aparece só após escolher cor */}
                                {variantModal.selectedColor && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                        <p className="text-xs font-bold text-[#4A3B32]/50 uppercase mb-3">Tamanho</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(selectedVariant?.sizeStock || []).map((s) => {
                                                const qty = getEffectiveStock(p, variantModal.selectedColor, s.size)
                                                const hasStock = qty > 0
                                                return (
                                                    <button
                                                        key={s.size}
                                                        type="button"
                                                        disabled={!hasStock}
                                                        onClick={() => setVariantModal(prev => ({ ...prev, selectedSize: s.size }))}
                                                        className={cn(
                                                            "py-3 rounded-xl text-sm font-bold transition-all",
                                                            variantModal.selectedSize === s.size
                                                                ? "bg-[#C75D3B] text-white"
                                                                : hasStock
                                                                    ? "bg-[#4A3B32]/5 text-[#4A3B32] hover:bg-[#4A3B32]/10"
                                                                    : "bg-gray-50 text-[#4A3B32]/25 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {s.size}
                                                        <span className="block text-[10px] font-normal opacity-60 mt-0.5">
                                                            {hasStock ? `${qty}un` : 'Esgotado'}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="p-4 border-t border-[#4A3B32]/5">
                                <button
                                    type="button"
                                    disabled={!canAdd}
                                    onClick={() => {
                                        addItemToCart(p, variantModal.selectedColor, variantModal.selectedSize)
                                        closeModal()
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all",
                                        canAdd ? "bg-[#C75D3B] text-white hover:bg-[#A64D31]" : "bg-[#4A3B32]/10 text-[#4A3B32]/30 cursor-not-allowed"
                                    )}
                                >
                                    <Plus className="w-5 h-5" />
                                    {canAdd ? `Adicionar — ${variantModal.selectedColor}, ${variantModal.selectedSize}` : 'Selecione cor e tamanho'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                    )
                })()}
            </AnimatePresence>
        </div>
    )
}
