import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, ArrowLeft, ShoppingBag, Check, Truck, AlertTriangle, User, Lock, ChevronDown, ChevronUp, Loader2, Zap, MessageCircle, Calendar, RotateCcw, Package } from 'lucide-react'
import { useMalinhaStore } from '@/store/malinha-store'
import { formatMalinhaMessage, generateWhatsAppLink, cn, formatPrice } from '@/lib/utils'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { useAdminStore } from '@/store/admin-store'
import { useToast } from '@/contexts/ToastContext'
import { motion, AnimatePresence } from 'framer-motion'
import { triggerFireworks } from '@/components/magicui/confetti'
import { getOptimizedImageUrl } from '@/lib/image-optimizer'
import { useStock } from '@/hooks/useStock'
import { trackCheckoutStarted, trackCheckoutCompleted, markCartCheckoutStarted, markCartConverted, saveCustomerDataToCart } from '@/lib/api/analytics'
import { SEO } from '@/components/SEO'
import { formatCpf, isValidCpf } from '@/lib/cpf-utils'
import { createStoreCheckout, quoteStoreShipping } from '@/lib/api/store'

function generateOrderNumber(orderId) {
    const now = new Date()
    const dateStr = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const idBase36 = parseInt(orderId).toString(36).toUpperCase()
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let rand = ''
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length))
    return `S30-${dateStr}-${rand}`
}

function formatPhone(value) {
    const nums = value.replace(/\D/g, '').slice(0, 11)
    if (nums.length === 0) return ''
    if (nums.length <= 2) return `(${nums}`
    if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StepBar({ step }) {
    const steps = ['Revisão', 'Dados', 'Confirmado']
    return (
        <div className="flex items-center justify-center gap-2">
            {steps.map((label, i) => {
                const n = i + 1
                const done = step > n
                const active = step === n
                return (
                    <div key={n} className="flex items-center gap-2">
                        <div className={cn('flex items-center gap-1.5 text-sm font-medium transition-colors', active ? 'text-[#4A3B32]' : done ? 'text-[#C75D3B]' : 'text-gray-300')}>
                            <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all', active ? 'bg-[#4A3B32] border-[#4A3B32] text-white' : done ? 'bg-[#C75D3B] border-[#C75D3B] text-white' : 'border-gray-200 text-gray-300')}>
                                {done ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : n}
                            </span>
                            <span className="hidden sm:block">{label}</span>
                        </div>
                        {i < 2 && <div className={cn('w-8 sm:w-14 h-px transition-colors', done ? 'bg-[#C75D3B]' : 'bg-gray-200')} />}
                    </div>
                )
            })}
        </div>
    )
}

const inputCls = (err) => cn(
    'w-full px-4 py-3.5 bg-gray-50 rounded-xl text-[#4A3B32] placeholder:text-gray-300 text-sm font-medium focus:outline-none focus:bg-white transition-all',
    err ? 'ring-2 ring-red-300 bg-red-50/60' : 'focus:ring-2 focus:ring-[#C75D3B]/20'
)

function Field({ label, error, className = '', children }) {
    return (
        <div className={className}>
            <label className="block text-[11px] font-bold text-[#4A3B32]/45 uppercase tracking-widest mb-1.5">{label}</label>
            {children}
            {error && <p className="mt-1.5 text-xs text-red-500 font-semibold">{error}</p>}
        </div>
    )
}

function OrderSummary({ groupedItems, subtotalValue, shippingValue, checkoutMode, selectedShipping }) {
    const [open, setOpen] = useState(false)
    const total = subtotalValue + (checkoutMode === 'ecommerce' && selectedShipping ? shippingValue : 0)

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Toggle header */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 md:cursor-default"
            >
                <span className="text-sm font-semibold text-[#4A3B32] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#C75D3B]" />
                    Resumo
                    <span className="font-normal text-gray-400">({groupedItems.reduce((s, i) => s + i.count, 0)} peças)</span>
                </span>
                <span className="flex items-center gap-2">
                    <span className="font-bold text-[#4A3B32]">{formatPrice(total)}</span>
                    <span className="md:hidden text-gray-400">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                </span>
            </button>

            <div className={cn('md:block', open ? 'block' : 'hidden')}>
                {/* Items */}
                <div className="border-t border-gray-100 px-5 py-3 space-y-3 max-h-64 overflow-y-auto">
                    {groupedItems.map(item => (
                        <div key={item.itemIds[0]} className="flex gap-3 items-center">
                            <div className="w-11 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <img src={getOptimizedImageUrl(item.image, 80)} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#4A3B32] line-clamp-1">{item.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {item.selectedSize}{item.selectedColor ? ` · ${item.selectedColor}` : ''}{item.count > 1 ? ` · ×${item.count}` : ''}
                                </p>
                            </div>
                            <p className="text-sm font-bold text-[#4A3B32] flex-shrink-0">{formatPrice(item.price * item.count)}</p>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Produtos</span>
                        <span className="font-semibold text-[#4A3B32]">{formatPrice(subtotalValue)}</span>
                    </div>
                    {checkoutMode === 'ecommerce' && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Frete</span>
                            <span className={cn('font-semibold', selectedShipping ? 'text-[#4A3B32]' : 'text-gray-400 italic')}>
                                {selectedShipping ? formatPrice(shippingValue) : 'a calcular'}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="font-black text-[#4A3B32]">Total</span>
                        <span className="font-black text-[#C75D3B] text-lg">{formatPrice(total)}</span>
                    </div>
                </div>

                <div className="px-5 pb-4">
                    <Link to="/catalogo" className="text-xs text-[#C75D3B] font-semibold hover:underline">+ Adicionar mais peças</Link>
                </div>
            </div>
        </div>
    )
}

// ── Main component ───────────────────────────────────────────────────────────

export function Checkout() {
    const { items, removeItem, updateItem, clearItems, resetAll, customerData, setCustomerData, resetCustomerData } = useMalinhaStore()
    const { addOrder } = useAdminStore()
    const toast = useToast()

    const [step, setStep] = useState(items.length > 0 ? 1 : 0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successOrder, setSuccessOrder] = useState(null)
    const [formErrors, setFormErrors] = useState({})
    const [checkoutMode, setCheckoutMode] = useState('ecommerce')
    const [shippingAddress, setShippingAddress] = useState({ recipientName: '', zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' })
    const [shippingOptions, setShippingOptions] = useState([])
    const [selectedShipping, setSelectedShipping] = useState(null)
    const [isQuotingShipping, setIsQuotingShipping] = useState(false)
    const [isFetchingCep, setIsFetchingCep] = useState(false)
    const [cepCity, setCepCity] = useState(null)       // { city, state } encontrado pelo ViaCEP
    const [addressFlash, setAddressFlash] = useState(false) // brief highlight nos campos preenchidos

    const hasCleanedOldData = useRef(false)
    useEffect(() => {
        if (!hasCleanedOldData.current && items.length > 0 && !customerData.name) {
            hasCleanedOldData.current = true
            resetCustomerData()
        }
    }, [])

    const { data: productsData = [], isLoading: loadingProducts } = useStock(items)
    const productsMap = useMemo(() => productsData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}), [productsData])

    const outOfStockItems = useMemo(() => {
        const grouped = items.reduce((acc, item) => {
            const key = [item.productId, item.selectedColor || 'default', item.selectedSize || 'default'].join('|')
            if (!acc[key]) acc[key] = { productId: item.productId, selectedColor: item.selectedColor, selectedSize: item.selectedSize, count: 0 }
            acc[key].count += 1
            return acc
        }, {})
        return Object.values(grouped).filter(group => {
            const product = productsMap[group.productId]
            if (!product) return false
            let qty = Number(product.stock ?? 0)
            if (product.variants?.length > 0 && group.selectedColor && group.selectedSize) {
                const v = product.variants.find(v => (v.colorName || '').toLowerCase().trim() === (group.selectedColor || '').toLowerCase().trim())
                if (v?.sizeStock?.length > 0) {
                    const s = v.sizeStock.find(s => (s.size || '').toLowerCase().trim() === (group.selectedSize || '').toLowerCase().trim())
                    qty = Number(s?.quantity ?? 0)
                }
            }
            return group.count > qty
        })
    }, [items, productsMap])

    const groupedItems = useMemo(() => {
        const summary = items.reduce((acc, item) => {
            const product = productsMap[item.productId] || {}
            const key = `${product.name || 'Produto'}-${item.selectedSize}-${item.selectedColor || 'default'}`
            if (acc[key]) { acc[key].count += 1; acc[key].itemIds.push(item.itemId) }
            else {
                acc[key] = {
                    id: item.productId, itemId: item.itemId,
                    name: product.name || 'Produto indisponível',
                    price: product.price || 0,
                    image: (() => {
                        if (item.image) return item.image
                        const c = item.selectedColor?.toLowerCase().trim()
                        if (c && product.variants) {
                            const v = product.variants.find(v => (v.colorName || v.color_name || '').toLowerCase().trim() === c)
                            if (v?.images?.length > 0) return v.images[0]
                        }
                        return product.images?.[0] || ''
                    })(),
                    selectedSize: item.selectedSize, selectedColor: item.selectedColor,
                    count: 1, itemIds: [item.itemId],
                    stock: product.stock !== undefined ? product.stock : 999,
                    costPrice: product.costPrice || product.cost_price || 0
                }
            }
            return acc
        }, {})
        return Object.values(summary)
    }, [items, productsMap])

    const subtotalValue = useMemo(() => groupedItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.count || 1), 0), [groupedItems])
    const shippingValue = checkoutMode === 'ecommerce' && selectedShipping ? Number(selectedShipping.priceCents || 0) / 100 : 0
    const totalValue = subtotalValue + shippingValue

    useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])

    const hasTrackedStart = useRef(false)
    useEffect(() => {
        if (items.length > 0 && !hasTrackedStart.current) {
            hasTrackedStart.current = true
            trackCheckoutStarted(groupedItems.reduce((s, i) => s + i.count, 0), subtotalValue)
            markCartCheckoutStarted()
        }
    }, [items.length])

    const lastSaved = useRef('')
    useEffect(() => {
        const key = `${customerData.name || ''}-${customerData.phone || ''}-${customerData.email || ''}`
        if (key !== '---' && key !== lastSaved.current) { lastSaved.current = key; saveCustomerDataToCart(customerData) }
    }, [customerData.name, customerData.phone, customerData.email])

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target
        if (name === 'cpf') setCustomerData({ cpf: formatCpf(value) })
        else if (name === 'phone') setCustomerData({ phone: formatPhone(value) })
        else setCustomerData({ [name]: value })
        setFormErrors(prev => ({ ...prev, [name]: undefined }))
    }, [setCustomerData])

    const handleAddressChange = useCallback((e) => {
        const { name, value } = e.target
        setShippingAddress(prev => ({ ...prev, [name]: name === 'state' ? value.toUpperCase().slice(0, 2) : value }))
        // Não limpar shippingOptions: o frete depende só do CEP, não da rua/número/bairro
        setFormErrors(prev => ({ ...prev, [name]: undefined }))
    }, [])

    const cepDigits = shippingAddress.zipCode?.replace(/\D/g, '') || ''
    const cepComplete = cepDigits.length === 8

    const quoteShipping = useCallback(async (overrideCep) => {
        const zip = overrideCep || cepDigits
        if (zip.length !== 8 || groupedItems.length === 0) return
        setIsQuotingShipping(true)
        setShippingOptions([])
        setSelectedShipping(null)
        try {
            const data = await quoteStoreShipping({
                zipCode: zip,
                items: groupedItems.map(i => ({ productId: i.id, selectedSize: i.selectedSize, selectedColor: i.selectedColor, quantity: i.count }))
            })
            const opts = data.options || []
            setShippingOptions(opts)
            // Auto-selecionar se houver só uma opção, ou a mais barata
            if (opts.length === 1) setSelectedShipping(opts[0])
            else if (!data.options?.length) toast.error('Nenhum frete disponível para este CEP')
        } catch (err) { toast.error(formatUserFriendlyError(err)) }
        finally { setIsQuotingShipping(false) }
    }, [cepDigits, groupedItems])

    const fetchAddressByCep = useCallback(async (raw) => {
        setIsFetchingCep(true)
        setCepCity(null)
        try {
            const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
            const data = await res.json()
            if (!data.erro) {
                setShippingAddress(prev => ({
                    ...prev,
                    street: data.logradouro || prev.street,
                    district: data.bairro || prev.district,
                    city: data.localidade || prev.city,
                    state: data.uf || prev.state,
                }))
                setCepCity({ city: data.localidade, state: data.uf })
                // Flash nos campos preenchidos
                setAddressFlash(true)
                setTimeout(() => setAddressFlash(false), 1200)
                // Auto-calcular frete
                quoteShipping(raw)
            }
        } catch { /* silent */ }
        finally { setIsFetchingCep(false) }
    }, [quoteShipping])

    const handleCepChange = useCallback((e) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
        const fmt = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw
        setShippingAddress(prev => ({ ...prev, zipCode: fmt }))
        setSelectedShipping(null)
        setShippingOptions([])
        setCepCity(null)
        setFormErrors(prev => ({ ...prev, zipCode: undefined }))
        if (raw.length === 8) fetchAddressByCep(raw)
    }, [fetchAddressByCep])

    const FIELD_LABELS = {
        name: 'Nome completo', phone: 'WhatsApp', email: 'E-mail',
        cpf: 'CPF', birth_date: 'Data de nascimento',
        zipCode: 'CEP', street: 'Rua', number: 'Número',
        district: 'Bairro', city: 'Cidade', state: 'UF',
        shipping: 'Opção de frete',
    }

    const validateForm = () => {
        const e = {}
        if (!customerData.name?.trim()) e.name = 'Obrigatório'
        if (!customerData.phone?.trim() || customerData.phone.replace(/\D/g, '').length < 10) e.phone = 'Número inválido'
        if (!customerData.email?.trim()) e.email = 'Obrigatório'
        if (!customerData.cpf?.trim()) e.cpf = 'Obrigatório'
        else if (!isValidCpf(customerData.cpf)) e.cpf = 'CPF inválido'
        if (!customerData.birth_date?.trim()) e.birth_date = 'Obrigatório'
        if (checkoutMode === 'ecommerce') {
            if (!shippingAddress.zipCode?.trim()) e.zipCode = 'Obrigatório'
            if (!shippingAddress.street?.trim()) e.street = 'Obrigatório'
            if (!shippingAddress.number?.trim()) e.number = 'Obrigatório'
            if (!shippingAddress.district?.trim()) e.district = 'Obrigatório'
            if (!shippingAddress.city?.trim()) e.city = 'Obrigatório'
            if (!shippingAddress.state?.trim() || shippingAddress.state.length !== 2) e.state = 'UF inválida'
            if (!selectedShipping) e.shipping = 'Escolha uma opção de frete'
        }
        setFormErrors(e)
        return e  // retorna o objeto de erros direto (não boolean)
    }

    const handleSubmit = async (ev) => {
        ev.preventDefault()

        const errors = validateForm()
        if (Object.keys(errors).length > 0) {
            // Mostrar especificamente o que falta
            const missing = Object.keys(errors).map(k => FIELD_LABELS[k] || k)
            toast.error(`Faltando: ${missing.join(' · ')}`, { duration: 5000 })

            // Rolar até o primeiro campo com erro
            const firstKey = Object.keys(errors)[0]
            const el = document.querySelector(`[name="${firstKey}"]`) || document.getElementById(`field-${firstKey}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })

            return
        }

        if (outOfStockItems.length > 0) return toast.error('Remova os itens esgotados para continuar.')
        setIsSubmitting(true)
        try {
            const totalPieces = groupedItems.reduce((s, i) => s + Number(i.count || 1), 0)
            if (checkoutMode === 'ecommerce') {
                const checkout = await createStoreCheckout({
                    customer: { name: customerData.name, email: customerData.email, phone: customerData.phone, cpf: customerData.cpf, birthDate: customerData.birth_date },
                    address: { ...shippingAddress, recipientName: shippingAddress.recipientName || customerData.name },
                    items: groupedItems.map(i => ({ productId: i.id, quantity: i.count, selectedSize: i.selectedSize, selectedColor: i.selectedColor })),
                    shipping: selectedShipping
                })
                clearItems(); markCartConverted()
                window.location.href = checkout.paymentUrl
                return
            }
            const result = await addOrder({ customer: customerData, totalValue: subtotalValue, items: groupedItems.map(i => ({ productId: i.id, quantity: i.count, selectedSize: i.selectedSize, selectedColor: i.selectedColor, price: i.price, costPrice: i.costPrice || 0 })), notes: customerData.notes })
            if (!result.success) throw new Error(result.error)
            triggerFireworks()
            const msg = formatMalinhaMessage(groupedItems, customerData)
            setSuccessOrder({ orderNumber: generateOrderNumber(result.order?.id), customerName: customerData.name, itemsCount: totalPieces, whatsappLink: generateWhatsAppLink('+5541996863879', msg) })
            trackCheckoutCompleted(result.order?.id, groupedItems, subtotalValue)
            markCartConverted(); clearItems(); setStep(3)
        } catch (err) { console.error(err); toast.error(formatUserFriendlyError(err)) }
        finally { setIsSubmitting(false) }
    }

    const summaryProps = { groupedItems, subtotalValue, shippingValue, checkoutMode, selectedShipping }

    // Empty state
    if (items.length === 0 && step !== 3) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                        <ShoppingBag className="w-7 h-7 text-[#C75D3B]" />
                    </div>
                    <h2 className="text-2xl font-display text-[#4A3B32] mb-2">Seleção vazia</h2>
                    <p className="text-gray-400 text-sm mb-7">Adicione peças ao catálogo para continuar.</p>
                    <Link to="/catalogo" className="btn-primary inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Ver catálogo
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO title="Finalizar Pedido" description="Finalize seu pedido Studio 30." noIndex={true} />

            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    {step > 1 && step < 3 ? (
                        <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-sm font-semibold text-[#4A3B32]/50 hover:text-[#4A3B32] transition-colors min-w-[60px]">
                            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:block">Voltar</span>
                        </button>
                    ) : (
                        <Link to="/catalogo" className="flex items-center gap-1.5 text-sm font-semibold text-[#4A3B32]/50 hover:text-[#4A3B32] transition-colors min-w-[60px]">
                            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:block">Catálogo</span>
                        </Link>
                    )}
                    <StepBar step={step} />
                    <div className="flex items-center gap-1 text-xs text-gray-400 font-medium min-w-[60px] justify-end">
                        <Lock className="w-3 h-3" /><span className="hidden sm:block">Seguro</span>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <AnimatePresence mode="wait">

                    {/* ── STEP 1: Review ─────────────────────────────── */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }} className="grid md:grid-cols-5 gap-6">
                            <div className="md:col-span-3 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-display font-semibold text-[#4A3B32]">Sua seleção</h2>
                                    <span className="text-sm text-gray-400">{items.length}/20 peças</span>
                                </div>

                                {outOfStockItems.length > 0 && (
                                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-700 font-medium">
                                            {outOfStockItems.length === 1 ? 'Uma peça esgotou.' : `${outOfStockItems.length} peças esgotaram.`} Remova-as para continuar.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {loadingProducts ? (
                                        Array.from({ length: Math.min(items.length, 4) }).map((_, i) => (
                                            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />
                                        ))
                                    ) : (
                                        groupedItems.map(item => {
                                            const product = productsMap[item.id] || {}
                                            const variants = product.variants || []
                                            const currentVariant = variants.find(v => (v.colorName || '').toLowerCase().trim() === (item.selectedColor || '').toLowerCase().trim())
                                            const availableSizes = currentVariant?.sizeStock?.filter(s => s.quantity > 0)?.map(s => s.size) || []
                                            const availableColors = variants.filter(v => v.sizeStock?.some(s => s.quantity > 0))
                                            const oos = item.stock <= 0

                                            return (
                                                <div key={item.itemIds[0]} className={cn('flex gap-4 p-4 bg-white rounded-2xl border transition-all', oos ? 'border-red-200 bg-red-50/20' : 'border-gray-100')}>
                                                    <div className="w-20 h-28 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                                                        <img src={getOptimizedImageUrl(item.image, 160)} alt={item.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h3 className="font-semibold text-[#4A3B32] text-sm leading-snug line-clamp-2">{item.name}</h3>
                                                            <button onClick={() => removeItem(item.itemIds[0])} className="text-gray-300 hover:text-red-400 transition-colors p-1 -mt-0.5 -mr-0.5 shrink-0" aria-label="Remover">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {availableColors.length > 1 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {availableColors.map(v => (
                                                                    <button key={v.colorName} type="button"
                                                                        onClick={() => { const upd = { selectedColor: v.colorName }; if (v.images?.length) upd.image = v.images[0]; updateItem(item.itemIds[0], upd) }}
                                                                        className={cn('px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all', (v.colorName || '').toLowerCase().trim() === (item.selectedColor || '').toLowerCase().trim() ? 'bg-[#4A3B32] text-white border-[#4A3B32]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#4A3B32]/30')}
                                                                    >{v.colorName}</button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {(availableSizes.length > 0 ? availableSizes : [item.selectedSize]).map(size => (
                                                                <button key={size} type="button"
                                                                    onClick={() => updateItem(item.itemIds[0], { selectedSize: size })}
                                                                    className={cn('w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold border transition-all', size === item.selectedSize ? 'bg-[#4A3B32] text-white border-[#4A3B32]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#4A3B32]/30')}
                                                                >{size}</button>
                                                            ))}
                                                        </div>

                                                        <div className="mt-2 flex items-center justify-between">
                                                            <p className="font-bold text-[#C75D3B] text-sm">{formatPrice(item.price)}</p>
                                                            {item.count > 1 && <span className="text-xs text-gray-400">×{item.count}</span>}
                                                        </div>

                                                        {oos && (
                                                            <p className="mt-1 text-xs font-bold text-red-500 flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" /> Esgotado
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    disabled={outOfStockItems.length > 0 || loadingProducts}
                                    className="w-full py-4 bg-[#4A3B32] hover:bg-[#C75D3B] text-white font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-md"
                                >
                                    Continuar →
                                </button>
                            </div>

                            <div className="md:col-span-2">
                                <div className="md:sticky md:top-24">
                                    <OrderSummary {...summaryProps} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 2: Form ────────────────────────────────── */}
                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="grid md:grid-cols-5 gap-6">

                            {/* Resumo colapsável no topo — mobile only */}
                            <div className="md:hidden col-span-full">
                                <OrderSummary {...summaryProps} />
                            </div>

                            <form id="checkout-form" onSubmit={handleSubmit} className="md:col-span-3 space-y-5 pb-28 md:pb-0">

                                {/* Personal */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                    <h3 className="font-display font-semibold text-[#4A3B32] mb-5 flex items-center gap-2 text-base">
                                        <User className="w-4 h-4 text-[#C75D3B]" /> Dados pessoais
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Nome completo" error={formErrors.name} className="sm:col-span-2">
                                            <input type="text" name="name" value={customerData.name} onChange={handleInputChange} placeholder="Maria da Silva" autoComplete="name" className={inputCls(formErrors.name)} />
                                        </Field>
                                        <Field label="WhatsApp" error={formErrors.phone}>
                                            <input type="tel" name="phone" value={customerData.phone} onChange={handleInputChange} placeholder="(41) 99999-9999" autoComplete="tel" className={inputCls(formErrors.phone)} />
                                        </Field>
                                        <Field label="E-mail" error={formErrors.email}>
                                            <input type="email" name="email" value={customerData.email || ''} onChange={handleInputChange} placeholder="email@exemplo.com" autoComplete="email" className={inputCls(formErrors.email)} />
                                        </Field>
                                        <Field label="CPF" error={formErrors.cpf}>
                                            <input type="text" name="cpf" value={customerData.cpf || ''} onChange={handleInputChange} placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" maxLength={14} className={inputCls(formErrors.cpf)} />
                                        </Field>
                                        <Field label="Data de nascimento" error={formErrors.birth_date}>
                                            <input type="date" name="birth_date" value={customerData.birth_date || ''} onChange={handleInputChange} autoComplete="bday" className={inputCls(formErrors.birth_date)} />
                                        </Field>
                                    </div>
                                </div>

                                {/* Shipping */}
                                {checkoutMode === 'ecommerce' && (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                        <h3 className="font-display font-semibold text-[#4A3B32] mb-5 flex items-center gap-2 text-base">
                                            <Truck className="w-4 h-4 text-[#C75D3B]" /> Endereço de entrega
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* CEP com feedback visual completo */}
                                            <div className="sm:col-span-2">
                                                <Field label="CEP" error={formErrors.zipCode}>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            name="zipCode"
                                                            value={shippingAddress.zipCode}
                                                            onChange={handleCepChange}
                                                            placeholder="00000-000"
                                                            inputMode="numeric"
                                                            maxLength={9}
                                                            className={cn(inputCls(formErrors.zipCode), 'pr-10')}
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <AnimatePresence mode="wait">
                                                                {isFetchingCep && (
                                                                    <motion.div key="spin" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                                                                        <Loader2 className="w-4 h-4 text-[#C75D3B] animate-spin" />
                                                                    </motion.div>
                                                                )}
                                                                {!isFetchingCep && cepCity && (
                                                                    <motion.div key="check" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                                                                        <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} />
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </Field>

                                                {/* Feedback cidade encontrada */}
                                                <div className="mt-1.5 flex items-center justify-between">
                                                    <AnimatePresence>
                                                        {cepCity && !isFetchingCep && (
                                                            <motion.div
                                                                initial={{ opacity: 0, x: -8 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0 }}
                                                                className="flex items-center gap-1.5"
                                                            >
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-700">
                                                                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                                                    {cepCity.city} — {cepCity.state}
                                                                </span>
                                                                <span className="text-[11px] text-gray-400">Endereço preenchido automaticamente</span>
                                                            </motion.div>
                                                        )}
                                                        {isFetchingCep && (
                                                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-[#C75D3B] font-medium flex items-center gap-1">
                                                                <Loader2 className="w-3 h-3 animate-spin" /> Buscando endereço...
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                    <a href="https://buscacepinter.correios.com.br/" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#C75D3B] hover:underline ml-auto">
                                                        Não sei meu CEP
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Campos de endereço com flash quando auto-preenchidos */}
                                            <motion.div
                                                className="sm:col-span-2"
                                                animate={addressFlash ? { boxShadow: ['0 0 0 0px rgba(16,185,129,0)', '0 0 0 3px rgba(16,185,129,0.25)', '0 0 0 0px rgba(16,185,129,0)'] } : {}}
                                                transition={{ duration: 0.8 }}
                                            >
                                                <div className={cn('rounded-xl overflow-hidden transition-all duration-500', addressFlash ? 'bg-emerald-50/40' : 'bg-transparent')}>
                                                    <Field label="Rua / Avenida" error={formErrors.street}>
                                                        <input type="text" name="street" value={shippingAddress.street} onChange={handleAddressChange} placeholder="Preenchida automaticamente" className={cn(inputCls(formErrors.street), addressFlash && shippingAddress.street ? 'ring-1 ring-emerald-300/60' : '')} />
                                                    </Field>
                                                </div>
                                            </motion.div>

                                            <Field label="Número" error={formErrors.number}>
                                                <input type="text" name="number" value={shippingAddress.number} onChange={handleAddressChange} placeholder="123" className={inputCls(formErrors.number)} />
                                            </Field>

                                            <Field label="Complemento (opcional)">
                                                <input type="text" name="complement" value={shippingAddress.complement} onChange={handleAddressChange} placeholder="Apto 42" className={inputCls(false)} />
                                            </Field>

                                            <Field label="Destinatário (opcional)">
                                                <input type="text" name="recipientName" value={shippingAddress.recipientName} onChange={handleAddressChange} placeholder={customerData.name || 'Quem vai receber'} className={inputCls(false)} />
                                            </Field>

                                            <Field label="Bairro" error={formErrors.district}>
                                                <input type="text" name="district" value={shippingAddress.district} onChange={handleAddressChange} placeholder="Preenchido automaticamente" className={cn(inputCls(formErrors.district), addressFlash && shippingAddress.district ? 'ring-1 ring-emerald-300/60' : '')} />
                                            </Field>

                                            <div className="grid grid-cols-[1fr_68px] gap-3">
                                                <Field label="Cidade" error={formErrors.city}>
                                                    <input type="text" name="city" value={shippingAddress.city} onChange={handleAddressChange} placeholder="Preenchida automaticamente" className={cn(inputCls(formErrors.city), addressFlash && shippingAddress.city ? 'ring-1 ring-emerald-300/60' : '')} />
                                                </Field>
                                                <Field label="UF" error={formErrors.state}>
                                                    <input type="text" name="state" value={shippingAddress.state} onChange={handleAddressChange} maxLength={2} className={cn(inputCls(formErrors.state), 'uppercase text-center tracking-widest', addressFlash && shippingAddress.state ? 'ring-1 ring-emerald-300/60' : '')} />
                                                </Field>
                                            </div>

                                            {/* Shipping — frete animado */}
                                            <div className="sm:col-span-2" id="field-shipping">
                                                <AnimatePresence mode="wait">

                                                    {/* Estado: calculando */}
                                                    {isQuotingShipping && (
                                                        <motion.div
                                                            key="shipping-loading"
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -8 }}
                                                            className="flex flex-col items-center gap-4 py-10 px-6 bg-gradient-to-b from-[#FDFBF7] to-white rounded-2xl border border-dashed border-[#C75D3B]/20"
                                                        >
                                                            {/* Caminhão animado */}
                                                            <div className="relative">
                                                                <motion.div
                                                                    animate={{ x: [-8, 8, -8] }}
                                                                    transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                                                                    className="text-4xl select-none"
                                                                >
                                                                    🚚
                                                                </motion.div>
                                                                {/* Estrada */}
                                                                <motion.div
                                                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-[#C75D3B]/20"
                                                                    animate={{ width: ['20px', '60px', '20px'] }}
                                                                    transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                                                                />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-sm font-semibold text-[#4A3B32]/70">Calculando as melhores opções...</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">Isso leva apenas um segundo</p>
                                                            </div>
                                                            {/* Dots */}
                                                            <div className="flex gap-1.5">
                                                                {[0, 1, 2].map(i => (
                                                                    <motion.div key={i}
                                                                        className="w-1.5 h-1.5 rounded-full bg-[#C75D3B]"
                                                                        animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.2, 0.8] }}
                                                                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.18 }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* Estado: opções disponíveis */}
                                                    {!isQuotingShipping && shippingOptions.length > 0 && (
                                                        <motion.div
                                                            key="shipping-options"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="space-y-2.5"
                                                        >
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="h-px flex-1 bg-gray-100" />
                                                                <p className="text-[11px] font-bold text-[#4A3B32]/40 uppercase tracking-widest whitespace-nowrap">
                                                                    {shippingOptions.length} opção{shippingOptions.length > 1 ? 'ões' : ''} disponível{shippingOptions.length > 1 ? 'is' : ''}
                                                                </p>
                                                                <div className="h-px flex-1 bg-gray-100" />
                                                            </div>

                                                            {shippingOptions.map((opt, idx) => {
                                                                const isSelected = selectedShipping?.id === opt.id
                                                                return (
                                                                    <motion.button
                                                                        key={opt.id}
                                                                        type="button"
                                                                        onClick={() => setSelectedShipping(opt)}
                                                                        initial={{ opacity: 0, y: 14 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ delay: idx * 0.07, duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                                                                        whileHover={{ scale: 1.01 }}
                                                                        whileTap={{ scale: 0.99 }}
                                                                        className={cn(
                                                                            'w-full rounded-2xl border-2 p-4 text-left transition-all duration-200 relative overflow-hidden group',
                                                                            isSelected
                                                                                ? 'border-[#C75D3B] shadow-md shadow-[#C75D3B]/10'
                                                                                : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-sm'
                                                                        )}
                                                                    >
                                                                        {/* Fundo colorido sutil quando selecionado */}
                                                                        <AnimatePresence>
                                                                            {isSelected && (
                                                                                <motion.div
                                                                                    key="bg"
                                                                                    initial={{ opacity: 0 }}
                                                                                    animate={{ opacity: 1 }}
                                                                                    exit={{ opacity: 0 }}
                                                                                    className="absolute inset-0 bg-gradient-to-r from-[#C75D3B]/5 to-[#E07850]/5"
                                                                                />
                                                                            )}
                                                                        </AnimatePresence>

                                                                        <div className="flex items-center gap-4 relative z-10">
                                                                            {/* Ícone */}
                                                                            <motion.div
                                                                                animate={isSelected ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                                                                                transition={{ duration: 0.3 }}
                                                                                className={cn(
                                                                                    'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200',
                                                                                    isSelected ? 'bg-[#C75D3B]' : 'bg-gray-100 group-hover:bg-gray-200'
                                                                                )}
                                                                            >
                                                                                <Truck className={cn('w-5 h-5 transition-colors', isSelected ? 'text-white' : 'text-gray-400')} />
                                                                            </motion.div>

                                                                            {/* Info */}
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-bold text-sm text-[#4A3B32] leading-tight">
                                                                                    {opt.carrier}
                                                                                    {opt.service && (
                                                                                        <span className={cn('ml-2 text-xs font-semibold', isSelected ? 'text-[#C75D3B]' : 'text-gray-400')}>
                                                                                            {opt.service}
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                                                    <Calendar className="w-3 h-3" />
                                                                                    {opt.deliveryTimeDays} {opt.deliveryTimeDays === 1 ? 'dia útil' : 'dias úteis'}
                                                                                </p>
                                                                            </div>

                                                                            {/* Preço + radio */}
                                                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                                                <p className={cn('font-black text-base tabular-nums', isSelected ? 'text-[#C75D3B]' : 'text-[#4A3B32]')}>
                                                                                    R$ {(opt.priceCents / 100).toFixed(2)}
                                                                                </p>
                                                                                <div className={cn(
                                                                                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0',
                                                                                    isSelected ? 'border-[#C75D3B] bg-[#C75D3B]' : 'border-gray-300 bg-white'
                                                                                )}>
                                                                                    <AnimatePresence>
                                                                                        {isSelected && (
                                                                                            <motion.div
                                                                                                key="dot"
                                                                                                initial={{ scale: 0 }}
                                                                                                animate={{ scale: 1 }}
                                                                                                exit={{ scale: 0 }}
                                                                                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                                                                className="w-2 h-2 rounded-full bg-white"
                                                                                            />
                                                                                        )}
                                                                                    </AnimatePresence>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </motion.button>
                                                                )
                                                            })}

                                                            {formErrors.shipping && (
                                                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                                    className="text-xs text-red-500 font-semibold">
                                                                    {formErrors.shipping}
                                                                </motion.p>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => { setShippingOptions([]); setSelectedShipping(null) }}
                                                                className="text-[11px] text-gray-400 hover:text-[#C75D3B] transition-colors flex items-center gap-1 mt-1"
                                                            >
                                                                <RotateCcw className="w-3 h-3" /> Usar outro CEP
                                                            </button>
                                                        </motion.div>
                                                    )}

                                                    {/* Estado: CEP completo, buscando endereço */}
                                                    {!isQuotingShipping && shippingOptions.length === 0 && cepComplete && isFetchingCep && (
                                                        <motion.div
                                                            key="shipping-cep-loading"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="flex items-center gap-3 py-4 px-4 bg-gray-50 rounded-2xl"
                                                        >
                                                            <Loader2 className="w-4 h-4 text-[#C75D3B] animate-spin flex-shrink-0" />
                                                            <p className="text-sm text-gray-500">Buscando endereço...</p>
                                                        </motion.div>
                                                    )}

                                                    {/* Estado: CEP completo, frete não calculado / falhou — mostrar botão */}
                                                    {!isQuotingShipping && shippingOptions.length === 0 && cepComplete && !isFetchingCep && (
                                                        <motion.div
                                                            key="shipping-calc"
                                                            initial={{ opacity: 0, y: 6 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0 }}
                                                            className="space-y-3"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => quoteShipping()}
                                                                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-[#4A3B32] hover:bg-[#C75D3B] text-white text-sm font-bold transition-colors shadow-sm"
                                                            >
                                                                <Truck className="w-4 h-4" />
                                                                Calcular frete para {shippingAddress.zipCode}
                                                            </button>
                                                            <p className="text-[11px] text-center text-gray-400">
                                                                Frete calculado automaticamente ao digitar o CEP
                                                            </p>
                                                        </motion.div>
                                                    )}

                                                    {/* Estado: ocioso — aguarda CEP */}
                                                    {!isQuotingShipping && shippingOptions.length === 0 && !cepComplete && (
                                                        <motion.div
                                                            key="shipping-idle"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="flex items-center gap-3 py-5 px-4 bg-gray-50/80 rounded-2xl border border-dashed border-gray-200"
                                                        >
                                                            <div className="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center flex-shrink-0">
                                                                <Package className="w-4 h-4 text-gray-300" />
                                                            </div>
                                                            <p className="text-sm text-gray-400">
                                                                Digite o CEP acima para ver as opções de frete automaticamente
                                                            </p>
                                                        </motion.div>
                                                    )}

                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Malinha switcher */}
                                <AnimatePresence mode="wait">
                                    {checkoutMode === 'ecommerce' ? (
                                        <motion.div key="sw-e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between gap-4 px-5 py-4 bg-[#FAF6F2] border border-[#E8D5C8] rounded-2xl">
                                            <div>
                                                <p className="text-sm font-bold text-[#4A3B32]">Mora em Curitiba? Quer provar antes?</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Receba a malinha em casa e escolha o que fica.</p>
                                            </div>
                                            <button type="button" onClick={() => { setCheckoutMode('malinha'); setSelectedShipping(null) }} className="shrink-0 text-xs font-bold text-[#C75D3B] border border-[#C75D3B]/40 rounded-xl px-4 py-2.5 hover:bg-[#C75D3B] hover:text-white transition-all whitespace-nowrap">
                                                Solicitar Malinha
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="sw-m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between gap-4 px-5 py-4 bg-[#C75D3B]/10 border border-[#C75D3B]/20 rounded-2xl">
                                            <div>
                                                <p className="text-sm font-bold text-[#4A3B32]">🛍️ Modo Malinha ativado</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Entraremos em contato para agendar a entrega.</p>
                                            </div>
                                            <button type="button" onClick={() => setCheckoutMode('ecommerce')} className="shrink-0 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-100 transition-all whitespace-nowrap">
                                                ← Comprar Online
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Submit */}
                                <button type="submit" disabled={isSubmitting}
                                    className="w-full py-4 bg-[#C75D3B] hover:bg-[#A64D31] active:scale-[0.99] text-white font-bold rounded-2xl text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-[#C75D3B]/20"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                                    ) : checkoutMode === 'ecommerce' ? (
                                        <><Zap className="w-4 h-4" /> Pagar agora — {formatPrice(totalValue)}</>
                                    ) : (
                                        <><ShoppingBag className="w-4 h-4" /> Solicitar Malinha</>
                                    )}
                                </button>

                                <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5 pb-2">
                                    <Lock className="w-3 h-3" /> Pagamento 100% seguro com criptografia SSL
                                </p>
                            </form>

                            {/* Sticky summary */}
                            <div className="md:col-span-2 hidden md:block">
                                <div className="sticky top-24 space-y-3">
                                    <OrderSummary {...summaryProps} />
                                    <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
                                        <Lock className="w-3 h-3" /> Dados protegidos com SSL
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 3: Success ─────────────────────────────── */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="max-w-md mx-auto">
                            <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 py-10 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />
                                    <motion.div className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}>
                                        <Check className="w-8 h-8 text-white" strokeWidth={3} />
                                    </motion.div>
                                    <h2 className="text-2xl font-display font-bold text-white relative z-10">Pedido confirmado!</h2>
                                    <p className="text-emerald-100 text-sm mt-1 relative z-10">Você receberá um e-mail em breve.</p>
                                </div>

                                <div className="p-6 space-y-5">
                                    <div className="text-center py-4 bg-gray-50 rounded-2xl">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Número do pedido</p>
                                        <p className="text-xl font-mono font-bold text-[#4A3B32] tracking-wider">{successOrder?.orderNumber}</p>
                                    </div>

                                    <div className="space-y-3">
                                        {[
                                            'Confirme seu pedido pelo WhatsApp abaixo',
                                            'Aguarde o agendamento da entrega',
                                            'Experimente as peças por até 24h em casa'
                                        ].map((text, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-[#C75D3B]/10 text-[#C75D3B] rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</span>
                                                <p className="text-sm text-gray-600">{text}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => window.open(successOrder?.whatsappLink, '_blank')}
                                        className="w-full py-4 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-md shadow-green-500/20 transition-colors"
                                    >
                                        <MessageCircle className="w-5 h-5" /> Confirmar pelo WhatsApp
                                    </button>

                                    <Link to="/catalogo" onClick={() => resetAll()} className="block text-center text-sm text-gray-400 hover:text-[#C75D3B] transition-colors py-1">
                                        Continuar navegando →
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── BOTÃO PAGAR — sticky no rodapé mobile ──────────── */}
            <AnimatePresence>
                {step === 2 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="md:hidden sticky-bottom-bar"
                    >
                        <button
                            form="checkout-form"
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-[#C75D3B] active:bg-[#A64D31] text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#C75D3B]/25 disabled:opacity-50 active:scale-[0.99] transition-all"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                            ) : checkoutMode === 'ecommerce' ? (
                                <><Zap className="w-4 h-4" /> Pagar — {formatPrice(totalValue)}</>
                            ) : (
                                <><ShoppingBag className="w-4 h-4" /> Solicitar Malinha</>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default Checkout
