-- ============================================================================
-- Migration: Sistema de Parcelamento/Crediário
-- Data: 2026-01-13
-- ============================================================================

-- 1. Criar função para obter resumo de crediário de uma venda
CREATE OR REPLACE FUNCTION get_installment_summary(p_venda_id BIGINT)
RETURNS TABLE (
    total_value DECIMAL,
    entry_payment DECIMAL,
    remaining_value DECIMAL,
    num_installments INTEGER,
    paid_installments INTEGER,
    pending_installments INTEGER,
    overdue_amount DECIMAL,
    last_payment_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.total_value,
        COALESCE(v.entry_payment, 0) AS entry_payment,
        -- Saldo = Soma dos remaining_amount de todas as parcelas
        COALESCE(SUM(i.remaining_amount), 0) AS remaining_value,
        v.num_installments,
        -- Parcelas pagas = parcelas com remaining_amount = 0
        COUNT(*) FILTER (WHERE i.remaining_amount = 0)::INTEGER AS paid_installments,
        -- Parcelas pendentes = parcelas com remaining_amount > 0
        COUNT(*) FILTER (WHERE i.remaining_amount > 0)::INTEGER AS pending_installments,
        -- Valor vencido = soma das parcelas vencidas e não pagas
        COALESCE(SUM(i.remaining_amount) FILTER (WHERE i.status = 'overdue'), 0) AS overdue_amount,
        -- Última data de pagamento
        MAX(ip.payment_date) AS last_payment_date
    FROM vendas v
    LEFT JOIN installments i ON i.venda_id = v.id
    LEFT JOIN installment_payments ip ON ip.installment_id = i.id
    WHERE v.id = p_venda_id
    GROUP BY v.id, v.total_value, v.entry_payment, v.num_installments;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Criar função para atualizar status de parcelas (pending, overdue, paid)
CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar remaining_amount
    NEW.remaining_amount = NEW.original_amount - NEW.paid_amount;

    -- Atualizar status baseado no remaining_amount e due_date
    IF NEW.remaining_amount <= 0 THEN
        NEW.status = 'paid';
    ELSIF NEW.due_date < CURRENT_DATE THEN
        NEW.status = 'overdue';
    ELSE
        NEW.status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS trg_update_installment_status ON installments;
CREATE TRIGGER trg_update_installment_status
    BEFORE INSERT OR UPDATE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION update_installment_status();

-- 4. Criar função para atualizar parcela quando há pagamento
CREATE OR REPLACE FUNCTION update_installment_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_installment RECORD;
BEGIN
    -- Buscar parcela atual
    SELECT * INTO v_installment FROM installments WHERE id = NEW.installment_id;

    -- Atualizar paid_amount da parcela
    UPDATE installments
    SET
        paid_amount = v_installment.paid_amount + NEW.payment_amount,
        updated_at = NOW()
    WHERE id = NEW.installment_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para atualizar parcela quando há pagamento
DROP TRIGGER IF EXISTS trg_update_installment_on_payment ON installment_payments;
CREATE TRIGGER trg_update_installment_on_payment
    AFTER INSERT ON installment_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_installment_on_payment();

-- 6. Atualizar status de todas as parcelas existentes
UPDATE installments
SET
    remaining_amount = original_amount - paid_amount,
    status = CASE
        WHEN (original_amount - paid_amount) <= 0 THEN 'paid'
        WHEN due_date < CURRENT_DATE AND (original_amount - paid_amount) > 0 THEN 'overdue'
        ELSE 'pending'
    END,
    updated_at = NOW();

COMMENT ON FUNCTION get_installment_summary IS 'Retorna resumo completo de crediário de uma venda';
COMMENT ON FUNCTION update_installment_status IS 'Atualiza status e remaining_amount de uma parcela';
COMMENT ON FUNCTION update_installment_on_payment IS 'Atualiza paid_amount da parcela quando há novo pagamento';
