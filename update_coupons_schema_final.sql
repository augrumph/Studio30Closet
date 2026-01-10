-- Migration FINAL para corrigir tabela de coupons
-- Execute este script no Supabase SQL Editor para corrigir o erro 400

-- 1. Adicionar colunas que faltam (com verificação se já existem)
DO $$
BEGIN
    -- Adicionar discount_value se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'min_purchase') THEN
        ALTER TABLE public.coupons ADD COLUMN min_purchase NUMERIC;
    END IF;

    -- Adicionar description se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'description') THEN
        ALTER TABLE public.coupons ADD COLUMN description TEXT;
    END IF;

    -- Adicionar is_special se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'is_special') THEN
        ALTER TABLE public.coupons ADD COLUMN is_special BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Atualizar ou Criar constraints de tipo de desconto
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;
ALTER TABLE public.coupons
ADD CONSTRAINT coupons_discount_type_check
CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'cost_price'::text, 'shipping'::text]));

-- 3. Garantir índice único para cupom especial (apenas se existir a coluna e quiser regra de negócio)
DROP INDEX IF EXISTS unique_special_coupon;
CREATE UNIQUE INDEX unique_special_coupon
ON public.coupons (is_special)
WHERE is_special = true AND is_active = true;

-- Confirmação
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coupons';
