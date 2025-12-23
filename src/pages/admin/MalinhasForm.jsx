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
    Check
} from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export function MalinhasForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = !!id

    const {
        products,
        customers,
        loadProducts,
        loadCustomers,
        addOrder,
        updateOrder,
        getOrderById
    } = useAdminStore()

    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        deliveryDate: '',
        pickupDate: '',
        status: 'pending',
        items: []
    })

    const [customerSearch, setCustomerSearch] = useState('')
    const [productSearch, setProductSearch] = useState('')
    const [showCustomerSearch, setShowCustomerSearch] = useState(false)
    const [showProductSearch, setShowProductSearch] = useState(false)

    useEffect(() => {
        loadProducts()
        loadCustomers()

        if (isEdit) {
            const order = getOrderById(parseInt(id))
            if (order) {
                setFormData({
                    customerId: order.customer.id,
                    customerName: order.customer.name,
                    deliveryDate: order.deliveryDate ? order.deliveryDate.split('T')[0] : '',
                    pickupDate: order.pickupDate ? order.pickupDate.split('T')[0] : '',
                    status: order.status,
                    items: order.items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        price: item.price,
                        costPrice: item.costPrice || 0,
                        selectedSize: item.selectedSize,
                        image: item.image
                    }))
                })
            }
        }
    }, [id, isEdit, loadProducts, loadCustomers, getOrderById])

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
    )

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    )

    const addItem = (product, size) => {
        const newItem = {
            productId: product.id,
            productName: product.name,
            price: product.price,
            costPrice: product.costPrice || 0,
            selectedSize: size,
            image: product.images?.[0] || 'https://via.placeholder.com/150'
        }
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }))
        setShowProductSearch(false)
        setProductSearch('')
        toast.success(`${product.name} adicionado à malinha.`)
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

        const payload = {
            ...formData,
            totalValue,
            itemsCount: formData.items.length,
            customer: customers.find(c => c.id === formData.customerId)
        }

        const action = isEdit ? updateOrder(parseInt(id), payload) : addOrder(payload)

        toast.promise(action, {
            loading: isEdit ? 'Atualizando malinha...' : 'Criando malinha...',
            success: (result) => {
                if (result.success) {
                    navigate('/admin/malinhas')
                    return isEdit ? 'Malinha atualizada!' : 'Malinha criada com sucesso!'
                }
                throw new Error(result.error)
            },
            error: (err) => `Erro: ${err.message}`
        })
    }

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-6">
                    <Link
                        to="/admin/malinhas"
                        className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-6 h-6 text-[#4A3B32]" />
                    </Link>
                    <div>
                        <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">
                            {isEdit ? 'Editar Malinha' : 'Montar Nova Malinha'}
                        </h2>
                        <p className="text-[#4A3B32]/40 font-medium italic">
                            Personalize a seleção para sua cliente.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* Produtos da Malinha */}
                    <Card className="border-none shadow-xl">
                        <CardHeader className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3">
                                <ShoppingBag className="w-5 h-5 text-[#C75D3B]" />
                                Itens Selecionados
                            </CardTitle>
                            <button
                                type="button"
                                onClick={() => setShowProductSearch(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#FDF0ED] text-[#C75D3B] rounded-xl text-xs font-bold hover:bg-[#FCE4DC] transition-all"
                            >
                                <Plus className="w-4 h-4" /> ADICIONAR PRODUTO
                            </button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {formData.items.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="p-6 flex items-center gap-6 group hover:bg-gray-50/50">
                                            <div className="w-16 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-[#4A3B32]">{item.productName}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase tracking-tighter">
                                                        TAM: {item.selectedSize}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#C75D3B]">
                                                        R$ {(item.price || 0).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-gray-300 italic">
                                    Nenhum produto adicionado ainda.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Logística & Datas */}
                    <Card className="border-none shadow-xl">
                        <CardHeader className="p-8 border-b border-gray-50">
                            <CardTitle className="flex items-center gap-3">
                                <CalendarIcon className="w-5 h-5 text-[#C75D3B]" />
                                Agendamento Logístico
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Previsão de Entrega</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="date"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 transition-all font-bold text-[#4A3B32]"
                                            value={formData.deliveryDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Janela de Coleta</label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="date"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 transition-all font-bold text-[#4A3B32]"
                                            value={formData.pickupDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, pickupDate: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Cliente Selection */}
                    <Card className="border-none shadow-xl overflow-hidden">
                        <div className="h-2 bg-[#C75D3B]" />
                        <CardHeader className="p-6">
                            <CardTitle className="flex items-center justify-between text-lg">
                                <span className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-gray-400" />
                                    Cliente
                                </span>
                                {formData.customerId && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, customerId: '', customerName: '' }))}
                                        className="text-[10px] font-bold text-[#C75D3B] uppercase"
                                    >
                                        Trocar
                                    </button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            {formData.customerId ? (
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                    <div className="w-12 h-12 rounded-full bg-[#FAF3F0] flex items-center justify-center text-[#C75D3B] font-bold">
                                        {formData.customerName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#4A3B32]">{formData.customerName}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-black">Cliente Selecionada</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente..."
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#C75D3B]/20 transition-all"
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
                                                className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto"
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
                                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold">
                                                            {c.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-[#4A3B32]">{c.name}</p>
                                                            <p className="text-[10px] text-gray-400">{c.phone}</p>
                                                        </div>
                                                    </button>
                                                )) : (
                                                    <div className="p-4 text-center text-xs text-gray-400 italic">Cliente não localizada</div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Status selection */}
                    <Card className="border-none shadow-xl">
                        <CardHeader className="p-6">
                            <CardTitle className="text-lg">Status da Malinha</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            {['pending', 'shipped', 'completed', 'cancelled'].map(status => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, status }))}
                                    className={cn(
                                        "w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-left flex items-center justify-between border transition-all",
                                        formData.status === status
                                            ? "bg-[#4A3B32] text-white border-[#4A3B32] shadow-md"
                                            : "bg-white text-gray-400 border-gray-100 hover:border-[#C75D3B] hover:text-[#C75D3B]"
                                    )}
                                >
                                    {status === 'pending' ? 'Pendente' :
                                        status === 'shipped' ? 'Enviada' :
                                            status === 'completed' ? 'Concluída' : 'Cancelada'}
                                    {formData.status === status && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <button
                        type="submit"
                        className="w-full py-6 bg-[#C75D3B] text-white rounded-3xl font-display font-bold text-xl shadow-xl shadow-[#C75D3B]/20 hover:bg-[#A64D31] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Save className="w-6 h-6" />
                        {isEdit ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR MALINHA'}
                    </button>
                    <Link
                        to="/admin/malinhas"
                        className="w-full py-4 text-center block text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        DESCARTAR
                    </Link>
                </div>
            </form>

            {/* Product Modal */}
            <AnimatePresence>
                {showProductSearch && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-[#FAF8F5]/50">
                                <div>
                                    <h3 className="text-2xl font-display font-bold text-[#4A3B32]">Inclusão de Produto</h3>
                                    <p className="text-xs text-gray-400 font-medium italic mt-1">Busque por nome e selecione o tamanho.</p>
                                </div>
                                <button
                                    onClick={() => setShowProductSearch(false)}
                                    className="p-3 hover:bg-white rounded-2xl transition-all"
                                >
                                    <Trash2 className="w-6 h-6 text-gray-300" />
                                </button>
                            </div>

                            <div className="p-8 border-b border-gray-50">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                    <input
                                        type="text"
                                        placeholder="Nome do produto..."
                                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium transition-all"
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {filteredProducts.length > 0 ? filteredProducts.map(p => {
                                    const isSingleSize = p.sizes?.length === 1;
                                    const canBeAdded = p.stock > 0;

                                    return (
                                        <div 
                                            key={p.id} 
                                            className={cn(
                                                "p-4 bg-gray-50/50 rounded-3xl border border-transparent transition-all flex items-center gap-6 group",
                                                canBeAdded && "hover:border-[#C75D3B]/20 hover:bg-white",
                                                canBeAdded && isSingleSize && "cursor-pointer"
                                            )}
                                            onClick={() => {
                                                if (canBeAdded && isSingleSize) {
                                                    addItem(p, p.sizes[0]);
                                                }
                                            }}
                                        >
                                            <div className="w-20 h-24 rounded-2xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                                                <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-lg font-bold text-[#4A3B32]">{p.name}</h4>
                                                    <Badge variant={p.stock > 0 ? 'success' : 'danger'}>
                                                        {p.stock > 0 ? `${p.stock} em estoque` : 'Esgotado'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm font-bold text-[#C75D3B]">R$ {(p.price || 0).toLocaleString('pt-BR')}</p>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {(p.sizes || []).map(size => (
                                                        <button
                                                            key={size}
                                                            onClick={(e) => {
                                                                if (!isSingleSize) {
                                                                    e.stopPropagation(); // Evita que o click do card seja acionado
                                                                    addItem(p, size);
                                                                }
                                                            }}
                                                            disabled={!canBeAdded}
                                                            className={cn(
                                                                "px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[10px] font-black text-[#4A3B32] transition-all shadow-sm",
                                                                canBeAdded && "hover:bg-[#C75D3B] hover:text-white",
                                                                !canBeAdded && "opacity-50 cursor-not-allowed",
                                                                isSingleSize && "hidden" // Esconde o botão se for tamanho único
                                                            )}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="py-20 text-center text-gray-300 italic font-display">Busque para começar...</div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
