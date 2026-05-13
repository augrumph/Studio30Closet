import { useState } from 'react'
import { Search, User } from 'lucide-react'
import { useCustomerSearch } from '@/hooks/useAdminCustomers'
import { cn } from '@/lib/utils'

export function CustomerSelect({ value, onChange }) {
    const [searchTerm, setSearchTerm] = useState('')
    const { customers, isFetching } = useCustomerSearch(searchTerm)
    const [isOpen, setIsOpen] = useState(false)

    const selectedCustomer = customers.find(c => c.id === value)

    return (
        <div className="relative">
            <div 
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedCustomer ? selectedCustomer.name : 'Selecionar Cliente'}
                    </p>
                    {selectedCustomer && (
                        <p className="text-xs text-gray-500 truncate">{selectedCustomer.phone || 'Sem telefone'}</p>
                    )}
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                autoFocus
                                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {isFetching && searchTerm.length > 2 && (
                            <div className="p-4 text-center">
                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        )}
                        {!isFetching && customers.length === 0 && (
                            <div className="p-4 text-center text-sm text-gray-500 italic">
                                Nenhum cliente encontrado.
                            </div>
                        )}
                        {customers.map(customer => (
                            <button
                                key={customer.id}
                                type="button"
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 text-left hover:bg-indigo-50 transition-colors",
                                    customer.id === value && "bg-indigo-50"
                                )}
                                onClick={() => {
                                    onChange(customer.id)
                                    setIsOpen(false)
                                    setSearchTerm('')
                                }}
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                    {customer.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
                                    <p className="text-xs text-gray-500">{customer.phone || 'Sem telefone'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
