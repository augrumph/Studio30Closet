import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { apiClient } from '@/lib/api-client'
import { formatUserFriendlyError } from '@/lib/errorHandler'

export function ReturnsList() {
    const [returns, setReturns] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchReturns = async () => {
            try {
                const data = await apiClient('/returns')
                setReturns(data.items || [])
            } catch (err) {
                setError(formatUserFriendlyError(err))
            } finally {
                setLoading(false)
            }
        }
        fetchReturns()
    }, [])

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <RefreshCw className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-display font-bold text-[#4A3B32] tracking-tight">Trocas & Devoluções</h2>
                    </div>
                    <p className="text-[#4A3B32]/60 font-medium">Histórico de devoluções e geração de crédito (Haver).</p>
                </div>

                <Link
                    to="/admin/returns/new"
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-br from-indigo-500 to-purple-600 hover:opacity-90 text-white rounded-2xl font-bold shadow-xl transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Nova Devolução
                </Link>
            </div>

            <Card className="border-none shadow-xl">
                <CardHeader className="bg-white border-b border-gray-50 p-6">
                    <CardTitle>Histórico de Devoluções</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">Carregando...</div>
                    ) : error ? (
                        <div className="p-12 text-center text-red-500 flex flex-col items-center gap-2">
                            <AlertTriangle className="w-8 h-8" />
                            <p>{error}</p>
                        </div>
                    ) : returns.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                            <Search className="w-12 h-12 text-gray-200" />
                            <p>Nenhuma devolução registrada.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4 text-right">Valor do Crédito</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {returns.map(ret => (
                                        <tr key={ret.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {new Date(ret.createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                                {ret.customerName || 'Desconhecido'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                                                    {ret.returnType === 'credit' ? 'Haver / Crédito' : 'Estorno'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                                                R$ {(parseFloat(ret.totalValue) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
