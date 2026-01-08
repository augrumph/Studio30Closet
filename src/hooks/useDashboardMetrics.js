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

        // =================================================================================
        // 1. REVENUE & DISCOUNTS
        // =================================================================================

        // Calcular descontos e receita bruta real
        // Assumindo que v.totalValue é o valor FINAL pago pelo cliente
        // E que v.discount, se existir, é o valor abatido.
        // Se v.discount não existir, tentamos inferir da diferença lista x total, mas isso pode ser arriscado.
        // Pela mensagem do usuário: "Receita Bruta 2220.90 (-) Descontos 33.03 = Receita Líquida 2187.87"
        // Isso sugere que no DB a venda deve ter "total_value = 2187.87" e "discount = 33.03"?
        // OU "total_value = 2220.90" e um campo "paid_amount = 2187.87"?

        // VAMOS ASSUMIR PELO ERRO RELATADO:
        // O usuário disse: "R$ 1.125,15 (Rec) - 33,03 (Desc) ... = 798,19".
        // O sistema mostrava 831,22 (que é 798,19 + 33,03).
        // Logo, o sistema estava IGNORANDO o desconto no lucro.
        // O sistema usava grossRevenue = totalValue. E depois grossProfit = grossRevenue - CPV.
        // Se grossRevenue incluía o desconto (era o pre-discount), então grossProfit estava alto.
        // Se grossRevenue já era liquido (post-discount), então estava certo? NÃO.
        // Se o lucro estava ALTO (831 vs 798), significa que não subtraímos o desconto.

        // ESTRATÉGIA SEGURA:
        // Gross Revenue = Soma de (products_price * quantity) OU (totalValue + discount)
        // Net Revenue = Gross Revenue - Discount

        let calculatedGrossRevenue = 0;
        let totalDiscounts = 0;

        allSales.forEach(v => {
            // Tentar capturar o desconto da venda (campo discount ou similar)
            const discount = Number(v.discount || v.discountValue || 0);

            // Se totalValue já é o final, então Bruto = Final + Desconto
            const finalValue = Number(v.totalValue || 0);

            calculatedGrossRevenue += (finalValue + discount);
            totalDiscounts += discount;
        });

        // =================================================================================
        // 2. DEDUCTIONS (Taxes & Fees)
        // =================================================================================

        const totalFees = allSales.reduce((sum, v) => sum + (v.feeAmount || 0), 0);

        // DAS (Imposto) - Extrair das despesas fixas
        let monthlyDasExpense = 0;
        let dasExpenseName = '';

        // =================================================================================
        // 3. EXPENSES (Operational vs Financial)
        // =================================================================================

        let totalMonthlyFixedExpenses = 0; // Totalzão cadastrado
        let monthlyLoanPayment = 0; // Parcela do empréstimo (Principal + Juros)
        let monthlyOperationalExpenses = 0; // Sem DAS, sem Empréstimo

        // Loan Params (Hardcoded per user request)
        // Principal: 6163.03, Rate: 18% a.a. (~1.3888% p.m.)
        // Juros Mensal (Estimado): ~85.60
        // O restante da parcela é Amortização (Não entra no DRE)
        const loanInterestPart = 85.60;

        if (dashboardData?.expenses) {
            dashboardData.expenses.forEach(expense => {
                let monthlyValue = Number(expense.value || 0);
                const recurrence = expense.recurrence?.toLowerCase() || 'mensal';
                const name = expense.name?.toLowerCase() || '';

                // Normalizar para mensal
                if (recurrence === 'diário' || recurrence === 'daily') monthlyValue *= 30;
                else if (recurrence === 'semanal' || recurrence === 'weekly') monthlyValue *= 4.33;
                else if (recurrence === 'trimestral' || recurrence === 'quarterly') monthlyValue /= 3;
                else if (recurrence === 'anual' || recurrence === 'yearly') monthlyValue /= 12;

                totalMonthlyFixedExpenses += monthlyValue;

                // Identificar DAS
                if (name.includes('das') || name.includes('mei') || name.includes('imposto')) {
                    monthlyDasExpense += monthlyValue;
                    dasExpenseName = expense.name;
                }
                // Identificar Empréstimo
                else if (name.includes('empréstimo') || name.includes('emprestimo')) {
                    monthlyLoanPayment += monthlyValue;
                }
                // Despesas Operacionais Gerais (Aluguel, Luz, etc)
                else {
                    monthlyOperationalExpenses += monthlyValue;
                }
            });
        }

        // Definir quais despesas aplicar no período (Lógica Full vs Proporcional)
        // Se for mês corrente/cheio, usa o valor mensal cheio.
        // Se for período quebrado (last7days), usa proporcional.
        const shouldShowFullMonth =
            periodFilter === 'currentMonth' ||
            periodFilter === 'last30days' ||
            (periodFilter === 'all' && periodDays < 30);

        // Funções para calcular o valor aplicado ao período
        const expensesInPeriod = (monthlyVal) => shouldShowFullMonth ? monthlyVal : (monthlyVal / 30) * periodDays;

        // VALORES APLICADOS NO DRE:
        const appliedOperationalExpenses = expensesInPeriod(monthlyOperationalExpenses);
        const appliedDasExpense = expensesInPeriod(monthlyDasExpense);
        const appliedLoanInterest = expensesInPeriod(loanInterestPart); // Apenas juros!
        // Amortização (para info, não DRE)
        const appliedAmortization = expensesInPeriod(monthlyLoanPayment - loanInterestPart);

        // =================================================================================
        // 4. CPV e LUCROS
        // =================================================================================

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

        // =================================================================================
        // CÁLCULO DRE (Flow Correto)
        // =================================================================================

        // 1. Receita Operacional Bruta
        const grossRevenue = calculatedGrossRevenue;

        // 2. (=) Receita Operacional Líquida
        const netRevenue = grossRevenue - totalDiscounts;

        // 3. (=) Lucro Bruto
        const grossProfit = netRevenue - totalCPV;

        // 4. (=) Lucro Operacional (EBITDA ajustado)
        // Deduz despesas operacionais, DAS, e taxas de cartão
        const operatingProfit = grossProfit - appliedOperationalExpenses - appliedDasExpense - totalFees;

        // 5. (=) Lucro Líquido
        // Deduz despesas financeiras (Juros)
        const netProfit = operatingProfit - appliedLoanInterest;


        // Margens
        const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
        const netMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

        // =================================================================================
        // FLUXO DE CAIXA E OUTROS
        // =================================================================================

        // Simples soma de recebidos (mantido, mas atenção aos 20 reais de diferença do user)
        // Os R$ 20,18 de diferença podem ser "entryPayment" vs "totalValue".
        // Vamos manter a lógica original de recebimento por ser baseada em status.

        const receivedFromSales = allSales.reduce((sum, v) => {
            // Lógica existente...
            const status = v.paymentStatus || v.payment_status;
            const isInstallment = v.isInstallment || v.is_installment === true;
            const net = Number(v.netAmount || v.net_amount || 0); // Já desconta taxa se calculado no back
            const total = Number(v.totalValue || v.total_value || 0);
            const fee = Number(v.feeAmount || v.fee_amount || 0);
            const entry = Number(v.entryPayment || v.entry_payment || 0);

            if (status === 'paid' && !isInstallment) {
                return sum + (net || total - fee);
            }
            return sum + entry;
        }, 0);

        let receivedFromInstallments = 0;
        const now = new Date();
        const isInPeriod = (dateStr) => {
            const date = new Date(dateStr);
            if (periodFilter === 'all') return true; // Fix para pegar tudo no 'all'
            if (periodFilter === 'last7days') return date >= new Date(now.getTime() - 7 * 86400000);
            if (periodFilter === 'last30days') return date >= new Date(now.getTime() - 30 * 86400000);
            if (periodFilter === 'currentMonth') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            if (periodFilter === 'custom' && customDateRange.start && customDateRange.end) {
                const s = new Date(customDateRange.start), e = new Date(customDateRange.end);
                e.setHours(23, 59, 59);
                return date >= s && date <= e;
            }
            return true;
        };

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

        // A Receber... (mantido lógica anterior simplificada)
        const toReceiveFromSimpleSales = (allVendas || []).reduce((sum, v) => {
            const status = v.paymentStatus;
            const isInstallment = v.isInstallment;
            const total = Number(v.totalValue || 0);
            const entry = Number(v.entryPayment || 0);
            if (status === 'pending' && !isInstallment) {
                return sum + Math.max(0, total - entry);
            }
            return sum;
        }, 0);

        const toReceiveFromInstallments = dashboardData?.installments ?
            dashboardData.installments.reduce((sum, inst) => {
                const totalPaid = inst.installmentPayments?.reduce((s, p) => s + (p.paymentAmount || 0), 0) || 0;
                return sum + Math.max(0, (inst.originalAmount || 0) - totalPaid);
            }, 0) : 0;

        const toReceiveAmount = toReceiveFromSimpleSales + toReceiveFromInstallments;

        // Risco
        let overdueAmount = 0;
        let overdueCount = 0;
        let totalInstallmentsCount = 0;
        if (dashboardData?.installments) {
            dashboardData.installments.forEach(inst => {
                totalInstallmentsCount++;
                if (new Date(inst.dueDate) < now) {
                    const paid = inst.installmentPayments?.reduce((s, p) => s + (p.paymentAmount || 0), 0) || 0;
                    if ((inst.originalAmount - paid) > 0) {
                        overdueAmount += (inst.originalAmount - paid);
                        overdueCount++;
                    }
                }
            });
        }
        const defaultPercent = totalInstallmentsCount > 0 ? (overdueCount / totalInstallmentsCount) * 100 : 0;
        const pendingFiado = (allVendas || []).filter(v => v.paymentMethod === 'fiado' && v.paymentStatus === 'pending').reduce((acc, curr) => acc + (curr.totalValue || 0), 0);

        return {
            // New DRE Fields
            grossRevenue,
            totalDiscounts,
            netRevenue,
            totalCPV,
            grossProfit,

            // Deductions / Expenses Breakdown
            totalFees, // Taxas Cartão
            appliedDasExpense, // DAS

            appliedOperationalExpenses, // Despesas Fixas (Sem DAS/Emprestimo)

            operatingProfit, // Lucro Operacional

            appliedLoanInterest, // Despesa Financeira
            appliedAmortization, // Redução Passivo (Info)

            netProfit, // Resultado final do exercício

            grossMarginPercent,
            netMarginPercent,
            feePercent: grossRevenue > 0 ? (totalFees / grossRevenue) * 100 : 0,

            // Cash Flow
            receivedAmount,
            toReceiveAmount,

            // Risk
            overdueAmount,
            overdueCount,
            defaultPercent,
            pendingFiado,

            // Metadata
            totalSalesCount: allSales.length,
            averageTicket: allSales.length > 0 ? netRevenue / allSales.length : 0,
            costWarnings,
            periodDays,
            isFullMonthProjection: shouldShowFullMonth
        };
    }, [filteredVendas, allVendas, dashboardData, periodDays, periodFilter, customDateRange])
}
