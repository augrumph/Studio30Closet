import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOpenInstallmentSales, getInstallmentsByVendaId, registerInstallmentPayment } from '@/lib/api/installments'
import { toast } from 'sonner'

/**
 * Hook to fetch sales with open installments (crediário)
 */
export function useAdminInstallmentSales(page = 1, limit = 50) {
    const query = useQuery({
        queryKey: ['admin', 'installment-sales', { page, limit }],
        queryFn: () => getOpenInstallmentSales(page, limit),
        staleTime: 0, // ✅ Sempre buscar dados frescos após invalidação
        keepPreviousData: true
    })

    return {
        data: query.data, // { vendas, total, page, limit }
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}

/**
 * Hook to fetch installments for a specific sale (details)
 */
export function useAdminInstallmentDetails(vendaId) {
    return useQuery({
        queryKey: ['admin', 'installments', vendaId],
        queryFn: () => getInstallmentsByVendaId(vendaId),
        enabled: !!vendaId,
        staleTime: 0 // ✅ Sempre buscar dados frescos após invalidação
    })
}

/**
 * Hook for Installment mutations (Payments)
 */
export function useAdminInstallmentsMutations() {
    const queryClient = useQueryClient()

    const registerPaymentMutation = useMutation({
        mutationFn: ({ installmentId, amount, date, method }) =>
            registerInstallmentPayment(installmentId, amount, date, method),
        onSuccess: async (data, variables) => {
            // ✅ Invalidar e forçar refetch imediato de TODAS as queries relacionadas
            await queryClient.invalidateQueries({
                queryKey: ['admin', 'installment-sales'],
                refetchType: 'active' // Força refetch de queries ativas
            })
            await queryClient.invalidateQueries({
                queryKey: ['admin', 'installments'],
                refetchType: 'active' // Força refetch de queries ativas
            })

            toast.success('Pagamento registrado com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao registrar pagamento: ${error.message}`)
        }
    })

    return {
        registerPayment: registerPaymentMutation.mutateAsync,
        isRegistering: registerPaymentMutation.isPending
    }
}
