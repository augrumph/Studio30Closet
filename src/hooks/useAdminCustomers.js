import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomersWithMetrics, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '@/lib/api/customers'
import { useState, useEffect } from 'react'


// Custom hook simples de debounce se não tiver biblioteca instalada
function useDebounceValue(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)
        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])
    return debouncedValue
}

export function useCustomerSearch(searchTerm = '') {
    const debouncedSearchTerm = useDebounceValue(searchTerm, 300)

    const query = useQuery({
        queryKey: ['admin', 'customers', 'search', debouncedSearchTerm],
        queryFn: () => getCustomersWithMetrics(1, 10, debouncedSearchTerm), // Busca paginada limpa
        enabled: debouncedSearchTerm.length > 2 || debouncedSearchTerm.length === 0, // Só busca se tiver 3 chars ou vazio (inicial)
        staleTime: 1000 * 60 * 5,
        placeholderData: (previousData) => previousData
    })

    return {
        customers: query.data?.customers || [],
        isLoading: query.isLoading,
        isFetching: query.isFetching
    }
}

export function useAdminCustomer(id) {
    return useQuery({
        queryKey: ['admin', 'customer', id],
        queryFn: () => getCustomerById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 30 // 30 min cache
    })

}

export function useAdminCustomers(page = 1, limit = 50, searchTerm = '', segmentFilter = 'all') {
    const query = useQuery({
        queryKey: ['admin', 'customers', { page, limit, searchTerm, segmentFilter }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: limit.toString(),
                search: searchTerm,
                segment: segmentFilter
            })

            const response = await fetch(`/api/customers?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar clientes do backend')
            return response.json()
        },
        staleTime: 1000 * 60 * 5, // 5 min
    })

    return {
        customers: query.data?.customers || [],
        total: query.data?.total || 0,
        totalPages: query.data?.totalPages || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}

export function useAdminCustomersMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateCustomer(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'customer', variables.id] })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
        }
    })

    return {
        createCustomer: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateCustomer: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deleteCustomer: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
