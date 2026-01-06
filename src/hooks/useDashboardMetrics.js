import { useMemo } from 'react'

/**
 * Hook para calcular métricas financeiras do dashboard (DRE Gerencial)
 * Centraliza toda a lógica de cálculo financeiro
 * 
 * @param {Object} params
 * @param {Array} params.filteredVendas - Vendas filtradas pelo período
 * @param {Array} params.allVendas - Todas as vendas do store (para cálculo de a receber)
 * @param {Object} params.dashboardData - Dados adicionais (despesas, parcelas)
 * @param {number} params.periodDays - Número de dias do período selecionado
 * @param {string} params.periodFilter - Filtro de período ativo
 * @param {Object} params.customDateRange - Range customizado se aplicável
 * @returns {Object} Métricas financeiras completas
 */
export function useDashboardMetrics({
    filteredVendas,
    allVendas,
    dashboardData,
    periodDays,
    periodFilter,
    customDateRange
}) {
    return useMemo(() => {
        const allSales = filteredVendas && filteredVendas.length > 0 ? filteredVendas : [];

        // (1) RECEITA BRUTA - TODAS as vendas realizadas
        const grossRevenue = allSales.reduce((sum, v) => sum + (v.totalValue || 0), 0);

        // (2) RECEITA LÍQUIDA - Após taxas
        const netRevenue = allSales.reduce((sum, v) => sum + (v.netAmount || v.totalValue - (v.feeAmount || 0)), 0);

        // (3) NÚMERO DE VENDAS E TICKET MÉDIO
        const totalSalesCount = allSales.length;
        const averageTicket = totalSalesCount > 0 ? grossRevenue / totalSalesCount : 0;

        // (4) CPV - Custo dos Produtos Vendidos
        let costWarnings = 0
        const totalCPV = allSales.reduce((sum, v) => {
            const itemsCost = (v.items || []).reduce((itemSum, item) => {
                let cost = item.costPriceAtTime || item.cost_price_at_time || item.costPrice
                const quantity = item.quantity || item.qty || 1

                if (!cost || cost <= 0) {
                    costWarnings++
                    cost = (item.price || 0) * 0.6
                }

                return itemSum + (cost * quantity)
            }, 0)
            return sum + itemsCost
        }, 0)

        // (5) LUCRO BRUTO
        const grossProfit = grossRevenue - totalCPV;

        // (6) MARGEM BRUTA PERCENTUAL
        const grossMarginPercent = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

        // (7) TAXAS - Total e percentual
        const totalFees = allSales.reduce((sum, v) => sum + (v.feeAmount || 0), 0);
        const feePercent = grossRevenue > 0 ? (totalFees / grossRevenue) * 100 : 0;

        // (8) DESCONTOS
        const totalDiscounts = allSales.reduce((sum, v) => {
            const discount = (v.totalValue || 0) - (v.netAmount || v.totalValue);
            return sum + discount;
        }, 0);

        // (9) DESPESAS FIXAS - PROPORCIONALIZADAS
        let monthlyExpenses = 0;
        let proportionalExpenses = 0;

        if (dashboardData?.expenses && dashboardData.expenses.length > 0) {
            monthlyExpenses = dashboardData.expenses.reduce((sum, expense) => {
                let monthlyValue = expense.value || 0;
                const recurrence = expense.recurrence?.toLowerCase() || 'mensal';

                if (recurrence === 'diário' || recurrence === 'daily') {
                    monthlyValue *= 30;
                } else if (recurrence === 'semanal' || recurrence === 'weekly') {
                    monthlyValue *= 4.33;
                } else if (recurrence === 'trimestral' || recurrence === 'quarterly') {
                    monthlyValue /= 3;
                } else if (recurrence === 'anual' || recurrence === 'yearly') {
                    monthlyValue /= 12;
                }
                return sum + monthlyValue;
            }, 0);

            proportionalExpenses = (monthlyExpenses / 30) * periodDays;
        }

        // (10) LUCRO OPERACIONAL (corrigido: deduz taxas como despesa operacional)
        // Fórmula DRE: Lucro Bruto - Despesas Operacionais (inclui taxas de pagamento)
        const operatingProfit = grossProfit - proportionalExpenses - totalFees;

        // (11) MARGEM LÍQUIDA (usa lucro operacional já corrigido)
        const netMarginPercent = grossRevenue > 0 ? (operatingProfit / grossRevenue) * 100 : 0;

        // (12) FLUXO DE CAIXA
        const now = new Date();
        const isInPeriod = (dateStr) => {
            const date = new Date(dateStr);
            if (periodFilter === 'last7days') {
                const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                return date >= cutoff;
            }
            if (periodFilter === 'last30days') {
                const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                return date >= cutoff;
            }
            if (periodFilter === 'currentMonth') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }
            if (periodFilter === 'custom' && customDateRange.start && customDateRange.end) {
                const start = new Date(customDateRange.start);
                const end = new Date(customDateRange.end);
                end.setHours(23, 59, 59, 999);
                return date >= start && date <= end;
            }
            return true;
        };

        // Valores Recebidos
        const receivedFromSales = allSales.reduce((sum, v) => {
            const status = v.paymentStatus || v.payment_status;
            const isInstallment = v.isInstallment || v.is_installment === true;
            const net = Number(v.netAmount || v.net_amount || 0);
            const total = Number(v.totalValue || v.total_value || 0);
            const fee = Number(v.feeAmount || v.fee_amount || 0);
            const entry = Number(v.entryPayment || v.entry_payment || 0);

            if (status === 'paid' && !isInstallment) {
                return sum + (net || total - fee);
            }
            return sum + entry;
        }, 0);

        let receivedFromInstallments = 0;
        if (dashboardData?.installments) {
            dashboardData.installments.forEach(inst => {
                (inst.installmentPayments || []).forEach(payment => {
                    const paymentDate = payment.createdAt || payment.paymentDate;
                    if (isInPeriod(paymentDate)) {
                        receivedFromInstallments += (payment.paymentAmount || 0);
                    }
                });
            });
        }

        const receivedAmount = receivedFromSales + receivedFromInstallments;

        // Valores a Receber
        const toReceiveFromSimpleSales = (allVendas || []).reduce((sum, v) => {
            const status = v.paymentStatus || v.payment_status;
            const isInstallment = v.isInstallment || v.is_installment === true;
            const total = Number(v.totalValue || v.total_value || 0);
            const entry = Number(v.entryPayment || v.entry_payment || 0);

            if (status === 'pending' && !isInstallment) {
                const balance = total - entry;
                return sum + Math.max(0, balance);
            }
            return sum;
        }, 0);

        const toReceiveFromInstallments = dashboardData?.installments ?
            dashboardData.installments.reduce((sum, inst) => {
                const totalPaid = inst.installmentPayments?.reduce((s, p) => s + (p.paymentAmount || 0), 0) || 0;
                const remaining = (inst.originalAmount || 0) - totalPaid;
                return sum + Math.max(0, remaining);
            }, 0) : 0;

        const toReceiveAmount = toReceiveFromSimpleSales + toReceiveFromInstallments;

        // (13) INDICADORES DE RISCO
        let overdueAmount = 0;
        let overdueCount = 0;
        let totalInstallments = 0;

        if (dashboardData?.installments) {
            dashboardData.installments.forEach(inst => {
                totalInstallments++;
                const dueDate = new Date(inst.dueDate);

                if (dueDate < now) {
                    const paid = inst.installmentPayments?.reduce((s, p) => s + (p.paymentAmount || 0), 0) || 0;
                    const remaining = (inst.originalAmount || 0) - paid;

                    if (remaining > 0) {
                        overdueAmount += remaining;
                        overdueCount += 1;
                    }
                }
            });
        }

        const defaultPercent = totalInstallments > 0 ? (overdueCount / totalInstallments) * 100 : 0;

        const pendingFiado = (allVendas || [])
            .filter(v => v.paymentMethod === 'fiado' && v.paymentStatus === 'pending')
            .reduce((acc, curr) => acc + (curr.totalValue || 0), 0);

        return {
            // DRE Metrics
            grossRevenue,
            netRevenue,
            totalSalesCount,
            averageTicket,
            totalCPV,
            grossProfit,
            grossMarginPercent,
            totalFees,
            feePercent,
            totalDiscounts,
            monthlyExpenses,
            proportionalExpenses,
            operatingProfit,
            netMarginPercent,
            // Cash Flow
            receivedAmount,
            toReceiveAmount,
            // Risk Indicators
            overdueAmount,
            overdueCount,
            defaultPercent,
            // Legacy metrics
            totalSales: grossRevenue,
            totalGrossMarginValue: grossProfit,
            totalNetMarginValue: operatingProfit,
            totalCostPrice: totalCPV,
            overallGrossMarginPercent: grossMarginPercent,
            overallNetMarginPercent: netMarginPercent,
            pendingFiado,
            // Period info
            periodDays,
            costWarnings
        };
    }, [filteredVendas, allVendas, dashboardData, periodDays, periodFilter, customDateRange])
}
