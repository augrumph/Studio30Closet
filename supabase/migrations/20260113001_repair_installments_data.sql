-- ============================================================================
-- Migration: Reparar dados de parcelas existentes
-- Data: 2026-01-13
-- ============================================================================

-- 1. Recalcular paid_amount de cada parcela baseado nos pagamentos
UPDATE installments i
SET paid_amount = COALESCE(
    (SELECT SUM(payment_amount)
     FROM installment_payments ip
     WHERE ip.installment_id = i.id),
    0
),
updated_at = NOW();

-- 2. Recalcular remaining_amount e status de todas as parcelas
UPDATE installments
SET
    remaining_amount = original_amount - paid_amount,
    status = CASE
        WHEN (original_amount - paid_amount) <= 0 THEN 'paid'
        WHEN due_date < CURRENT_DATE AND (original_amount - paid_amount) > 0 THEN 'overdue'
        ELSE 'pending'
    END,
    updated_at = NOW();

-- 3. Log do resultado
DO $$
DECLARE
    total_installments INTEGER;
    paid_count INTEGER;
    pending_count INTEGER;
    overdue_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_installments FROM installments;
    SELECT COUNT(*) INTO paid_count FROM installments WHERE status = 'paid';
    SELECT COUNT(*) INTO pending_count FROM installments WHERE status = 'pending';
    SELECT COUNT(*) INTO overdue_count FROM installments WHERE status = 'overdue';

    RAISE NOTICE '✅ Parcelas recalculadas:';
    RAISE NOTICE '   Total: %', total_installments;
    RAISE NOTICE '   Pagas: %', paid_count;
    RAISE NOTICE '   Pendentes: %', pending_count;
    RAISE NOTICE '   Vencidas: %', overdue_count;
END $$;
