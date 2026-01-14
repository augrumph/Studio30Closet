import { useMemo } from 'react';

/**
 * Hook para calcular parcelas de crediário
 * 
 * @param {number} totalAmount - Valor total a ser parcelado
 * @param {number} numberOfInstallments - Número de parcelas
 * @param {number} entryPayment - Valor de entrada (opcional)
 * @param {number} interestRate - Taxa de juros mensal em % (opcional, padrão 0)
 * @returns {Object} Detalhes das parcelas calculadas
 */
export function useInstallmentCalculator({
    totalAmount = 0,
    numberOfInstallments = 1,
    entryPayment = 0,
    interestRate = 0
}) {
    return useMemo(() => {
        // Validações
        if (totalAmount <= 0 || numberOfInstallments <= 0) {
            return {
                installments: [],
                totalWithInterest: 0,
                installmentValue: 0,
                totalInterest: 0,
                amountToFinance: 0
            };
        }

        // Valor a ser financiado (total - entrada)
        const amountToFinance = Math.max(0, totalAmount - entryPayment);

        // Se não houver valor a financiar
        if (amountToFinance === 0) {
            return {
                installments: [],
                totalWithInterest: totalAmount,
                installmentValue: 0,
                totalInterest: 0,
                amountToFinance: 0
            };
        }

        // Calcular valor das parcelas
        let installmentValue;
        let totalWithInterest;
        let totalInterest;

        if (interestRate > 0) {
            // Com juros (usando fórmula de juros compostos)
            const monthlyRate = interestRate / 100;
            const factor = Math.pow(1 + monthlyRate, numberOfInstallments);
            installmentValue = (amountToFinance * monthlyRate * factor) / (factor - 1);
            totalWithInterest = installmentValue * numberOfInstallments;
            totalInterest = totalWithInterest - amountToFinance;
        } else {
            // Sem juros (divisão simples)
            installmentValue = amountToFinance / numberOfInstallments;
            totalWithInterest = amountToFinance;
            totalInterest = 0;
        }

        // Arredondar para 2 casas decimais
        installmentValue = Math.round(installmentValue * 100) / 100;
        totalWithInterest = Math.round(totalWithInterest * 100) / 100;
        totalInterest = Math.round(totalInterest * 100) / 100;

        // Gerar array de parcelas
        const today = new Date();
        const installments = Array.from({ length: numberOfInstallments }, (_, index) => {
            const dueDate = new Date(today);
            dueDate.setMonth(dueDate.getMonth() + index + 1); // Primeira parcela vence no próximo mês

            // Ajustar última parcela para compensar arredondamentos
            const isLastInstallment = index === numberOfInstallments - 1;
            const value = isLastInstallment
                ? Math.round((totalWithInterest - (installmentValue * (numberOfInstallments - 1))) * 100) / 100
                : installmentValue;

            return {
                number: index + 1,
                value: value,
                dueDate: dueDate.toISOString().split('T')[0],
                status: 'pending',
                paid: false,
                paidAmount: 0
            };
        });

        return {
            installments,
            totalWithInterest: totalWithInterest + entryPayment,
            installmentValue,
            totalInterest,
            amountToFinance,
            entryPayment,
            summary: {
                total: totalAmount,
                entry: entryPayment,
                financed: amountToFinance,
                interest: totalInterest,
                finalTotal: totalWithInterest + entryPayment,
                installmentCount: numberOfInstallments,
                installmentValue: installmentValue
            }
        };
    }, [totalAmount, numberOfInstallments, entryPayment, interestRate]);
}

/**
 * Helper para formatar parcelas para exibição
 */
export function formatInstallmentDisplay(installment) {
    return {
        label: `${installment.number}/${installment.total || '?'}`,
        value: `R$ ${installment.value.toFixed(2).replace('.', ',')}`,
        dueDate: new Date(installment.dueDate).toLocaleDateString('pt-BR'),
        status: installment.status,
        isPaid: installment.paid,
        isOverdue: new Date(installment.dueDate) < new Date() && !installment.paid
    };
}

/**
 * Helper para calcular próximo vencimento
 */
export function getNextDueInstallment(installments) {
    const pending = installments.filter(i => !i.paid);
    if (pending.length === 0) return null;

    return pending.reduce((next, current) => {
        const nextDate = new Date(next.dueDate);
        const currentDate = new Date(current.dueDate);
        return currentDate < nextDate ? current : next;
    });
}

/**
 * Helper para calcular total pago vs total devido
 */
export function getInstallmentProgress(installments) {
    const total = installments.reduce((sum, i) => sum + i.value, 0);
    const paid = installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const remaining = total - paid;
    const percentage = total > 0 ? (paid / total) * 100 : 0;

    return {
        total,
        paid,
        remaining,
        percentage: Math.round(percentage * 10) / 10,
        paidCount: installments.filter(i => i.paid).length,
        pendingCount: installments.filter(i => !i.paid).length,
        totalCount: installments.length
    };
}

export default useInstallmentCalculator;
