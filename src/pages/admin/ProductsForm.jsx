import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, X, Plus, Trash2, Package, Tag, Layers, Image as ImageIcon, CheckCircle2, Palette, Truck, AlertTriangle, Loader2, Eye, EyeOff, Calculator } from 'lucide-react'
import { useAdminProducts, useAdminProduct } from '@/hooks/useAdminProducts'
import { useAdminSuppliers } from '@/hooks/useAdminSuppliers'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { AlertDialog } from '@/components/ui/AlertDialog'

import { useActiveCollections } from '@/hooks/useCollections'

export function ProductsForm() {
    const { id } = useParams()
    const navigate = useNavigate()

    // ⚡ REACT QUERY: Hooks otimizados
    const { createProduct, updateProduct, isCreating, isUpdating } = useAdminProducts()
    const { data: product, isLoading: isLoadingProduct } = useAdminProduct(id)
    const { suppliers, isLoading: isLoadingSuppliers } = useAdminSuppliers({ pageSize: 100 }) // ✅ Migrado para React Query
    const { data: activeCollections = [], isLoading: isLoadingCollections } = useActiveCollections() // ✅ Collections via React Query

    const [initialData, setInitialData] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        category: 'vestidos',
        price: '',
        originalPrice: '',
        description: '',
        variants: [
            { colorName: '', images: [''], sizeStock: [] }
        ],
        sizes: [],
        isNew: true,
        isFeatured: false,
        isCatalogFeatured: false,
        isBestSeller: false,
        stock: 0,
        costPrice: '',
        supplierId: '',
        collection_ids: [],
        active: true
    })

    const [activeColorTab, setActiveColorTab] = useState('0')

    // 🏷️ Promoção Automática
    const [promoParams, setPromoParams] = useState({
        enabled: false,
        discountPercent: ''
    })

    const calculatePromoPrice = (original, percent) => {
        if (!original || !percent) return 0
        const originalFloat = parseFloat(original.toString().replace(',', '.'))
        const percentFloat = parseFloat(percent.toString().replace(',', '.'))
        if (isNaN(originalFloat) || isNaN(percentFloat)) return 0

        const discounted = originalFloat * (1 - percentFloat / 100)

        // Lógica de Arredondamento Psicológico: Sempre para X9,90 (Cima)
        // Ex: 54.00 -> 59.90
        // Ex: 59.95 -> 69.90
        const baseTens = Math.floor(discounted / 10) * 10
        let target = baseTens + 9.90

        if (target < discounted) {
            target += 10
        }

        return target
    }

    const handleApplyPromo = () => {
        const currentPrice = formData.price
        const calculated = calculatePromoPrice(currentPrice, promoParams.discountPercent)

        if (calculated > 0) {
            setFormData(prev => ({
                ...prev,
                originalPrice: prev.originalPrice || currentPrice, // Salva o preço atual como original se não tiver
                price: calculated.toFixed(2).replace('.', ',') // Atualiza o preço de venda
            }))
            toast.success(`Promoção aplicada! De R$ ${currentPrice} por R$ ${calculated.toFixed(2).replace('.', ',')}`)
            setPromoParams(prev => ({ ...prev, enabled: false, discountPercent: '' })) // Reset
        }
    }

    // Calcular tamanhos e estoque automaticamente em tempo real
    const calculatedSizes = useMemo(() => {
        return [...new Set(
            formData.variants.flatMap(v => (v.sizeStock || []).map(s => s.size))
        )]
    }, [formData.variants])

    const calculatedStock = useMemo(() => {
        return formData.variants.reduce((total, variant) => {
            const variantTotal = (variant.sizeStock || []).reduce((sum, s) => sum + s.quantity, 0)
            return total + variantTotal
        }, 0)
    }, [formData.variants])

    // React Query carrega suppliers automaticamente - não precisa de useEffect!

    // POPULAR FORMULÁRIO QUANDO DADOS CHEGAM DO REACT QUERY
    useEffect(() => {
        if (id && product) {
            // Migração de dados antigos se necessário
            const variants = product.variants || [
                {
                    colorName: product.color || '',
                    images: product.images || [''],
                    sizes: product.sizes || []
                }
            ]

            // Converter formato antigo (sizes) para novo (sizeStock) se necessário
            const variantsWithStock = variants.map(v => {
                // Se já tem sizeStock, usa ele
                if (v.sizeStock && v.sizeStock.length > 0) {
                    return {
                        ...v,
                        sizeStock: v.sizeStock
                    }
                }

                // Se tem sizes (formato antigo), converte para sizeStock
                if (v.sizes && v.sizes.length > 0) {
                    return {
                        ...v,
                        sizeStock: v.sizes.map(size => ({ size, quantity: 0 }))
                    }
                }

                // Se não tem nada, inicializa vazio
                return {
                    ...v,
                    sizeStock: []
                }
            })

            const data = {
                ...product,
                variants: variantsWithStock,
                price: product.price ? product.price.toString() : '',
                originalPrice: product.originalPrice ? product.originalPrice.toString() : '',
                stock: product.stock || 0,
                costPrice: product.costPrice ? product.costPrice.toString() : '',
                collection_ids: product.collectionIds || product.collection_ids || [], // Map collections
                active: product.active !== false // Se undefined ou null, considera ativo
            }
            setFormData(data)
            setInitialData(data)
        } else if (!id) {
            // Novo produto - definir initial data
            setInitialData(formData)
        }
    }, [id, product]) // Dependência 'product' garante que roda quando dados chegam

    // Detectar mudanças não salvas
    const hasUnsavedChanges = useMemo(() => {
        if (!initialData) return false
        return JSON.stringify(formData) !== JSON.stringify(initialData)
    }, [formData, initialData])

    // Hook para avisar sobre mudanças não salvas
    const { navigateWithConfirmation } = useUnsavedChanges(hasUnsavedChanges)

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        let finalValue = type === 'checkbox' ? checked : value

        // Lidar com vírgula para números
        if (['price', 'originalPrice', 'costPrice'].includes(name) && typeof value === 'string') {
            finalValue = value.replace(',', '.')
        }

        setFormData(prev => ({
            ...prev,
            [name]: finalValue
        }))
    }

    // Cálculos de Margem em tempo real
    const profitability = useMemo(() => {
        const p = parseFloat(formData.price) || 0
        const c = parseFloat(formData.costPrice) || 0
        if (p === 0 || c === 0) return { markup: 0, margin: 0 }

        const markup = ((p - c) / c) * 100
        const margin = ((p - c) / p) * 100
        return { markup, margin }
    }, [formData.price, formData.costPrice])

    const handleVariantChange = (index, field, value) => {
        const newVariants = [...formData.variants]
        newVariants[index][field] = value
        setFormData(prev => ({ ...prev, variants: newVariants }))
    }

    const handleVariantImageChange = (vIndex, iIndex, value) => {
        const newVariants = [...formData.variants]
        newVariants[vIndex].images[iIndex] = value
        setFormData(prev => ({ ...prev, variants: newVariants }))
    }

    const addVariant = () => {
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { colorName: '', images: [''], sizeStock: [] }]
        }))
        // Mudar para a nova aba criada
        setActiveColorTab(String(formData.variants.length))
        toast.success('Nova cor adicionada ao modelo.')
    }

    const removeVariant = (index) => {
        if (formData.variants.length === 1) return
        const newVariants = formData.variants.filter((_, i) => i !== index)
        setFormData(prev => ({ ...prev, variants: newVariants }))
        // Ajustar a aba ativa se necessário
        const currentActiveIndex = parseInt(activeColorTab)
        if (currentActiveIndex >= newVariants.length) {
            setActiveColorTab(String(newVariants.length - 1))
        } else if (currentActiveIndex === index && currentActiveIndex > 0) {
            setActiveColorTab(String(currentActiveIndex - 1))
        }
        toast.info('Cor removida.')
    }

    const addVariantImage = (vIndex) => {
        const newVariants = [...formData.variants]
        newVariants[vIndex].images.push('')
        setFormData(prev => ({ ...prev, variants: newVariants }))
    }

    const removeVariantImage = (vIndex, iIndex) => {
        const newVariants = [...formData.variants]
        newVariants[vIndex].images = newVariants[vIndex].images.filter((_, i) => i !== iIndex)
        setFormData(prev => ({ ...prev, variants: newVariants }))
    }

    const handleFileChange = async (e, vIndex, iIndex) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecione apenas arquivos de imagem.')
            return
        }

        const reader = new FileReader()
        reader.onload = async (event) => {
            const img = new Image()
            img.onload = () => {
                // Compressão básica usando canvas
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                // Limitar tamanho máximo (ex: 1200px)
                const MAX_WIDTH = 1200
                const MAX_HEIGHT = 1600

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width
                        width = MAX_WIDTH
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height
                        height = MAX_HEIGHT
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)

                // Converter para Base64 com qualidade reduzida
                const base64 = canvas.toDataURL('image/jpeg', 0.8)
                handleVariantImageChange(vIndex, iIndex, base64)
                toast.success('Foto carregada e otimizada!')
            }
            img.src = event.target.result
        }
        reader.readAsDataURL(file)
    }

    // Removido handleSizeToggle - tamanhos são calculados automaticamente

    const handleVariantSizeQuantityChange = (vIndex, size, quantity) => {
        const newVariants = [...formData.variants]
        const currentSizeStock = newVariants[vIndex].sizeStock || []

        // Remove existing entry for this size if exists
        const filteredStock = currentSizeStock.filter(s => s.size !== size)

        // Add new entry only if quantity > 0
        if (quantity > 0) {
            newVariants[vIndex].sizeStock = [...filteredStock, { size, quantity }]
        } else {
            newVariants[vIndex].sizeStock = filteredStock
        }

        setFormData(prev => ({ ...prev, variants: newVariants }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const parseBrazilianNumber = (val) => {
            if (!val || val === '') return 0
            const normalized = val.toString().replace(',', '.')
            return parseFloat(normalized)
        }

        // Usar valores calculados automaticamente
        const payload = {
            ...formData,
            price: parseBrazilianNumber(formData.price),
            originalPrice: formData.originalPrice ? parseBrazilianNumber(formData.originalPrice) : null,
            costPrice: parseBrazilianNumber(formData.costPrice),
            supplierId: formData.supplierId && formData.supplierId !== '' ? formData.supplierId : null,
            stock: calculatedStock, // Estoque total calculado automaticamente
            sizes: calculatedSizes, // Tamanhos calculados automaticamente
            // Para compatibilidade, mantemos a primeira cor/imagem no nível superior também
            color: formData.variants[0]?.colorName || '',
            images: formData.variants[0]?.images || [],
            collection_ids: formData.collection_ids || [], // Include collections
            active: formData.active // Visibilidade no catálogo
        }

        const mutationPromise = id
            ? updateProduct({ id, data: payload })
            : createProduct(payload)

        toast.promise(mutationPromise, {
            loading: id ? 'Salvando alterações...' : 'Criando novo produto...',
            success: () => { // Resultado já é tratado no onSuccess do hook
                // Direct navigation after successful save
                navigate('/admin/products')
                return id ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!'
            },
            error: (err) => formatUserFriendlyError(err)
        })
    }

    // Combine loading states
    const isSaving = isCreating || isUpdating

    const allSizes = [
        { id: 'PP', label: 'PP' },
        { id: 'P', label: 'P' },
        { id: 'M', label: 'M' },
        { id: 'G', label: 'G' },
        { id: 'GG', label: 'GG' },
        { id: 'U', label: 'TAMANHO ÚNICO' }
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            {/* Elegant Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigateWithConfirmation('/admin/products')}
                        className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-6 h-6 text-[#4A3B32]" />
                    </motion.button>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">
                                {id ? 'Editar Detalhes' : 'Novo Produto'}
                            </h2>
                            {id && (
                                <span className="px-4 py-1.5 bg-[#C75D3B] text-white text-sm font-bold rounded-full">
                                    ID: #{id}
                                </span>
                            )}
                        </div>
                        <p className="text-[#4A3B32]/40 font-medium italic">
                            {id ? `Editando produto #${id}` : 'Gestão de catálogo premium Studio 30.'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* General Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Tag className="w-5 h-5 text-[#C75D3B]" />
                                Informações Principais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="product-name" className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">
                                    Nome da Peça (Modelo) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="product-name"
                                    type="text"
                                    name="name"
                                    required
                                    aria-required="true"
                                    placeholder="Ex: Vestido Midi Seda"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 focus-visible:ring-2 focus-visible:ring-[#C75D3B] outline-none text-lg font-medium transition-all"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="product-price" className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Preço de Venda (R$) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="product-price"
                                        type="text"
                                        inputMode="decimal"
                                        name="price"
                                        required
                                        aria-required="true"
                                        placeholder="0,00"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 focus-visible:ring-2 focus-visible:ring-[#C75D3B] outline-none text-lg font-bold text-[#4A3B32]"
                                        value={formData.price}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="product-original-price" className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1 text-gray-300">
                                        Preço Original (De:)
                                    </label>
                                    <input
                                        id="product-original-price"
                                        type="text"
                                        inputMode="decimal"
                                        name="originalPrice"
                                        placeholder="0,00"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 focus-visible:ring-2 focus-visible:ring-[#C75D3B] outline-none text-lg font-bold text-gray-300"
                                        value={formData.originalPrice}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="product-cost-price" className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1 text-[#C75D3B]/60">
                                            Preço de Custo (R$)
                                        </label>
                                        {(!formData.costPrice || parseFloat(formData.costPrice) === 0) && (
                                            <motion.span
                                                animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="text-[10px] font-black text-amber-600 px-2 py-0.5 bg-amber-50 rounded-full flex items-center gap-1"
                                            >
                                                <AlertTriangle className="w-3 h-3" /> ESSENCIAL P/ LUCRO
                                            </motion.span>
                                        )}
                                    </div>
                                    <input
                                        id="product-cost-price"
                                        type="text"
                                        inputMode="decimal"
                                        name="costPrice"
                                        placeholder="0,00"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 focus-visible:ring-2 focus-visible:ring-[#C75D3B] outline-none text-lg font-bold text-[#C75D3B]"
                                        value={formData.costPrice}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* 🏷️ Calculadora de Promoção */}
                            <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <Calculator className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-purple-900">Calculadora de Promoção</p>
                                            <p className="text-[10px] text-purple-600 font-medium">Aplica % e arredonda para x9,90</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={promoParams.enabled}
                                            onChange={(e) => setPromoParams(prev => ({ ...prev, enabled: e.target.checked }))}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>

                                <AnimatePresence>
                                    {promoParams.enabled && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-2 flex items-end gap-3">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-purple-800 uppercase">Desconto (%)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-purple-900 font-bold"
                                                        placeholder="Ex: 50"
                                                        value={promoParams.discountPercent}
                                                        onChange={(e) => setPromoParams(prev => ({ ...prev, discountPercent: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-purple-800 uppercase">Novo Preço</label>
                                                    <div className="px-4 py-3 bg-white/50 border border-purple-100 rounded-xl text-purple-900 font-bold">
                                                        R$ {calculatePromoPrice(formData.price, promoParams.discountPercent).toFixed(2).replace('.', ',')}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleApplyPromo}
                                                    disabled={!promoParams.discountPercent}
                                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Aplicar
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="product-description" className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-1">
                                    Descrição Curadoria
                                </label>
                                <textarea
                                    id="product-description"
                                    name="description"
                                    rows="4"
                                    placeholder="Descreva o tecido, corte e sensibilidade da peça..."
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium leading-relaxed transition-all"
                                    value={formData.description}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Resumo de Rentabilidade */}
                            <AnimatePresence>
                                {(parseFloat(formData.price) > 0 && parseFloat(formData.costPrice) > 0) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-around"
                                    >
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tighter">Markup</p>
                                            <p className="text-lg font-black text-emerald-600">+{profitability.markup.toFixed(0)}%</p>
                                        </div>
                                        <div className="w-px h-8 bg-emerald-200" />
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tighter">Margem Líquida</p>
                                            <p className="text-lg font-black text-emerald-600">{profitability.margin.toFixed(0)}%</p>
                                        </div>
                                        <div className="w-px h-8 bg-emerald-200" />
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tighter">Lucro Bruto/Peça</p>
                                            <p className="text-lg font-black text-emerald-600">R$ {(parseFloat(formData.price) - parseFloat(formData.costPrice)).toFixed(2)}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>

                    {/* Variants / Colors - Tabs System */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-[#C75D3B]" />
                                    Cores e Fotos
                                </CardTitle>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={addVariant}
                                    className="flex items-center gap-2 text-xs font-bold text-[#C75D3B] bg-[#FDF0ED] px-6 py-3 rounded-2xl hover:bg-[#FDF0ED]/80 transition-all shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Adicionar Cor
                                </motion.button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeColorTab} onValueChange={setActiveColorTab}>
                                {/* Tabs Navigation */}
                                <div className="flex items-center gap-3">
                                    <TabsList className="flex-1">
                                        {formData.variants.map((variant, vIdx) => (
                                            <TabsTrigger key={vIdx} value={String(vIdx)}>
                                                <Palette className="w-4 h-4" />
                                                <span className="max-w-[120px] truncate">
                                                    {variant.colorName || `Cor ${vIdx + 1}`}
                                                </span>
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>

                                {/* Tabs Content */}
                                <AnimatePresence mode="wait">
                                    {formData.variants.map((variant, vIdx) => (
                                        <TabsContent key={vIdx} value={String(vIdx)}>
                                            <div className="space-y-6">
                                                {/* Color Name Input */}
                                                <div className="flex items-end gap-4">
                                                    <div className="flex-1 space-y-2">
                                                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                                            Nome da Cor
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ex: Verde Oliva, Off White, Nude..."
                                                            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-bold text-[#4A3B32]"
                                                            value={variant.colorName}
                                                            onChange={(e) => handleVariantChange(vIdx, 'colorName', e.target.value)}
                                                        />
                                                    </div>
                                                    {formData.variants.length > 1 && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            type="button"
                                                            onClick={() => removeVariant(vIdx)}
                                                            className="px-6 py-4 text-red-400 hover:text-white hover:bg-red-500 bg-red-50 rounded-2xl transition-all font-bold text-sm flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Remover
                                                        </motion.button>
                                                    )}
                                                </div>

                                                {/* Stock by Size for this Color */}
                                                <div className="space-y-4">
                                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                                        Estoque por Tamanho (Quantidade)
                                                    </label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                                        {allSizes.map(size => {
                                                            const currentStock = (variant.sizeStock || []).find(s => s.size === size.id)
                                                            const quantity = currentStock?.quantity || 0

                                                            return (
                                                                <div key={size.id} className="space-y-2">
                                                                    <label className="text-xs font-bold text-[#4A3B32] block text-center">
                                                                        {size.id}
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={quantity}
                                                                        onChange={(e) => handleVariantSizeQuantityChange(vIdx, size.id, parseInt(e.target.value) || 0)}
                                                                        className={cn(
                                                                            "w-full px-3 py-2.5 rounded-xl border-2 text-center font-bold transition-all",
                                                                            quantity > 0
                                                                                ? "bg-[#4A3B32] border-[#4A3B32] text-white"
                                                                                : "bg-white border-gray-200 text-gray-400"
                                                                        )}
                                                                        placeholder="0"
                                                                    />
                                                                    {quantity > 0 && (
                                                                        <p className="text-[9px] text-center text-emerald-600 font-bold">
                                                                            {quantity} un.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <p className="text-xs text-blue-700 font-medium">
                                                            Total em estoque desta cor: <strong>{(variant.sizeStock || []).reduce((acc, s) => acc + s.quantity, 0)} unidades</strong>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Photos Grid */}
                                                <div>
                                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1 mb-4 block">
                                                        Fotos da Cor
                                                    </label>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {(variant.images || []).map((url, iIdx) => (
                                                            <motion.div
                                                                key={iIdx}
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.9 }}
                                                                className="space-y-3 group relative"
                                                            >
                                                                <label className="cursor-pointer block">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={(e) => handleFileChange(e, vIdx, iIdx)}
                                                                    />
                                                                    <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center relative transition-all hover:border-[#C75D3B]/40 group-hover:bg-gray-100">
                                                                        {url ? (
                                                                            <>
                                                                                <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                    <ImageIcon className="w-8 h-8 text-white" />
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="flex flex-col items-center gap-2">
                                                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                                                    <Plus className="w-6 h-6 text-[#C75D3B]" />
                                                                                </div>
                                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adicionar</span>
                                                                            </div>
                                                                        )}
                                                                        {(variant.images?.length || 0) > 1 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.preventDefault()
                                                                                    e.stopPropagation()
                                                                                    removeVariantImage(vIdx, iIdx)
                                                                                }}
                                                                                className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 hover:text-white"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                                {/* Campo opcional de URL */}
                                                                <input
                                                                    type="text"
                                                                    placeholder="Ou cole a URL aqui..."
                                                                    className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg focus:ring-1 focus:ring-[#C75D3B]/20 outline-none text-[9px] font-medium"
                                                                    value={url.startsWith('data:') ? 'Imagem carregada localmente' : url}
                                                                    onChange={(e) => handleVariantImageChange(vIdx, iIdx, e.target.value)}
                                                                    readOnly={url.startsWith('data:')}
                                                                />
                                                            </motion.div>
                                                        ))}
                                                        {/* Add Photo Button */}
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            type="button"
                                                            onClick={() => addVariantImage(vIdx)}
                                                            className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[#C75D3B]/20 flex flex-col items-center justify-center gap-3 hover:border-[#C75D3B]/40 hover:bg-[#FDF0ED]/50 transition-all group"
                                                        >
                                                            <div className="p-4 bg-[#FDF0ED] rounded-full shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all">
                                                                <Plus className="w-6 h-6 text-[#C75D3B]" />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-[#C75D3B] uppercase tracking-widest text-center px-2">
                                                                Mais Fotos
                                                            </span>
                                                        </motion.button>
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    ))}
                                </AnimatePresence>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Categories and Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Ficha Técnica</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Categoria</label>
                                <select
                                    name="category"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-bold text-[#4A3B32] appearance-none"
                                    value={formData.category}
                                    onChange={handleChange}
                                >
                                    <option value="vestidos">👗 Vestidos</option>
                                    <option value="blusas">👚 Blusas</option>
                                    <option value="calcas">👖 Calças</option>
                                    <option value="shorts">🩳 Shorts</option>
                                    <option value="saias">👗 Saias</option>
                                    <option value="conjuntos">🧥 Conjuntos</option>
                                    <option value="blazers">💼 Blazers</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Fornecedor</label>
                                <select
                                    name="supplierId"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-bold text-[#4A3B32] appearance-none"
                                    value={formData.supplierId}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione um fornecedor</option>
                                    {suppliers.map(supplier => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Collections Selector */}
                            <div className="space-y-3">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Coleções</label>
                                <div className="space-y-2">
                                    {activeCollections.map(collection => {
                                        const isSelected = (formData.collection_ids || []).includes(collection.id)
                                        return (
                                            <label
                                                key={collection.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                    isSelected
                                                        ? "bg-purple-50 border-purple-200"
                                                        : "bg-gray-50 border-transparent hover:bg-gray-100"
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const currentIds = formData.collection_ids || []
                                                        if (e.target.checked) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                collection_ids: [...currentIds, collection.id]
                                                            }))
                                                        } else {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                collection_ids: currentIds.filter(id => id !== collection.id)
                                                            }))
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500"
                                                />
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    isSelected ? "text-purple-700" : "text-gray-600"
                                                )}>
                                                    {collection.title}
                                                </span>
                                            </label>
                                        )
                                    })}
                                    {activeCollections.length === 0 && (
                                        <p className="text-sm text-gray-400 italic px-2">Nenhuma coleção ativa encontrada.</p>
                                    )}
                                </div>
                            </div>

                            {/* Tamanhos Calculados Automaticamente */}
                            <div className="space-y-3 p-5 bg-gradient-to-br from-[#C75D3B]/5 to-transparent rounded-2xl border border-[#C75D3B]/10">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-[#C75D3B]" />
                                    <label className="text-[10px] text-[#C75D3B] font-bold uppercase tracking-widest">
                                        Tamanhos Disponíveis (Calculado Automaticamente)
                                    </label>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {calculatedSizes.length > 0 ? (
                                        calculatedSizes.map(size => (
                                            <span
                                                key={size}
                                                className="px-3 py-1.5 bg-[#4A3B32] text-white text-xs font-bold rounded-lg"
                                            >
                                                {size}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">
                                            Adicione tamanhos nas variantes de cor acima
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Estoque Calculado Automaticamente */}
                            <div className="space-y-3 p-5 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl border border-green-500/10">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-green-600" />
                                    <label className="text-[10px] text-green-600 font-bold uppercase tracking-widest">
                                        Estoque Total (Calculado Automaticamente)
                                    </label>
                                </div>
                                <div className="text-3xl font-bold text-[#4A3B32]">
                                    {calculatedStock} {calculatedStock === 1 ? 'unidade' : 'unidades'}
                                </div>
                                {calculatedStock === 0 && (
                                    <p className="text-xs text-gray-400 italic">
                                        Adicione quantidades nos tamanhos das variantes acima
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-4 pt-4">
                                {/* Destaque Home (Antigo Novidade) */}
                                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", formData.isFeatured ? "bg-[#C75D3B] text-white" : "bg-white text-gray-300")}>
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#4A3B32]">Destaque Home</span>
                                            <span className="text-[10px] text-gray-400">Aparece na página inicial (4 itens)</span>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="isFeatured"
                                        className="hidden"
                                        checked={formData.isFeatured}
                                        onChange={handleChange}
                                    />
                                    <div className={cn("w-12 h-6 rounded-full transition-colors relative", formData.isFeatured ? "bg-[#C75D3B]" : "bg-gray-200")}>
                                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.isFeatured ? "left-7" : "left-1")} />
                                    </div>
                                </label>

                                {/* Destaque Catálogo */}
                                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", formData.isCatalogFeatured ? "bg-blue-500 text-white" : "bg-white text-gray-300")}>
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#4A3B32]">Destaque Catálogo</span>
                                            <span className="text-[10px] text-gray-400">Topo da lista (6 itens)</span>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="isCatalogFeatured"
                                        className="hidden"
                                        checked={formData.isCatalogFeatured}
                                        onChange={handleChange}
                                    />
                                    <div className={cn("w-12 h-6 rounded-full transition-colors relative", formData.isCatalogFeatured ? "bg-blue-500" : "bg-gray-200")}>
                                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.isCatalogFeatured ? "left-7" : "left-1")} />
                                    </div>
                                </label>

                                {/* Mais Vendido (Best Seller) */}
                                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", formData.isBestSeller ? "bg-purple-500 text-white" : "bg-white text-gray-300")}>
                                            <Tag className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#4A3B32]">Mais Vendido</span>
                                            <span className="text-[10px] text-gray-400">Badge especial (4 itens)</span>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="isBestSeller"
                                        className="hidden"
                                        checked={formData.isBestSeller}
                                        onChange={handleChange}
                                    />
                                    <div className={cn("w-12 h-6 rounded-full transition-colors relative", formData.isBestSeller ? "bg-purple-500" : "bg-gray-200")}>
                                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.isBestSeller ? "left-7" : "left-1")} />
                                    </div>
                                </label>

                                {/* Toggle Ativo/Inativo no Catálogo */}
                                <label className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl cursor-pointer group border-2 transition-all",
                                    formData.active
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-red-50 border-red-200"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                            formData.active ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                                        )}>
                                            {formData.active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-[#4A3B32] block">
                                                {formData.active ? 'Visível no Catálogo' : 'Oculto do Catálogo'}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                {formData.active
                                                    ? 'Clientes podem ver este produto'
                                                    : 'Produto não aparece para clientes'}
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="active"
                                        className="hidden"
                                        checked={formData.active}
                                        onChange={handleChange}
                                    />
                                    <div className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative",
                                        formData.active ? "bg-emerald-500" : "bg-red-400"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                            formData.active ? "left-7" : "left-1"
                                        )} />
                                    </div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Actions */}
                    <div className="space-y-4">
                        <motion.button
                            whileHover={{ scale: isSaving ? 1 : 1.02 }}
                            whileTap={{ scale: isSaving ? 1 : 0.98 }}
                            type="submit"
                            disabled={isSaving}
                            className="w-full bg-[#C75D3B] hover:bg-[#A64D31] text-white p-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {id ? 'Salvando...' : 'Criando...'}
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {id ? 'Salvar Alterações' : 'Criar Produto'}
                                </>
                            )}
                        </motion.button>

                        {/* Loading Overlay */}
                        {(isLoadingProduct || isSaving) && (
                            <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
                                <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                                    <Loader2 className="w-10 h-10 text-[#C75D3B] animate-spin" />
                                    <p className="text-[#4A3B32] font-bold animate-pulse">
                                        {isLoadingProduct ? 'Carregando produto...' : 'Processando...'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => navigate('/admin/products')}
                            className="w-full py-4 text-[#4A3B32]/40 font-bold tracking-widest uppercase text-[10px] hover:text-[#4A3B32] transition-colors"
                        >
                            Descartar Alterações
                        </button>
                    </div>
                </div>
            </form >

        </div >
    )
}
