import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOpenInstallmentSales, getInstallmentsByVendaId, registerInstallmentPayment } from '@/lib/api/installments'
import { updateVenda } from '@/lib/api/vendas'
import { toast } from 'sonner'
import { formatUserFriendlyError } from '@/lib/errorHandler'

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

            return { previousInstallments, vendaId }
        },

        onError: (err, newTodo, context) => {
            // Rollback
            if (context?.previousInstallments) {
                queryClient.setQueryData(
                    ['admin', 'installments', context.vendaId],
                    context.previousInstallments
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
        mutationFn: ({ vendaId }) => updateVenda(vendaId, { paymentStatus: 'paid' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'installment-sales'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'sales'] })
            toast.success('Venda quitada com sucesso!')
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
