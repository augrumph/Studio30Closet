import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Building2, Phone, Mail, MapPin, FileText } from 'lucide-react'
import { useAdminSupplier, useAdminSuppliersMutations } from '@/hooks/useAdminSuppliers'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function SuppliersForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = Boolean(id)

    // Hooks
    const { createSupplier, updateSupplier, isCreating, isUpdating } = useAdminSuppliersMutations()
    const { data: supplierData, isLoading } = useAdminSupplier(id ? parseInt(id) : null)
    const isLoadingAction = isCreating || isUpdating

    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        contactPerson: '',
        notes: ''
    })

    useEffect(() => {
        if (isEdit && supplierData) {
            setFormData(supplierData)
        }
    }, [isEdit, supplierData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const action = isEdit ? updateSupplier({ id: parseInt(id), data: formData }) : createSupplier(formData)

        toast.promise(action, {
            loading: isEdit ? 'Salvando alterações...' : 'Cadastrando fornecedor...',
            success: () => {
                navigate('/admin/suppliers')
                return isEdit ? 'Fornecedor atualizado com sucesso!' : 'Fornecedor cadastrado com sucesso!'
            },
            error: (err) => `Erro: ${err.message}`
        })
    }

    const brazilStates = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
        'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/admin/suppliers')}
                        className="p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-6 h-6 text-[#4A3B32]" />
                    </motion.button>
                    <div>
                        <h2 className="text-4xl font-display font-semibold text-[#4A3B32] tracking-tight">
                            {id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                        </h2>
                        <p className="text-[#4A3B32]/40 font-medium italic">Gestão de fornecedores Studio 30.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* Informações Principais */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-[#C75D3B]" />
                                Informações do Fornecedor
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                    Nome/Razão Social *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="Ex: Confecções Primavera LTDA"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium transition-all"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        CNPJ
                                    </label>
                                    <input
                                        type="text"
                                        name="cnpj"
                                        placeholder="00.000.000/0000-00"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                        value={formData.cnpj}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Pessoa de Contato
                                    </label>
                                    <input
                                        type="text"
                                        name="contactPerson"
                                        placeholder="Ex: Maria Silva"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                        value={formData.contactPerson}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contato */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Phone className="w-5 h-5 text-[#C75D3B]" />
                                Informações de Contato
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Telefone
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="(00) 00000-0000"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        E-mail
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="contato@fornecedor.com.br"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Endereço */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[#C75D3B]" />
                                Endereço
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                    Endereço Completo
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    placeholder="Rua, Número, Bairro"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                    value={formData.address}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2 md:col-span-1">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Cidade
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        placeholder="São Paulo"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                        value={formData.city}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        Estado
                                    </label>
                                    <select
                                        name="state"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium appearance-none"
                                        value={formData.state}
                                        onChange={handleChange}
                                    >
                                        <option value="">Selecione</option>
                                        {brazilStates.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-1">
                                        CEP
                                    </label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        placeholder="00000-000"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-lg font-medium"
                                        value={formData.zipCode}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Observações */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#C75D3B]" />
                                Observações
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                name="notes"
                                rows="8"
                                placeholder="Adicione informações importantes sobre este fornecedor..."
                                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none text-sm font-medium leading-relaxed transition-all resize-none"
                                value={formData.notes}
                                onChange={handleChange}
                            />
                        </CardContent>
                    </Card>

                    {/* Submit Actions */}
                    <div className="sticky top-8 space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoadingAction}
                            className="w-full flex items-center justify-center gap-3 py-6 bg-[#4A3B32] text-white rounded-3xl font-bold shadow-2xl shadow-[#4A3B32]/30 hover:bg-[#342922] transition-all disabled:opacity-50"
                        >
                            <Save className="w-6 h-6" />
                            {id ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                        </motion.button>
                        <button
                            type="button"
                            onClick={() => navigate('/admin/suppliers')}
                            className="w-full py-4 text-[#4A3B32]/40 font-bold tracking-widest uppercase text-[10px] hover:text-[#4A3B32] transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
