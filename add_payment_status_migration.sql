-- Add payment_status column to vendas table
ALTER TABLE public.vendas
ADD COLUMN payment_status text DEFAULT 'pending'
CHECK (payment_status IN ('pending', 'paid', 'cancelled'));

-- Update existing credit sales to pending
UPDATE public.vendas
SET payment_status = 'pending'
WHERE payment_method = 'fiado';

-- Update existing non-credit sales to paid
UPDATE public.vendas
SET payment_status = 'paid'
WHERE payment_method != 'fiado' OR payment_method IS NULL;
