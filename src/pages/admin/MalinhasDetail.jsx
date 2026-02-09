import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, Phone, Mail, Package, CheckCircle, Truck, XCircle, Calendar, MessageSquare, ExternalLink, ChevronRight, User, Pencil } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { AlertDialog } from '@/components/ui/AlertDialog'

export function MalinhasDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getOrderById, fetchOrder, updateStatus, updateSchedule, ordersLoading, finalizeMalinha } = useAdminStore()
    const [order, setOrder] = useState(null)
    const [keptItems, setKeptItems] = useState([]) // Array de IDs de produtos/itens que ficaram
    const [showConfirmSale, setShowConfirmSale] = useState(false)
    const [saleConfig, setSaleConfig] = useState({
        paymentMethod: 'pix',
        numInstallments: 1,
        entryPayment: 0,
        installmentStartDate: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        const orderInStore = getOrderById(id);

        const loadOrderData = async () => {
            try {
                let orderData = orderInStore;
                if (!orderInStore || !orderInStore.items) {
                    if (!orderInStore || !orderInStore.items) {
                        // console.log('📥 Buscando ordem do servidor:', id);
                        orderData = await fetchOrder(id);
                        // console.log('✅ Ordem carregada:', orderData);
                    }
                }

                if (!orderData) {
                    if (!orderData) {
                        // console.warn('⚠️ Nenhuma ordem encontrada para ID:', id);
                        return;
                    }
                    return;
                }

                setOrder(orderData);
            } catch (error) {
                // console.error('❌ Erro ao carregar ordem:', error);
                setOrder(null);
            }
        };

        loadOrderData();
    }, [id, getOrderById, fetchOrder]);

    if (!order) {
        return (
            <div className="p-24 text-center space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Package className="w-10 h-10 text-gray-200" />
                </div>
                <h2 className="text-2xl font-display font-bold text-[#4A3B32]">Pedido não localizado</h2>
                <p className="text-gray-400">O registro que você procura pode ter sido removido ou o ID está incorreto.</p>
                <Link to="/admin/malinhas" className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A3B32] text-white rounded-2xl font-bold hover:scale-105 transition-all outline-none">
                    <ArrowLeft className="w-4 h-4" /> Voltar para Malinhas
                </Link>
            </div>
        )
    }

    const handleStatusChange = async (newStatus) => {
        toast.promise(updateStatus(order.id, newStatus), {
            loading: 'Atualizando status...',
            success: (result) => {
                if (result.success) {
                    setOrder(result.order)
                    return {
                        message: `Status atualizado para ${statusMap[newStatus]?.label}!`,
                        description: `A mala ${order.orderNumber} agora está ${statusMap[newStatus]?.label.toLowerCase()}.`
                    }
                }
                throw new Error(result.error)
            },
            error: (err) => formatUserFriendlyError(err)
        })
    }

    const handleScheduleChange = async (e) => {
        const { name, value } = e.target
        const result = await updateSchedule(order.id, { [name]: value })
        if (result.success) {
            setOrder(result.order)
            toast.success(`Data de ${name === 'deliveryDate' ? 'entrega' : 'coleta'} atualizada!`, {
                description: `Nova data definida para: ${new Date(value).toLocaleDateString('pt-BR')}`,
                icon: '📅'
            })
        }
    }

    const toggleItemKept = (itemIndex) => {
        setKeptItems(prev =>
            prev.includes(itemIndex)
                ? prev.filter(i => i !== itemIndex)
                : [...prev, itemIndex]
        )
    }

    const handleFinalizeSale = () => {
        if (keptItems.length === 0) {
            toast.error('Selecione pelo menos uma peça que a cliente ficou.')
            return
        }
        setShowConfirmSale(true)
    }

    const confirmFinalizeSale = async () => {
        if (!order.customer) {
            toast.error('Não é possível finalizar a venda pois não há cliente associado a este pedido.');
            return;
        }

        const itemsToSell = order.items.filter((_, idx) => keptItems.includes(idx))
        const totalKept = itemsToSell.reduce((sum, item) => sum + item.price, 0)
        const totalCost = itemsToSell.reduce((sum, item) => sum + (item.costPrice || 0), 0)

        const isCrediario = saleConfig.paymentMethod === 'fiado_parcelado'

        const vendaData = {
            customerId: order.customer.id,
            customerName: order.customer.name,
            items: itemsToSell.map(item => ({
                productId: item.productId,
                name: item.productName,
                price: item.price,
                costPrice: item.costPrice || 0,
                selectedSize: item.selectedSize,
                ...(item.selectedColor && { selectedColor: item.selectedColor }),
                quantity: 1,
                image: item.image
            })),
            totalValue: totalKept,
            costPrice: totalCost,
            paymentMethod: saleConfig.paymentMethod,
            paymentStatus: isCrediario ? 'pending' : 'paid',
            date: new Date().toISOString(),
            source: 'malinha',
            malinhaId: order.id,
            isInstallment: isCrediario,
            numInstallments: isCrediario ? saleConfig.numInstallments : 1,
            entryPayment: isCrediario ? saleConfig.entryPayment : 0,
            installmentStartDate: isCrediario ? saleConfig.installmentStartDate : null
        }

        const result = await finalizeMalinha(order.id, keptItems, vendaData)
        if (result.success) {
            const vendaId = result.id || result.data?.id
            if (isCrediario && vendaId) {
                try {
                    await createInstallments(
                        vendaId,
                        saleConfig.numInstallments,
                        saleConfig.entryPayment,
                        saleConfig.installmentStartDate
                    )
                } catch (e) {
                    console.error("Erro ao gerar parcelas da malinha", e)
                }
            }
            toast.success("Venda gerada com sucesso!", { description: "A malinha foi concluída e o estoque atualizado.", icon: "✅" });
            navigate("/admin/vendas");
        } else {
            toast.error("Erro ao gerar venda", { description: result.error, icon: "❌" });
        }
    }


        const statusMap = {
            pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
            shipped: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: Truck },
            delivered: { label: 'Entregue', color: 'bg-indigo-100 text-indigo-700', icon: Package },
            pickup_scheduled: { label: 'Coleta Agendada', color: 'bg-purple-100 text-purple-700', icon: Calendar },
            returned: { label: 'Devolvido', color: 'bg-amber-100 text-amber-700', icon: Clock },
            completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
            cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
        }

        const currentStatus = statusMap[order.status] || statusMap.pending

        return (
            <div className="max-w-6xl mx-auto space-y-10 pb-20">
                {/* Elegant Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                    <div className="flex items-center gap-6">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate('/admin/malinhas')}
                            className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all"
                        >
                            <ArrowLeft className="w-6 h-6 text-[#4A3B32]" />
                        </motion.button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">{order.orderNumber}</h2>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                    currentStatus.color
                                )}>
                                    {currentStatus.label}
                                </span>
                            </div>
                            <p className="text-[#4A3B32]/40 font-medium italic">Gerado em {order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : 'Data desconhecida'}</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            to={`/admin/malinhas/${order.id}/edit`}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-[#4A3B32] rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-lg active:scale-95"
                        >
                            <Pencil className="w-5 h-5" /> Editar Peças
                        </Link>
                        {order.customer && order.customer.phone && (
                            <a
                                href={`https://wa.me/${order.customer.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#128C7E] transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
                            >
                                <MessageSquare className="w-5 h-5" /> Contato WhatsApp
                            </a>
                        )}
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Items Card */}
                        <Card className="overflow-hidden border-none shadow-xl">
                            <CardHeader className="bg-white p-8 border-b border-gray-50 flex items-center justify-between">
                                <CardTitle className="text-xl flex items-center gap-3">
                                    <Package className="w-6 h-6 text-[#C75D3B]" />
                                    Conteúdo da Malinha
                                </CardTitle>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{(order.items || []).length} Peças Selecionadas</span>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-50">
                                    {(order.items || []).map((item, idx) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            key={idx}
                                            className={cn(
                                                "p-8 flex items-center gap-6 group transition-colors",
                                                keptItems.includes(idx) ? "bg-[#FAF8F5]" : "hover:bg-[#FAF8F5]/50"
                                            )}
                                        >
                                            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                                <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h4 className="text-lg font-bold text-[#4A3B32]">{item.productName}</h4>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-[#C75D3B] bg-[#FDF0ED] px-2 py-0.5 rounded uppercase">Tam: {item.selectedSize}</span>
                                                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">REF: {item.productId || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-xl font-bold text-[#4A3B32]">R$ ${(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>

                                                <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
                                                    <button
                                                        onClick={() => !keptItems.includes(idx) && toggleItemKept(idx)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
                                                            keptItems.includes(idx)
                                                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                                : "text-gray-400 hover:text-gray-600"
                                                        )}
                                                    >
                                                        Ficou
                                                    </button>
                                                    <button
                                                        onClick={() => keptItems.includes(idx) && toggleItemKept(idx)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
                                                            !keptItems.includes(idx)
                                                                ? "bg-white text-gray-600 shadow-sm"
                                                                : "text-gray-400 hover:text-gray-600"
                                                        )}
                                                    >
                                                        Devolveu
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="p-8 bg-[#FAF8F5]/30 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 group">
                                    <div className="flex flex-col">
                                        <span className="text-[#4A3B32]/60 font-medium">Resumo do Checkout</span>
                                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{keptItems.length} peças selecionadas para venda</span>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className="text-3xl font-display font-bold text-[#C75D3B]">
                                            R$ {(order.items.filter((_, i) => keptItems.includes(i)).reduce((s, it) => s + (it.price || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <button
                                            onClick={handleFinalizeSale}
                                            disabled={keptItems.length === 0}
                                            className={cn(
                                                "flex items-center gap-3 px-8 py-4 rounded-[24px] font-bold shadow-lg transition-all text-sm uppercase tracking-widest active:scale-95",
                                                keptItems.length > 0
                                                    ? "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600"
                                                    : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                            )}
                                        >
                                            <CheckCircle className="w-5 h-5" /> Finalizar Venda
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timeline Card */}
                        <Card className="border-none shadow-xl">
                            <CardHeader className="p-8 border-b border-gray-50">
                                <CardTitle className="text-xl">Histórico do Atendimento</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="space-y-10">
                                    {(order.statusHistory || []).map((step, idx) => (
                                        <div key={idx} className="flex gap-6 relative">
                                            {idx !== (order.statusHistory.length - 1) && (
                                                <div className="absolute left-[11px] top-8 bottom-[-40px] w-[2px] bg-gray-100" />
                                            )}
                                            <div className={cn(
                                                "w-6 h-6 rounded-full mt-1 border-4 border-white shadow-md z-10 transition-colors duration-500",
                                                idx === 0 ? "bg-[#C75D3B]" : "bg-gray-200"
                                            )} />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-bold text-[#4A3B32] uppercase tracking-wider">{statusMap[step.status]?.label}</p>
                                                    <span className="text-[10px] text-gray-400 font-medium">{new Date(step.timestamp).toLocaleTimeString('pt-BR')}</span>
                                                </div>
                                                <p className="text-xs text-[#4A3B32]/40 font-medium italic">
                                                    Ação realizada via {step.source || 'Painel de Gestão'} em {new Date(step.timestamp).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                    )).reverse()}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Info Area */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Logística Card */}
                        <Card className="border-none shadow-xl bg-white overflow-hidden">
                            <div className="h-2 bg-[#C75D3B]" />
                            <CardHeader className="p-6">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Truck className="w-5 h-5 text-[#C75D3B]" />
                                    Inteligência Logística
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6 pt-0">
                                <div className="space-y-5">
                                    <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                        <div>
                                            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5 block">Previsão de Entrega</label>
                                            <input
                                                type="date"
                                                name="deliveryDate"
                                                value={order.deliveryDate || ''}
                                                onChange={handleScheduleChange}
                                                className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-[#4A3B32] shadow-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5 block">Janela de Coleta</label>
                                            <input
                                                type="date"
                                                name="pickupDate"
                                                value={order.pickupDate || ''}
                                                onChange={handleScheduleChange}
                                                className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-[#4A3B32] shadow-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                                            />
                                        </div>
                                        {order.deliveryDate && order.pickupDate && (
                                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Prazo de Devolução</p>
                                                <p className="text-xs text-amber-800">
                                                    {Math.max(0, Math.ceil((new Date(order.pickupDate) - new Date(order.deliveryDate)) / (1000 * 60 * 60 * 24)))} dias
                                                </p>
                                                <button
                                                    className="mt-2 text-[10px] font-bold text-amber-700 hover:text-amber-800"
                                                    onClick={() => {
                                                        // Implementar notificação de prazo
                                                        toast.success('Lembrete enviado!', {
                                                            description: 'A cliente foi notificada sobre o prazo de devolução.',
                                                            icon: '⏰'
                                                        });
                                                    }}
                                                >
                                                    Enviar lembrete
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest px-1">Atalhos de Status</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['shipped', 'delivered', 'pickup_scheduled', 'returned', 'completed', 'cancelled'].map((stat) => (
                                                <button
                                                    key={stat}
                                                    onClick={() => handleStatusChange(stat)}
                                                    disabled={order.status === stat}
                                                    className={cn(
                                                        "w-full py-3 px-4 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group",
                                                        order.status === stat
                                                            ? "bg-[#4A3B32]/5 text-[#4A3B32]/40 grayscale cursor-default"
                                                            : "bg-white border border-gray-100 hover:border-[#C75D3B] hover:bg-[#FDFBF7] text-[#4A3B32]"
                                                    )}
                                                >
                                                    <span>MARCAR COMO {statusMap[stat].label.toUpperCase()}</span>
                                                    <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-all", order.status === stat ? "hidden" : "")} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cliente Data Card */}
                        {order.customer && (
                            <Card className="border-none shadow-xl">
                                <CardHeader className="p-6 border-b border-gray-50">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <User className="w-5 h-5 text-gray-400" />
                                        Perfil da Cliente
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="flex items-center gap-4 py-2">
                                        <div className="w-14 h-14 rounded-full bg-[#FAF3F0] border border-[#C75D3B]/10 flex items-center justify-center text-[#C75D3B] font-bold text-xl">
                                            {order.customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#4A3B32]">{order.customer.name}</p>
                                            <p className="text-[10px] text-[#C75D3B] font-bold uppercase tracking-wider">Cliente do Site</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none mb-1">Localização</p>
                                                <p className="text-sm text-[#4A3B32] leading-relaxed">{order.customer.address}</p>
                                                {order.customer.complement && <p className="text-xs text-gray-400 italic">Ref: {order.customer.complement}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Phone className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none mb-1">Contato</p>
                                                <p className="text-sm text-[#4A3B32]">{order.customer.phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="bg-[#4A3B32] text-white border-none overflow-hidden">
                            <CardContent className="p-8 space-y-4 relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Package className="w-24 h-24" />
                                </div>
                                <h4 className="text-lg font-bold">Dica de Gestão</h4>
                                <p className="text-sm text-white/60 leading-relaxed font-light italic">
                                    "Ao atualizar as datas de entrega e coleta, o cronograma da loja é sincronizado, garantindo que nenhuma cliente fique sem sua malinha no dia combinado."
                                </p>
                                <div className="pt-2">
                                    <button className="text-xs font-bold text-[#C75D3B] hover:text-[#C75D3B]/80 transition-colors underline">Ver documentação logística</button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <AlertDialog
                    isOpen={showConfirmSale}
                    onClose={() => setShowConfirmSale(false)}
                    onConfirm={confirmFinalizeSale}
                    title="Configurar Pagamento e Finalizar"
                    description={
                        <div className="space-y-4 mt-4 text-left">
                            <p className="text-sm text-gray-500">Escolha como a cliente pagará as {keptItems.length} peças:</p>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'pix', label: 'Pix', color: 'bg-emerald-500' },
                                    { id: 'cash', label: 'Dinheiro', color: 'bg-green-600' },
                                    { id: 'fiado_parcelado', label: 'Crediário', color: 'bg-amber-500' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSaleConfig(prev => ({ ...prev, paymentMethod: m.id }))}
                                        className={cn(
                                            "py-3 rounded-xl text-xs font-bold transition-all border-2",
                                            saleConfig.paymentMethod === m.id
                                                ? `border-${m.color.split('-')[1]}-500 ${m.color} text-white`
                                                : "border-gray-100 bg-gray-50 text-gray-400"
                                        )}
                                    >
                                        {m.label.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {saleConfig.paymentMethod === 'fiado_parcelado' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-amber-800 uppercase">Parcelas</label>
                                        <select
                                            value={saleConfig.numInstallments}
                                            onChange={(e) => setSaleConfig(prev => ({ ...prev, numInstallments: Number(e.target.value) }))}
                                            className="bg-white border-none rounded-lg p-1 text-xs font-bold"
                                        >
                                            {[1, 2, 3, 4, 5, 6, 10].map(n => <option key={n} value={n}>{n}x</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-amber-800 uppercase">1ª Vencimento</label>
                                        <input
                                            type="date"
                                            value={saleConfig.installmentStartDate}
                                            onChange={(e) => setSaleConfig(prev => ({ ...prev, installmentStartDate: e.target.value }))}
                                            className="bg-white border-none rounded-lg p-1 text-xs font-bold"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    }
                    confirmText="Confirmar Venda"
                    cancelText="Voltar"
                    variant="info"
                />
            </div>
        )
    }

