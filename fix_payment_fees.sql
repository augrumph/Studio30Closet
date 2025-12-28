-- FIX: Corrigir configuração de taxas de pagamento
-- Regra:
-- - PIX: SEM BANDEIRA, 0% taxa
-- - Dinheiro: SEM BANDEIRA, 0% taxa
-- - Crediário: SEM BANDEIRA, 0% taxa (nunca tem juros)
-- - Cartão à vista: COM BANDEIRA (Visa, Mastercard, Elo), 0-2% taxa
-- - Cartão parcelado: COM BANDEIRA, 0-2% taxa conforme número de parcelas

-- 1. Limpar dados antigos
DELETE FROM payment_fees;

-- 2. Inserir métodos SEM bandeira (retornam NULL para card_brand)
-- PIX - Sem taxa
INSERT INTO payment_fees (payment_method, card_brand, fee_percentage, fee_fixed, description, is_active, num_installments)
VALUES ('pix', NULL, 0, 0, 'PIX - Sem taxa', true, NULL);

-- Dinheiro - Sem taxa
INSERT INTO payment_fees (payment_method, card_brand, fee_percentage, fee_fixed, description, is_active, num_installments)
VALUES ('dinheiro', NULL, 0, 0, 'Dinheiro - Sem taxa', true, NULL);

-- Crediário - Sem taxa e sem juros (parcelado sem custo)
INSERT INTO payment_fees (payment_method, card_brand, fee_percentage, fee_fixed, description, is_active, num_installments)
VALUES ('crediario', NULL, 0, 0, 'Crediário - Parcelado sem juros', true, NULL);

-- 3. Cartão de crédito à vista (1 parcela)
INSERT INTO payment_fees (payment_method, card_brand, fee_percentage, fee_fixed, description, is_active, num_installments)
VALUES
  ('credito_avista', 'visa', 1.99, 0, 'Cartão Visa à vista', true, 1),
  ('credito_avista', 'mastercard', 1.99, 0, 'Cartão Mastercard à vista', true, 1),
  ('credito_avista', 'elo', 2.20, 0, 'Cartão Elo à vista', true, 1);

-- 4. Cartão de crédito parcelado (sem taxa até 3x, depois aumenta)
INSERT INTO payment_fees (payment_method, card_brand, fee_percentage, fee_fixed, description, is_active, num_installments)
VALUES
  -- Visa parcelado
  ('credito_parcelado', 'visa', 0, 0, 'Cartão Visa - 2x sem juros', true, 2),
  ('credito_parcelado', 'visa', 0, 0, 'Cartão Visa - 3x sem juros', true, 3),
  ('credito_parcelado', 'visa', 2.99, 0, 'Cartão Visa - 4x com juros', true, 4),
  ('credito_parcelado', 'visa', 3.99, 0, 'Cartão Visa - 5x com juros', true, 5),
  ('credito_parcelado', 'visa', 4.99, 0, 'Cartão Visa - 6x com juros', true, 6),

  -- Mastercard parcelado
  ('credito_parcelado', 'mastercard', 0, 0, 'Cartão Mastercard - 2x sem juros', true, 2),
  ('credito_parcelado', 'mastercard', 0, 0, 'Cartão Mastercard - 3x sem juros', true, 3),
  ('credito_parcelado', 'mastercard', 2.99, 0, 'Cartão Mastercard - 4x com juros', true, 4),
  ('credito_parcelado', 'mastercard', 3.99, 0, 'Cartão Mastercard - 5x com juros', true, 5),
  ('credito_parcelado', 'mastercard', 4.99, 0, 'Cartão Mastercard - 6x com juros', true, 6),

  -- Elo parcelado
  ('credito_parcelado', 'elo', 0, 0, 'Cartão Elo - 2x sem juros', true, 2),
  ('credito_parcelado', 'elo', 0, 0, 'Cartão Elo - 3x sem juros', true, 3),
  ('credito_parcelado', 'elo', 2.99, 0, 'Cartão Elo - 4x com juros', true, 4),
  ('credito_parcelado', 'elo', 3.99, 0, 'Cartão Elo - 5x com juros', true, 5),
  ('credito_parcelado', 'elo', 4.99, 0, 'Cartão Elo - 6x com juros', true, 6);

-- Verificar dados inseridos
SELECT payment_method, card_brand, num_installments, fee_percentage, description
FROM payment_fees
ORDER BY payment_method, card_brand, COALESCE(num_installments, 0);
