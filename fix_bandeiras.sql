-- Adicionar taxas por bandeira específica para o plano "ate_20k"
-- As bandeiras agora têm suas próprias taxas

-- Deletar as entradas antigas sem bandeira do plano ate_20k
DELETE FROM public.payment_fees
WHERE plan_code = 'ate_20k'
AND payment_method IN ('credito_avista', 'credito_parcelado');

-- Inserir taxas específicas por bandeira para o plano ate_20k
INSERT INTO public.payment_fees (
    plan_code,
    payment_method,
    card_brand,
    num_installments,
    fee_percentage,
    description
)
VALUES
-- ============================================================
-- CRÉDITO À VISTA (1x) - POR BANDEIRA
-- ============================================================
('ate_20k', 'credito_avista', 'visa', 1, 3.15, 'Visa à vista'),
('ate_20k', 'credito_avista', 'mastercard', 1, 3.15, 'Mastercard à vista'),
('ate_20k', 'credito_avista', 'elo', 1, 3.15, 'Elo à vista'),

-- ============================================================
-- CRÉDITO PARCELADO - VISA
-- ============================================================
('ate_20k', 'credito_parcelado', 'visa', 2, 5.81, 'Visa 2x'),
('ate_20k', 'credito_parcelado', 'visa', 3, 6.32, 'Visa 3x'),
('ate_20k', 'credito_parcelado', 'visa', 4, 6.83, 'Visa 4x'),
('ate_20k', 'credito_parcelado', 'visa', 5, 7.33, 'Visa 5x'),
('ate_20k', 'credito_parcelado', 'visa', 6, 7.83, 'Visa 6x'),

-- ============================================================
-- CRÉDITO PARCELADO - MASTERCARD
-- ============================================================
('ate_20k', 'credito_parcelado', 'mastercard', 2, 5.81, 'Mastercard 2x'),
('ate_20k', 'credito_parcelado', 'mastercard', 3, 6.32, 'Mastercard 3x'),
('ate_20k', 'credito_parcelado', 'mastercard', 4, 6.83, 'Mastercard 4x'),
('ate_20k', 'credito_parcelado', 'mastercard', 5, 7.33, 'Mastercard 5x'),
('ate_20k', 'credito_parcelado', 'mastercard', 6, 7.83, 'Mastercard 6x'),

-- ============================================================
-- CRÉDITO PARCELADO - ELO
-- ============================================================
('ate_20k', 'credito_parcelado', 'elo', 2, 5.81, 'Elo 2x'),
('ate_20k', 'credito_parcelado', 'elo', 3, 6.32, 'Elo 3x'),
('ate_20k', 'credito_parcelado', 'elo', 4, 6.83, 'Elo 4x'),
('ate_20k', 'credito_parcelado', 'elo', 5, 7.33, 'Elo 5x'),
('ate_20k', 'credito_parcelado', 'elo', 6, 7.83, 'Elo 6x');

-- Verificar as taxas inseridas
SELECT plan_code, payment_method, card_brand, num_installments, fee_percentage, description
FROM payment_fees
WHERE plan_code = 'ate_20k'
ORDER BY payment_method, card_brand, COALESCE(num_installments, 0);
