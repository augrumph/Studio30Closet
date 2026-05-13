import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { CustomerSelect } from '@/components/admin/vendas/CustomerSelect'
import { ProductSelect } from '@/components/admin/vendas/ProductSelect'

export function ReturnsForm() {
    const navigate = useNavigate()
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        customerId: '',
        notes: '',
        returnType: 'credit'
    })
    const [items, setItems] = useState([])
    const location = useLocation()

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const cid = params.get('customerId')
        const sid = params.get('saleId')

        if (cid) {
            setFormData(prev => ({ ...prev, customerId: cid }))
        }

        if (sid) {
            // Se houver saleId, podemos buscar os itens da venda original
            const fetchOriginalSale = async () => {
                try {
                    const venda = await apiClient(`/vendas/${sid}`)
                    if (venda && Array.isArray(venda.items)) {
                        setItems(venda.items.map(item => ({
                            productId: item.productId,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            condition: 'new',
                            selectedColor: item.selectedColor,
                            selectedSize: item.selectedSize
                        })))
                        setFormData(prev => ({ ...prev, notes: `Troca referente à venda #${sid}` }))
                    }
                } catch (err) {
                    console.error('Erro ao buscar venda original:', err)
                }
            }
            fetchOriginalSale()
        }
    }, [location.search])

    const addItem = (product) => {
        if (!product) return
        setItems(prev => [...prev, {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            condition: 'new', // or 'defective'
            selectedColor: product.color || 'Padrão',
            selectedSize: product.sizes?.[0] || 'Único'
        }])
    }

    const removeItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const updateItem = (index, field, value) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
    }

    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.customerId) return toast.error('Selecione um cliente')
        if (items.length === 0) return toast.error('Adicione pelo menos um item')

        setIsSaving(true)
        try {
            await apiClient('/returns', {
                method: 'POST',
                body: {
                    ...formData,
                    items
                }
            })
            toast.success('Devolução registrada com sucesso!')
            navigate('/admin/returns')
        } catch (err) {
            toast.error(err.message || 'Erro ao registrar devolução')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/returns')}
                    className="p-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Nova Devolução</h2>
                    <p className="text-gray-500 text-sm">Gere crédito (Haver) para o cliente trocar peças.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Dados do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Cliente que receberá o crédito</label>
                            <CustomerSelect 
                                value={formData.customerId}
                                onChange={(val) => setFormData(p => ({ ...p, customerId: val }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Devolução</label>
                            <select 
                                className="w-full p-3 border border-gray-200 rounded-xl"
                                value={formData.returnType}
                                onChange={(e) => setFormData(p => ({ ...p, returnType: e.target.value }))}
                            >
                                <option value="credit">Gerar Crédito (Haver na loja)</option>
                                <option value="refund">Estorno (Dinheiro devolvido)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Motivo / Notas</label>
                            <textarea 
                                className="w-full p-3 border border-gray-200 rounded-xl"
                                value={formData.notes}
                                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Motivo da devolução..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Itens Devolvidos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ProductSelect onSelect={addItem} />

                        {items.length > 0 && (
                            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-3">Produto</th>
                                            <th className="p-3">Qtd</th>
                                            <th className="p-3">Estado</th>
                                            <th className="p-3 text-right">Valor Unit.</th>
                                            <th className="p-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3 font-medium">{item.name}</td>
                                                <td className="p-3">
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                                        className="w-16 p-2 border rounded-lg"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select 
                                                        value={item.condition}
                                                        onChange={(e) => updateItem(idx, 'condition', e.target.value)}
                                                        className="p-2 border rounded-lg text-xs"
                                                    >
                                                        <option value="new">Bom estado (Volta pro estoque)</option>
                                                        <option value="defective">Com defeito (Não volta)</option>
                                                    </select>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.price}
                                                        onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                                                        className="w-24 p-2 border rounded-lg text-right"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="pt-4 flex justify-end">
                            <div className="text-right">
                                <p className="text-gray-500 text-sm">Total de Crédito a Gerar</p>
                                <p className="text-3xl font-black text-indigo-600">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving || items.length === 0}
                        className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'Salvando...' : 'Confirmar Devolução'}
                    </button>
                </div>
            </form>
        </div>
    )
}
