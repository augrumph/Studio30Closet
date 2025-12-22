import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Percent, Trash2, Edit2, Ticket, CheckCircle2, XCircle } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { AlertDialog } from '@/components/ui/AlertDialog'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function CouponsList() {
    const { coupons, couponsLoading, loadCoupons, removeCoupon, editCoupon } = useAdminStore()
    const [search, setSearch] = useState('')
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, couponId: null, couponCode: '' })

    useEffect(() => {
        loadCoupons()
    }, [loadCoupons])

    const filteredCoupons = coupons.filter(coupon =>
        coupon.code.toLowerCase().includes(search.toLowerCase())
    )

    const handleDelete = (id, code) => {
        setConfirmDelete({ isOpen: true, couponId: id, couponCode: code })
    }

    const onConfirmDelete = async () => {
        const result = await removeCoupon(confirmDelete.couponId)
        if (result.success) {
            toast.success('Cupom excluído com sucesso.')
        } else {
            toast.error(`Erro ao excluir: ${result.error}`)
        }
    }

    const toggleStatus = async (coupon) => {
        const result = await editCoupon(coupon.id, { isActive: !coupon.isActive })
        if (result.success) {
            toast.success(`Cupom ${coupon.isActive ? 'desativado' : 'ativado'} com sucesso.`)
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Descontos & Cupons</h2>
                    <p className="text-[#4A3B32]/40 font-medium">Gerencie campanhas e códigos promocionais.</p>
                </div>

                <Link
                    to="/admin/coupons/new"
                    className="flex items-center gap-2 px-6 py-3 bg-[#4A3B32] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#4A3B32]/10 hover:scale-105 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Novo Cupom
                </Link>
            </div>

            {/* Stats Overview (Simulado) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FDFBF7] flex items-center justify-center">
                            <Ticket className="w-6 h-6 text-[#C75D3B]" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cupons Ativos</p>
                            <p className="text-2xl font-display font-bold text-[#4A3B32]">{coupons.filter(c => c.isActive).length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FDFBF7] flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total de Usos</p>
                            <p className="text-2xl font-display font-bold text-[#4A3B32]">
                                {coupons.reduce((acc, curr) => acc + (curr.usageCount || 0), 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-none shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FDFBF7] flex items-center justify-center">
                            <Percent className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Economia Gerada</p>
                            <p className="text-2xl font-display font-bold text-[#4A3B32]">R$ 0,00</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Card */}
            <Card className="overflow-hidden border-none shadow-2xl shadow-gray-100">
                <div className="p-6 border-b border-gray-50 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar por código do cupom..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#C75D3B]/20 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">CÓDIGO</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">DESCONTO</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">STATUS</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">USOS</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            <AnimatePresence>
                                {couponsLoading ? (
                                    <tr><td colSpan="5" className="py-24 text-center text-gray-300 italic">Sincronizando cupons...</td></tr>
                                ) : filteredCoupons.length > 0 ? (
                                    filteredCoupons.map((coupon, idx) => (
                                        <motion.tr
                                            key={coupon.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-[#FDFBF7]/40 transition-colors group"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#4A3B32]/5 flex items-center justify-center">
                                                        <Ticket className="w-5 h-5 text-[#4A3B32]/40" />
                                                    </div>
                                                    <span className="text-sm font-bold text-[#4A3B32] uppercase tracking-wider">{coupon.code}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-sm font-bold text-[#C75D3B]">
                                                    {coupon.type === 'percent' ? `${coupon.value}%` : `R$ ${coupon.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <button
                                                    onClick={() => toggleStatus(coupon)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                                                        coupon.isActive
                                                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                                                            : "bg-red-50 text-red-400 hover:bg-red-100"
                                                    )}
                                                >
                                                    {coupon.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    {coupon.isActive ? 'Ativo' : 'Pausado'}
                                                </button>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-sm font-bold text-[#4A3B32]/60">
                                                    {coupon.usageCount || 0}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center space-x-2">
                                                <Link
                                                    to={`/admin/coupons/${coupon.id}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl text-[10px] font-bold text-[#4A3B32] hover:bg-[#4A3B32] hover:text-white transition-all shadow-sm active:scale-95"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    EDITAR
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(coupon.id, coupon.code)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-100 rounded-2xl text-[10px] font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="py-24 text-center text-gray-300 italic">Nenhum cupom cadastrado.</td></tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </Card>

            <AlertDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
                onConfirm={onConfirmDelete}
                title="Excluir Cupom?"
                description={`Tem certeza que deseja excluir o cupom "${confirmDelete.couponCode}"? Esta ação não pode ser desfeita.`}
                confirmText="Excluir Cupom"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
