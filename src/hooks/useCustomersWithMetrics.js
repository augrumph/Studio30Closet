/**
 * ============================================================================
 * React Query Hook: useCustomersWithMetrics
 * ============================================================================
 *
 * CRITICAL: Uses server-side calculated metrics (LTV, total_orders, etc.)
 * NO MORE frontend calculations with paginated data!
 *
 * Benefits:
 * - ✅ Accurate LTV (ALL sales counted, not just paginated)
 * - ✅ Auto caching & invalidation
 * - ✅ Loading states handled
 * - ✅ Error handling built-in
 * - ✅ Optimistic updates support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatUserFriendlyError } from '@/lib/errorHandler'
import { getCustomersWithMetrics, deleteCustomer, createCustomer, updateCustomer } from '@/lib/api/customers'
import { toast } from 'sonner'

// Query Keys
export const customersQueryKeys = {
    all: ['customers'],
    withMetrics: (page, searchTerm, segment) => ['customers', 'with-metrics', { page, searchTerm, segment }],
}

/**
 * Hook to fetch customers with pre-calculated metrics
 */
export function useCustomersWithMetrics({ page = 1, limit = 50, searchTerm = null, segment = 'all' } = {}) {
    return useQuery({
        queryKey: customersQueryKeys.withMetrics(page, searchTerm, segment),
        queryFn: () => getCustomersWithMetrics(page, limit, searchTerm, segment),
        staleTime: 1000 * 60 * 2, // 2 minutes (customers change less frequently)
        keepPreviousData: true, // Smooth pagination
    })
}

/**
 * Hook to delete a customer
 */
export function useDeleteCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (customerId) => deleteCustomer(customerId),
        onSuccess: () => {
            // Invalidate all customer queries to refetch
            queryClient.invalidateQueries(customersQueryKeys.all)
            toast.success('Cliente removido com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        },
    })
}

/**
 * Hook to create a customer
 */
export function useCreateCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (customerData) => createCustomer(customerData),
        onSuccess: () => {
            queryClient.invalidateQueries(customersQueryKeys.all)
            toast.success('Cliente criado com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        },
    })
}

/**
 * Hook to update a customer
 */
export function useUpdateCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }) => updateCustomer(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(customersQueryKeys.all)
            toast.success('Cliente atualizado com sucesso!')
        },
        onError: (error) => {
            toast.error(formatUserFriendlyError(error))
        },
    })
}
