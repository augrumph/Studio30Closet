-- Adicionar tipo de cupom "cost_price" (preço de custo)
-- Primeiro, remover a constraint antiga
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

-- Adicionar nova constraint com o tipo cost_price
ALTER TABLE public.coupons
ADD CONSTRAINT coupons_discount_type_check
CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'cost_price'::text]));

-- Adicionar coluna para marcar se é um cupom especial (apenas um permitido)
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS is_special boolean DEFAULT false;

-- Adicionar constraint para garantir apenas um cupom especial ativo
CREATE UNIQUE INDEX IF NOT EXISTS unique_special_coupon
ON public.coupons (is_special)
WHERE is_special = true AND is_active = true;
