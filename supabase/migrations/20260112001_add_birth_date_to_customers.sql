-- Adicionar coluna de data de nascimento na tabela de clientes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
