-- Migration para adicionar suporte a cupons de preço de custo
-- Execute este script no Supabase SQL Editor

-- Passo 1: Adicionar coluna is_special se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coupons' AND column_name = 'is_special'
    ) THEN
        ALTER TABLE public.coupons ADD COLUMN is_special boolean DEFAULT false;
        RAISE NOTICE 'Coluna is_special adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna is_special já existe';
    END IF;
END $$;

-- Passo 2: Remover constraint antiga de discount_type
ALTER TABLE public.coupons
DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

-- Passo 3: Adicionar nova constraint com cost_price
ALTER TABLE public.coupons
ADD CONSTRAINT coupons_discount_type_check
CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'cost_price'::text]));

-- Passo 4: Criar índice único para garantir apenas um cupom especial ativo
DROP INDEX IF EXISTS unique_special_coupon;
CREATE UNIQUE INDEX unique_special_coupon
ON public.coupons (is_special)
WHERE is_special = true AND is_active = true;

-- Verificar se tudo foi criado corretamente
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'coupons'
AND column_name IN ('is_special', 'discount_type', 'discount_value')
ORDER BY column_name;
