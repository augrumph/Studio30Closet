import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getPaymentFees,
    getPaymentFeeById,
    getPaymentFee,
    createPaymentFee,
    updatePaymentFee,
    deletePaymentFee,
    deleteAllPaymentFees
} from '@/lib/api/payment-fees'
import { toast } from 'sonner'

/**
 * Hook to fetch all payment fees
 */
export function usePaymentFees() {
    return useQuery({
        queryKey: ['payment-fees'],
        queryFn: getPaymentFees,
        staleTime: 1000 * 60 * 30 // 30 minutes - fees don't change often
    })
}

/**
 * Hook to fetch single payment fee
 */
export function usePaymentFee(id) {
    return useQuery({
        queryKey: ['payment-fees', id],
        queryFn: () => getPaymentFeeById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 30
    })
}

/**
 * Hook to calculate fee for specific payment method
 * @param {string} paymentMethod - 'pix', 'debito', 'credito'
 * @param {string} cardBrand - 'visa', 'mastercard', 'elo' (optional)
 * @param {number} installments - number of installments (optional)
 */
export function useCalculatePaymentFee(paymentMethod, cardBrand = null, installments = null) {
    return useQuery({
        queryKey: ['payment-fees', 'calculate', paymentMethod, cardBrand, installments],
        queryFn: () => getPaymentFee(paymentMethod, cardBrand, installments),
        enabled: !!paymentMethod,
        staleTime: 1000 * 60 * 30
    })
}

/**
 * Hook for payment fee mutations
 */
export function usePaymentFeeMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createPaymentFee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-fees'] })
            toast.success('Taxa criada com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao criar taxa: ${error.message}`)
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updatePaymentFee(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['payment-fees'] })
            queryClient.invalidateQueries({ queryKey: ['payment-fees', variables.id] })
            toast.success('Taxa atualizada com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar taxa: ${error.message}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deletePaymentFee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-fees'] })
            toast.success('Taxa removida com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover taxa: ${error.message}`)
        }
    })

    const deleteAllMutation = useMutation({
        mutationFn: deleteAllPaymentFees,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-fees'] })
            toast.success('Todas as taxas foram removidas!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover taxas: ${error.message}`)
        }
    })

    return {
        createPaymentFee: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updatePaymentFee: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deletePaymentFee: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,

        deleteAllPaymentFees: deleteAllMutation.mutateAsync,
        isDeletingAll: deleteAllMutation.isPending
    }
}
