-- ============================================================================
-- SISTEMA DE CREDIÁRIO PARCELADO SEM TAXAS - STUDIO30 CLOSET
-- ============================================================================
-- Este arquivo contém as queries para criar/modificar o sistema de crediário
-- Permite parcelas sem taxa com edição de pagamentos ao longo do tempo
-- ============================================================================

-- 1. MODIFICAR TABELA VENDAS (Adicionar campos de crediário)
-- ============================================================================

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT false;
-- Marca se a venda foi com crediário parcelado

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS num_installments INTEGER DEFAULT 1;
-- Número total de parcelas (ex: 3x, 5x)

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS entry_payment DECIMAL(10,2) DEFAULT 0;
-- Valor de entrada paga no ato (adiantamento)

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS installment_start_date DATE;
-- Data de início das parcelas (dia que a 1ª parcela vence)

COMMENT ON COLUMN vendas.is_installment IS 'Indica se é venda com crediário parcelado (sem taxa)';
COMMENT ON COLUMN vendas.num_installments IS 'Quantidade total de parcelas (1 = à vista)';
COMMENT ON COLUMN vendas.entry_payment IS 'Valor de entrada pago no ato da compra';
COMMENT ON COLUMN vendas.installment_start_date IS 'Data que começa a contar as parcelas';

-- 2. CRIAR TABELA installments (Registro de cada parcela)
-- ============================================================================

CREATE TABLE IF NOT EXISTS installments (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL, -- Número da parcela (1, 2, 3...)
    due_date DATE NOT NULL,              -- Data de vencimento
    original_amount DECIMAL(10,2) NOT NULL, -- Valor original da parcela
    paid_amount DECIMAL(10,2) DEFAULT 0,    -- Valor pago até o momento
    remaining_amount DECIMAL(10,2) NOT NULL, -- Valor faltando pagar
    status VARCHAR(20) DEFAULT 'pending',    -- pending, partial, paid, overdue
    payment_date TIMESTAMP,                 -- Data do último pagamento
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: cada venda tem apenas uma parcela com mesmo número
    UNIQUE(venda_id, installment_number)
);

CREATE INDEX idx_installments_venda_id ON installments(venda_id);
CREATE INDEX idx_installments_status ON installments(status);
CREATE INDEX idx_installments_due_date ON installments(due_date);

COMMENT ON TABLE installments IS 'Registro de cada parcela do crediário parcelado';
COMMENT ON COLUMN installments.venda_id IS 'Referência para venda';
COMMENT ON COLUMN installments.installment_number IS 'Número sequencial da parcela';
COMMENT ON COLUMN installments.due_date IS 'Data de vencimento da parcela';
COMMENT ON COLUMN installments.original_amount IS 'Valor original (nunca muda)';
COMMENT ON COLUMN installments.paid_amount IS 'Quanto foi pago até agora';
COMMENT ON COLUMN installments.remaining_amount IS 'Quanto ainda falta';
COMMENT ON COLUMN installments.status IS 'pending|partial|paid|overdue';

-- 3. CRIAR TABELA installment_payments (Histórico de pagamentos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS installment_payments (
    id SERIAL PRIMARY KEY,
    installment_id INTEGER NOT NULL REFERENCES installments(id) ON DELETE CASCADE,
    payment_amount DECIMAL(10,2) NOT NULL, -- Quanto foi pago nesta transação
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50), -- pix, dinheiro, cartao, etc
    notes TEXT,
    created_by VARCHAR(100), -- Quem registrou o pagamento (admin username)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_installment_payments_installment_id ON installment_payments(installment_id);
CREATE INDEX idx_installment_payments_date ON installment_payments(payment_date);

COMMENT ON TABLE installment_payments IS 'Histórico de todos os pagamentos de parcelas';
COMMENT ON COLUMN installment_payments.payment_amount IS 'Valor pagamento nesta transação';
COMMENT ON COLUMN installment_payments.payment_date IS 'Data que foi pago';
COMMENT ON COLUMN installment_payments.payment_method IS 'Como foi pago';
COMMENT ON COLUMN installment_payments.created_by IS 'Admin que registrou';

-- 4. CRIAR FUNÇÃO AUXILIAR (Atualizar status de parcela)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar remaining_amount
    NEW.remaining_amount = NEW.original_amount - NEW.paid_amount;

    -- Atualizar timestamp
    NEW.updated_at = CURRENT_TIMESTAMP;

    -- Atualizar status baseado no paid_amount
    IF NEW.paid_amount >= NEW.original_amount THEN
        NEW.status = 'paid';
    ELSIF NEW.paid_amount > 0 THEN
        NEW.status = 'partial';
    ELSIF NEW.due_date < CURRENT_DATE THEN
        NEW.status = 'overdue';
    ELSE
        NEW.status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente
DROP TRIGGER IF EXISTS trg_update_installment_status ON installments;
CREATE TRIGGER trg_update_installment_status
BEFORE INSERT OR UPDATE ON installments
FOR EACH ROW
EXECUTE FUNCTION update_installment_status();

-- 5. FUNÇÃO PARA CRIAR PARCELAS (Chamada ao criar venda)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_installments(
    p_venda_id INTEGER,
    p_num_installments INTEGER,
    p_entry_payment DECIMAL,
    p_installment_start_date DATE
)
RETURNS TABLE(installment_id INTEGER, installment_number INTEGER, due_date DATE, amount DECIMAL) AS $$
DECLARE
    v_venda RECORD;
    v_remaining_amount DECIMAL;
    v_installment_amount DECIMAL;
    v_installment_num INTEGER;
    v_due_date DATE;
BEGIN
    -- Buscar dados da venda
    SELECT total_value INTO v_venda FROM vendas WHERE id = p_venda_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não encontrada';
    END IF;

    -- Calcular valor restante (total - entrada)
    v_remaining_amount := COALESCE(v_venda.total_value, 0) - COALESCE(p_entry_payment, 0);

    -- Calcular valor de cada parcela
    v_installment_amount := ROUND(v_remaining_amount / p_num_installments, 2);

    -- Criar cada parcela
    FOR v_installment_num IN 1..p_num_installments LOOP
        -- Calcular data de vencimento (a cada mês)
        v_due_date := p_installment_start_date + (v_installment_num - 1) || ' month';

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
        RETURNING
            installments.id,
            installments.installment_number,
            installments.due_date,
            installments.original_amount
        INTO installment_id, installment_number, due_date, amount;

        YIELD NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO PARA REGISTRAR PAGAMENTO DE PARCELA
-- ============================================================================

CREATE OR REPLACE FUNCTION register_installment_payment(
    p_installment_id INTEGER,
    p_payment_amount DECIMAL,
    p_payment_date DATE,
    p_payment_method VARCHAR DEFAULT 'dinheiro',
    p_notes TEXT DEFAULT NULL,
    p_created_by VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_installment RECORD;
BEGIN
    -- Buscar dados da parcela
    SELECT * INTO v_installment FROM installments WHERE id = p_installment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parcela não encontrada';
    END IF;

    -- Não permitir pagar mais do que o original
    IF (v_installment.paid_amount + p_payment_amount) > v_installment.original_amount THEN
        RAISE EXCEPTION 'Pagamento excede o valor da parcela';
    END IF;

    -- Registrar pagamento no histórico
    INSERT INTO installment_payments (
        installment_id,
        payment_amount,
        payment_date,
        payment_method,
        notes,
        created_by
    ) VALUES (
        p_installment_id,
        p_payment_amount,
        p_payment_date,
        p_payment_method,
        p_notes,
        p_created_by
    );

    -- Atualizar parcela (trigger vai atualizar status automaticamente)
    UPDATE installments
    SET paid_amount = paid_amount + p_payment_amount,
        payment_date = CURRENT_TIMESTAMP
    WHERE id = p_installment_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCTION PARA RESUMO DE VENDAS COM CREDIÁRIO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_installment_summary(p_venda_id INTEGER)
RETURNS TABLE(
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
        v.entry_payment,
        (v.total_value - COALESCE(v.entry_payment, 0)) as remaining_value,
        v.num_installments,
        COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::INTEGER as paid_installments,
        COUNT(CASE WHEN i.status IN ('pending', 'partial') THEN 1 END)::INTEGER as pending_installments,
        COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.remaining_amount ELSE 0 END), 0) as overdue_amount,
        MAX(i.payment_date)::DATE as last_payment_date
    FROM vendas v
    LEFT JOIN installments i ON v.id = i.venda_id
    WHERE v.id = p_venda_id
    GROUP BY v.id, v.total_value, v.entry_payment, v.num_installments;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DADOS MIGRAÇÃO (Para vendas antigas - SEM MUDAR DADOS EXISTENTES)
-- ============================================================================
-- Atualizar vendas antigas para marcar como não parceladas (compatibilidade)

UPDATE vendas
SET is_installment = FALSE,
    num_installments = 1
WHERE is_installment IS NULL
AND payment_method != 'fiado';

-- Se há vendas com payment_method = 'fiado' e não tem parcelas criadas ainda,
-- você pode decidir depois como quer tratar

-- ============================================================================
-- VERIFICAR TUDO FOI CRIADO
-- ============================================================================

-- Listar colunas da tabela vendas (deve ter as 4 novas colunas)
-- \d vendas

-- Listar tabelas novas
-- \dt installments
-- \dt installment_payments

-- Testar a função de criar parcelas (DEPOIS QUE HOUVER UMA VENDA)
-- SELECT * FROM create_installments(1, 3, 100.00, CURRENT_DATE);

-- ============================================================================
-- FIM DO SETUP
-- ============================================================================
