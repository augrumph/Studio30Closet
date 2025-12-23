import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, User, Phone, Mail, MapPin, Hash, Info } from 'lucide-react'
import { useAdminStore } from '@/store/admin-store'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function CustomersForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { getCustomerById, addCustomer, editCustomer, customersLoading } = useAdminStore()

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        cpf: '',
        addresses: [{
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: 'Santos',
            state: 'SP',
            zipCode: '',
            isDefault: true
        }]
    })

    useEffect(() => {
        if (id) {
            console.log('Form: Loading customer with id:', id);
            const customer = getCustomerById(parseInt(id))
            console.log('Form: Found customer:', customer);
            if (customer) {
                setFormData({
                    ...customer,
                    addresses: customer.addresses || [{
                        street: '',
                        number: '',
                        complement: '',
                        neighborhood: '',
                        city: 'Santos',
                        state: 'SP',
                        zipCode: '',
                        isDefault: true
                    }]
                })
            } else {
                console.warn('Form: Customer not found with id:', id);
                toast.error('Cliente não encontrado')
                navigate('/admin/customers')
            }
        }
    }, [id, getCustomerById, navigate])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleAddressChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => {
            const newAddresses = [...prev.addresses]
            newAddresses[0] = { ...newAddresses[0], [name]: value }
            return { ...prev, addresses: newAddresses }
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        console.log('Form: Submitting customer form with id:', id, 'and data:', formData);

        const action = id ? editCustomer(parseInt(id), formData) : addCustomer(formData)

        toast.promise(action, {
            loading: id ? 'Atualizando cliente...' : 'Cadastrando cliente...',
            success: (result) => {
                console.log('Form: Customer operation successful:', result);
                if (result.success) {
                    navigate('/admin/customers')
                    return id ? 'Dados do cliente atualizados!' : 'Cliente cadastrado com sucesso!'
                }
                throw new Error(result.error)
            },
            error: (err) => {
                console.error('Form: Customer operation failed:', err);
                return `Erro: ${err.message}`
            }
        })
    }

    const address = formData.addresses[0]

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header with Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/admin/customers')}
                        className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-[#4A3B32]" />
                    </motion.button>
                    <div>
                        <h2 className="text-3xl font-display font-semibold text-[#4A3B32] tracking-tight">
                            {id ? 'Editar Cliente' : 'Novo Cliente'}
                        </h2>
                        <p className="text-sm text-[#4A3B32]/40 font-medium">
                            {id ? 'Atualize as informações de contato e endereço.' : 'Registre uma nova cliente na base do Studio 30.'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* Informações Básicas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5 text-[#C75D3B]" />
                                Dados Pessoais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">Nome Completo</label>
                                <input
                                    required
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Ex: Maria Oliveira"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">WhatsApp / Telefone</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        required
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="(13) 99999-9999"
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">CPF (Opcional)</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        name="cpf"
                                        value={formData.cpf || ''}
                                        onChange={handleChange}
                                        placeholder="000.000.000-00"
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="cliente@email.com"
                                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Endereço Principal */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[#C75D3B]" />
                                Endereço de Entrega
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-6 gap-6">
                            <div className="md:col-span-4">
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">Logradouro / Rua</label>
                                <input
                                    required
                                    type="text"
                                    name="street"
                                    value={address.street}
                                    onChange={handleAddressChange}
                                    placeholder="Av. Ana Costa"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">Número</label>
                                <input
                                    required
                                    type="text"
                                    name="number"
                                    value={address.number}
                                    onChange={handleAddressChange}
                                    placeholder="123"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">Bairro</label>
                                <input
                                    required
                                    type="text"
                                    name="neighborhood"
                                    value={address.neighborhood}
                                    onChange={handleAddressChange}
                                    placeholder="Gonzaga"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">Complemento</label>
                                <input
                                    type="text"
                                    name="complement"
                                    value={address.complement}
                                    onChange={handleAddressChange}
                                    placeholder="Apto 42"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">Cidade</label>
                                <input
                                    required
                                    type="text"
                                    name="city"
                                    value={address.city}
                                    onChange={handleAddressChange}
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-xs text-[#4A3B32]/40 uppercase font-bold tracking-widest mb-2 block">CEP</label>
                                <input
                                    required
                                    type="text"
                                    name="zipCode"
                                    value={address.zipCode}
                                    onChange={handleAddressChange}
                                    placeholder="11000-000"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C75D3B]/20 outline-none font-medium transition-all"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Action Card */}
                    <Card className="bg-[#4A3B32] border-none shadow-2xl sticky top-8">
                        <CardHeader>
                            <CardTitle className="text-white">Ações</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={customersLoading}
                                className="w-full flex items-center justify-center gap-3 py-5 bg-[#C75D3B] text-white rounded-2xl font-bold shadow-xl shadow-[#C75D3B]/20 hover:bg-[#A64D31] transition-all"
                            >
                                <Save className="w-6 h-6" />
                                {id ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                            </motion.button>

                            <button
                                type="button"
                                onClick={() => navigate('/admin/customers')}
                                className="w-full py-4 border-2 border-white/10 text-white/60 hover:text-white hover:border-white/20 rounded-2xl font-bold transition-all"
                            >
                                Cancelar
                            </button>
                        </CardContent>
                    </Card>

                    {/* Dica */}
                    <Card className="bg-[#FDF0ED] border-none">
                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                <Info className="w-5 h-5 text-[#C75D3B] shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs text-[#C75D3B] font-bold uppercase tracking-wider">CRM Inteligente</p>
                                    <p className="text-sm text-[#4A3B32]/60 italic font-medium leading-relaxed">
                                        Manter o endereço atualizado garante que o cálculo de frete e prazos de entrega nas malinhas futuras seja preciso.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    )
}
