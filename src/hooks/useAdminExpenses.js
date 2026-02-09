import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFixedExpenses, getFixedExpenseById, createFixedExpense, updateFixedExpense, deleteFixedExpense } from '@/lib/api/expenses'
import { toast } from 'sonner'

/**
 * Hook to fetch all expenses
 */
/**
 * Hook to fetch all expenses (Paginated & Filtered via BFF)
 */
export function useAdminExpenses({ page = 1, pageSize = 20, search = '' } = {}) {
    const query = useQuery({
        queryKey: ['admin', 'expenses', { page, pageSize, search }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                search
            })
            const response = await fetch(`/api/expenses?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar despesas do backend')
            return response.json()
        },
        staleTime: 1000 * 60 * 60,
        placeholderData: (prev) => prev
    })

    return {
        expenses: query.data?.items || [],
        total: query.data?.total || 0,
        totalPages: query.data?.totalPages || 0,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    }
}

/**
 * Hook to fetch metrics for expenses
 */
export function useAdminExpensesMetrics({ search = '' } = {}) {
    const query = useQuery({
        queryKey: ['admin', 'expenses', 'metrics', { search }],
        queryFn: async () => {
            const queryParams = new URLSearchParams({ search })
            const response = await fetch(`/api/expenses/metrics?${queryParams.toString()}`)
            if (!response.ok) throw new Error('Falha ao buscar métricas de despesas')
            return response.json()
        },
        staleTime: 1000 * 60 * 60
    })

    return {
        metrics: query.data || { count: 0, totalValue: 0 },
        isLoading: query.isLoading
    }
}

/**
 * Hook to fetch single expense
 */
export function useAdminExpense(id) {
    return useQuery({
        queryKey: ['admin', 'expense', id],
        queryFn: () => getFixedExpenseById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 60
    })
}

/**
 * Hook for Expense mutations
 */
export function useAdminExpensesMutations() {
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: createFixedExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] })
            toast.success('Despesa criada com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao criar despesa: ${error.message}`)
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateFixedExpense(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'expense', variables.id] })
            toast.success('Despesa atualizada com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar despesa: ${error.message}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteFixedExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] })
            toast.success('Despesa removida com sucesso!')
        },
        onError: (error) => {
            toast.error(`Erro ao remover despesa: ${error.message}`)
        }
    })

    return {
        createExpense: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateExpense: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deleteExpense: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending
    }
}
