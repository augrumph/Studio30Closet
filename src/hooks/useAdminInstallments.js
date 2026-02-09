import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOpenInstallmentSales, getInstallmentsByVendaId, registerInstallmentPayment, payFullVendaWithInstallments } from '@/lib/api/installments'
import { updateVenda } from '@/lib/api/vendas'
import { toast } from 'sonner'
import { formatUserFriendlyError } from '@/lib/errorHandler'

/**
 * Hook to fetch sales with open installments (crediário) - BFF Paginated
 */
export function useAdminInstallmentSales({ page = 1, pageSize = 20, status = 'pendentes' } = {}) {
    const query = useQuery({
        queryKey: ['admin', 'installment-sales', { page, pageSize, status }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                status
            })
            const response = await fetch(`/api/installments?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar crediário do backend')
            return response.json()
        },
        staleTime: 1000 * 60 * 2, // 2 min
        keepPreviousData: true
    })

    return {
        vendas: query.data?.items || [],
        total: query.data?.total || 0,
        totalPages: query.data?.totalPages || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}

/**
 * Hook to fetch installments metrics (BFF)
 */
export function useAdminInstallmentsMetrics({ status = 'pendentes' } = {}) {
    const query = useQuery({
        queryKey: ['admin', 'installments', 'metrics', { status }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({ status })
            const response = await fetch(`/api/installments/metrics?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar métricas')
            return response.json()
        },
        staleTime: 1000 * 60 * 5
    })

    return {
        metrics: query.data || { count: 0, totalDueEstimative: 0, totalOverdueEstimative: 0 },
        isLoading: query.isLoading
    }
}

/**
 * Hook to fetch installments for a specific sale (details) - BFF
 */
export function useAdminInstallmentDetails(vendaId) {
    return useQuery({
        queryKey: ['admin', 'installments', vendaId],
        queryFn: async () => {
            const response = await fetch(`/api/installments/${vendaId}/details`)
            if (!response.ok) throw new Error('Falha ao buscar detalhes do parcelamento')
            return response.json()
        },
        enabled: !!vendaId,
        staleTime: 0 // Always fresh
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

        // ⚡ OPTIMISTIC UPDATE
        onMutate: async (newPayment) => {
            // 1. Cancelar queries em andamento para não sobrescrever nosso update otimista
            await queryClient.cancelQueries({ queryKey: ['admin', 'installments'] })
            await queryClient.cancelQueries({ queryKey: ['admin', 'installment-sales'] })

            // 2. Snapshot do estado anterior (para rollback em caso de erro)
            // Precisamos encontrar a vendaId dona deste installmentId... 
            // Como não temos a vendaId fácil aqui, vamos invalidar InstallmentSales mas tentar otimizar a lista de Detalhes se possível.
            // Para simplicidade e segurança, vamos focar a otimização na lista de detalhes se soubermos a vendaId, 
            // mas aqui só recebemos o installmentId.
            // PERA: Se não temos vendaId, é difícil atualizar o cache específico de detalhes ['admin', 'installments', vendaId].
            // Vamos assumir que quem chama passa a vendaId ou vamos iterar o cache? 
            // Iterar o cache é arriscado.

            // MELHOR ABORDAGEM AGORA: Fazer optimistic update genérico ou aceitar limitation?
            // Vou atualizar o hook para aceitar vendaId como argumento opcional `mutate({ ..., vendaId })` para facilitar o cache update.

            return {}
        },
        // NA VERDADE, vamos simplificar para não quebrar a lógica sem vendaId.
        // Se a gente não tem vendaId, optimistic update de lista aninhada é complexo.
        // Vou manter o invalidate agressivo mas adicionar onSuccess rápido para feedback visual local se possível,
        // mas aqui é hook de dados. 

        // VAMOS REFORMULAR:
        // Vou alterar a assinatura do mutate para receber vendaId se disponível, permitindo o update otimista.
        onMutate: async ({ installmentId, amount, vendaId }) => {
            if (!vendaId) return null // Sem vendaId, não tentamos update otimista complexo

            // Cancelar refetches daquela venda
            await queryClient.cancelQueries({ queryKey: ['admin', 'installments', vendaId] })

            // Snapshot
            const previousInstallments = queryClient.getQueryData(['admin', 'installments', vendaId])

            // Update Otimista
            queryClient.setQueryData(['admin', 'installments', vendaId], (old) => {
                if (!old || !old.installments) return old

                return {
                    ...old,
                    installments: old.installments.map(inst => {
                        if (inst.id === installmentId) {
                            const newPaid = (inst.paidAmount || 0) + amount
                            const newRemaining = Math.max(0, (inst.originalAmount || 0) - newPaid)
                            const newStatus = newRemaining <= 0.01 ? 'paid' : 'partial' // Tolerância de centavos

                            return {
                                ...inst,
                                paidAmount: newPaid,
                                remainingAmount: newRemaining,
                                status: newStatus
                            }
                        }
                        return inst
                    })
                }
            })

            // Snapshot da lista principal
            const previousSales = queryClient.getQueryData(['admin', 'installment-sales'])

            // Update Otimista da Lista Principal
            queryClient.setQueryData(['admin', 'installment-sales'], (old) => {
                if (!old || !old.vendas) return old
                return {
                    ...old,
                    vendas: old.vendas.map(v => {
                        if (v.id === vendaId) {
                            const newDue = Math.max(0, (v.dueAmount || 0) - amount)
                            const newPaid = (v.paidAmount || 0) + amount
                            return { ...v, dueAmount: newDue, paidAmount: newPaid }
                        }
                        return v
                    })
                }
            })

            return { previousInstallments, previousSales, vendaId }
        },

        onError: (err, newTodo, context) => {
            // Rollback
            if (context?.previousInstallments) {
                queryClient.setQueryData(
                    ['admin', 'installments', context.vendaId],
                    context.previousInstallments
                )
            }
            if (context?.previousSales) {
                queryClient.setQueryData(
                    ['admin', 'installment-sales'],
                    context.previousSales
                )
            }
            toast.error(formatUserFriendlyError(err))
        },

        onSettled: (data, error, variables) => {
            // Sempre refetch para garantir consistência
            queryClient.invalidateQueries({ queryKey: ['admin', 'installment-sales'] })
            if (variables.vendaId) {
                queryClient.invalidateQueries({ queryKey: ['admin', 'installments', variables.vendaId] })
            } else {
                queryClient.invalidateQueries({ queryKey: ['admin', 'installments'] })
            }

            if (!error) {
                toast.success('Pagamento registrado!')
            }
        }
    })

    const payFullSaleMutation = useMutation({
        mutationFn: ({ vendaId }) => payFullVendaWithInstallments(vendaId),
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['admin', 'installment-sales'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'sales'] })
                queryClient.invalidateQueries({ queryKey: ['admin', 'installments'] })
                toast.success('Venda quitada com sucesso!')
            } else {
                toast.error(result.error || 'Erro ao quitar venda')
            }
        },
        onError: (err) => {
            toast.error(formatUserFriendlyError(err))
        }
    })

    return {
        registerPayment: registerPaymentMutation.mutateAsync,
        isRegistering: registerPaymentMutation.isPending,
        payFullSale: payFullSaleMutation.mutateAsync,
        isPayingFull: payFullSaleMutation.isPending
    }
}
