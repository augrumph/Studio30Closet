import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, X, Plus, Trash2, Package, Tag, Layers, Image as ImageIcon, CheckCircle2, Palette, Truck } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { useSuppliersStore } from '@/store/suppliers-store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'

export function ProductsForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getProductById, addProduct, editProduct, productsLoading } = useAdminStore()
    const { suppliers, loadSuppliers } = useSuppliersStore()

    const [formData, setFormData] = useState({
        name: '',
        category: 'vestidos',
        price: '',
        originalPrice: '',
        description: '',
        variants: [
            { colorName: '', images: [''], sizeStock: [] } // Mudança: sizeStock ao invés de sizes
        ],
        sizes: [], // Mantido para compatibilidade
        isNew: true,
        isFeatured: false,
        stock: 0,
        costPrice: '',
        supplierId: ''
    })

    const [activeColorTab, setActiveColorTab] = useState('0')

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

    useEffect(() => {
        loadSuppliers()
    }, [loadSuppliers])

    useEffect(() => {
        if (id) {
            const product = getProductById(id)
            if (product) {
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
                    // Inicializa com quantidade 0 para o usuário preencher
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

                setFormData({
                    ...product,
                    variants: variantsWithStock,
                    price: product.price.toString(),
                    originalPrice: product.originalPrice ? product.originalPrice.toString() : '',
                    stock: product.stock || 0,
                    costPrice: product.costPrice ? product.costPrice.toString() : ''
                })
            }
        }
    }, [id, getProductById])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

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
            images: formData.variants[0]?.images || []
        }

        toast.promise(id ? editProduct(id, payload) : addProduct(payload), {
            loading: id ? 'Salvando alterações...' : 'Criando novo produto...',
            success: (result) => {
                if (result.success) {
                    navigate('/admin/products')
                    return id ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!'
                }
                throw new Error(result.error)
            },
            error: (err) => `Erro: ${err.message}`
        })
    }

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
                        onClick={() => navigate('/admin/products')}
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
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Nome da Peça (Modelo)</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="Ex: Vestido Midi Seda"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium transition-all"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Preço de Venda (R$)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        name="price"
                                        required
                                        placeholder="0,00"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-bold text-[#4A3B32]"
                                        value={formData.price}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1 text-gray-300">Preço Original (De:)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        name="originalPrice"
                                        placeholder="0,00"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-bold text-gray-300"
                                        value={formData.originalPrice}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1 text-[#C75D3B]/60">Preço de Custo (R$)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        name="costPrice"
                                        placeholder="0,00"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-bold text-[#C75D3B]"
                                        value={formData.costPrice}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Descrição Curadoria</label>
                                <textarea
                                    name="description"
                                    rows="4"
                                    placeholder="Descreva o tecido, corte e sensibilidade da peça..."
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium leading-relaxed transition-all"
                                    value={formData.description}
                                    onChange={handleChange}
                                />
                            </div>
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
                                                        {variant.images.map((url, iIdx) => (
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
                                                                        {variant.images.length > 1 && (
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
                                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", formData.isNew ? "bg-[#C75D3B] text-white" : "bg-white text-gray-300")}>
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold text-[#4A3B32]">Novidade</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="isNew"
                                        className="hidden"
                                        checked={formData.isNew}
                                        onChange={handleChange}
                                    />
                                    <div className={cn("w-12 h-6 rounded-full transition-colors relative", formData.isNew ? "bg-[#C75D3B]" : "bg-gray-200")}>
                                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.isNew ? "left-7" : "left-1")} />
                                    </div>
                                </label>

                                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", formData.isFeatured ? "bg-amber-500 text-white" : "bg-white text-gray-300")}>
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold text-[#4A3B32]">Destaque Home</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="isFeatured"
                                        className="hidden"
                                        checked={formData.isFeatured}
                                        onChange={handleChange}
                                    />
                                    <div className={cn("w-12 h-6 rounded-full transition-colors relative", formData.isFeatured ? "bg-amber-500" : "bg-gray-200")}>
                                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", formData.isFeatured ? "left-7" : "left-1")} />
                                    </div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Actions */}
                    <div className="sticky bottom-8 space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={productsLoading}
                            className="w-full flex items-center justify-center gap-3 py-6 bg-[#4A3B32] text-white rounded-3xl font-bold shadow-2xl shadow-[#4A3B32]/30 hover:bg-[#342922] transition-all disabled:opacity-50"
                        >
                            <Save className="w-6 h-6" />
                            {id ? 'Salvar Lançamento' : 'Publicar no Catálogo'}
                        </motion.button>
                        <button
                            type="button"
                            onClick={() => navigate('/admin/products')}
                            className="w-full py-4 text-[#4A3B32]/40 font-bold tracking-widest uppercase text-[10px] hover:text-[#4A3B32] transition-colors"
                        >
                            Descartar Alterações
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
