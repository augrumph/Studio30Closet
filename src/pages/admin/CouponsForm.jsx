import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Ticket, Percent, Calendar, DollarSign, Info } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function CouponsForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getCouponById, addCoupon, editCoupon, couponsLoading } = useAdminStore()

    const [formData, setFormData] = useState({
        code: '',
        type: 'percent', // 'percent' ou 'fixed'
        value: '',
        minPurchase: '',
        expiryDate: '',
        isActive: true,
        description: ''
    })

    useEffect(() => {
        if (id) {
            const coupon = getCouponById(id)
            if (coupon) {
                setFormData({
                    ...coupon,
                    value: coupon.value.toString(),
                    minPurchase: coupon.minPurchase ? coupon.minPurchase.toString() : '',
                    expiryDate: coupon.expiryDate || ''
                })
            }
        }
    }, [id, getCouponById])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const parseBrazilianNumber = (val) => {
            if (!val) return null
            const normalized = val.toString().replace(',', '.')
            return parseFloat(normalized)
        }

        const payload = {
            ...formData,
            code: formData.code.toUpperCase().trim(),
            value: parseBrazilianNumber(formData.value) || 0,
            minPurchase: parseBrazilianNumber(formData.minPurchase),
        }

        toast.promise(id ? editCoupon(id, payload) : addCoupon(payload), {
            loading: id ? 'Salvando cupom...' : 'Criando cupom...',
            success: (result) => {
                if (result.success) {
                    navigate('/admin/coupons')
                    return id ? 'Cupom atualizado com sucesso!' : 'Cupom criado com sucesso!'
                }
                throw new Error(result.error)
            },
            error: (err) => `Erro: ${err.message}`
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/admin/coupons')}
                        className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-6 h-6 text-[#4A3B32]" />
                    </motion.button>
                    <div>
                        <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">
                            {id ? 'Editar Cupom' : 'Novo Cupom'}
                        </h2>
                        <p className="text-[#4A3B32]/40 font-medium italic">Configure regras de desconto e exclusividade.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid md:grid-cols-12 gap-8">
                <div className="md:col-span-8 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-xs font-bold text-[#4A3B32]/40">
                                <Ticket className="w-4 h-4" /> Detalhes do Cupom
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Código do Cupom</label>
                                <input
                                    type="text"
                                    name="code"
                                    required
                                    placeholder="EX: STUDIO30OFF"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-xl font-black text-[#4A3B32] tracking-widest transition-all placeholder:text-gray-200"
                                    value={formData.code}
                                    onChange={handleChange}
                                />
                                <p className="text-[10px] text-gray-400 pl-1 italic">Este é o código que a cliente digitará no checkout.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Tipo de Desconto</label>
                                    <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, type: 'percent' }))}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                                                formData.type === 'percent' ? "bg-white text-[#C75D3B] shadow-sm" : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            <Percent className="w-4 h-4" /> Porcentagem
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, type: 'fixed' }))}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all",
                                                formData.type === 'fixed' ? "bg-white text-[#C75D3B] shadow-sm" : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            <DollarSign className="w-4 h-4" /> Valor Fixo
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        {formData.type === 'percent' ? 'Desconto (%)' : 'Valor (R$)'}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        name="value"
                                        required
                                        placeholder="0,00"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-bold text-[#4A3B32]"
                                        value={formData.value}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Descrição Interna</label>
                                <textarea
                                    name="description"
                                    rows="3"
                                    placeholder="Ex: Campanha de lançamento da coleção outono..."
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium leading-relaxed transition-all"
                                    value={formData.description}
                                    onChange={handleChange}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-4 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Configurações</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Mínimo de Compra (Opcional)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        name="minPurchase"
                                        placeholder="0,00"
                                        className="w-full pl-10 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-bold text-[#4A3B32]"
                                        value={formData.minPurchase}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">Data de Expiração</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        type="date"
                                        name="expiryDate"
                                        className="w-full pl-10 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-bold text-[#4A3B32]"
                                        value={formData.expiryDate}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-[#FDFBF7] rounded-3xl border border-[#C75D3B]/5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Info className="w-4 h-4 text-[#C75D3B]" />
                                    <span className="text-[10px] font-bold text-[#4A3B32] uppercase">Dica Premium</span>
                                </div>
                                <p className="text-[11px] text-[#4A3B32]/60 leading-relaxed font-medium">
                                    Cupons com nomes curtos e em caixa alta tendem a ter **24% mais conversão** em campanhas via WhatsApp.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="sticky bottom-8 space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={couponsLoading}
                            className="w-full flex items-center justify-center gap-3 py-6 bg-[#4A3B32] text-white rounded-3xl font-bold shadow-2xl shadow-[#4A3B32]/30 hover:bg-[#342922] transition-all disabled:opacity-50"
                        >
                            <Save className="w-6 h-6" />
                            {id ? 'Atualizar Cupom' : 'Ativar Cupom'}
                        </motion.button>
                        <button
                            type="button"
                            onClick={() => navigate('/admin/coupons')}
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
