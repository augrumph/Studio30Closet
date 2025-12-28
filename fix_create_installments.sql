-- FIX: Corrigir função create_installments com ambiguidade de coluna 'id'
-- Problema: O erro "column reference 'id' is ambiguous" era causado por:
-- 1. Sintaxe incorreta do INTERVAL na linha de data
-- 2. Uso de nomes de colunas sem alias na cláusula RETURNING

CREATE OR REPLACE FUNCTION create_installments(
    p_venda_id INTEGER,
    p_num_installments INTEGER,
    p_entry_payment DECIMAL,
    p_installment_start_date DATE
)
RETURNS TABLE(installment_id INTEGER, installment_number INTEGER, due_date DATE, amount DECIMAL) AS $$
DECLARE
    v_venda_total_value DECIMAL;
    v_remaining_amount DECIMAL;
    v_installment_amount DECIMAL;
    v_installment_num INTEGER;
    v_due_date DATE;
    v_id BIGINT;
    v_inst_number INTEGER;
    v_due DATE;
    v_amount DECIMAL;
BEGIN
    -- Buscar dados da venda
    SELECT total_value INTO v_venda_total_value FROM vendas WHERE id = p_venda_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não encontrada';
    END IF;

    -- Calcular valor restante (total - entrada)
    v_remaining_amount := COALESCE(v_venda_total_value, 0) - COALESCE(p_entry_payment, 0);

    -- Calcular valor de cada parcela
    v_installment_amount := ROUND(v_remaining_amount / p_num_installments, 2);

    -- Criar cada parcela
    FOR v_installment_num IN 1..p_num_installments LOOP
        -- Calcular data de vencimento (a cada mês)
        -- CORRIGIDO: usar parentheses e converter para INTERVAL corretamente
        v_due_date := p_installment_start_date + ((v_installment_num - 1) || ' month')::INTERVAL;

        -- Última parcela pega o resto (para evitar arredondamentos)
        IF v_installment_num = p_num_installments THEN
            v_installment_amount := v_remaining_amount - (v_installment_amount * (p_num_installments - 1));
        END IF;

        -- Inserir parcela
        INSERT INTO installments (
            venda_id,
            installment_number,
            due_date,
            original_amount,
            paid_amount,
            remaining_amount,
            status
        ) VALUES (
            p_venda_id,
            v_installment_num,
            v_due_date,
            v_installment_amount,
            0,
            v_installment_amount,
            'pending'
        )
        RETURNING id, installment_number, due_date, original_amount
        INTO v_id, v_inst_number, v_due, v_amount;

        -- Retornar linha para a TABLE
        installment_id := v_id;
        installment_number := v_inst_number;
        due_date := v_due;
        amount := v_amount;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
