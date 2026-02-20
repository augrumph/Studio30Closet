/**
 * FASE 2 — Criar Schema no Railway PostgreSQL
 * Cria todas as tabelas, sequences, constraints e extensions
 */
import pg from 'pg'

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:lkFzFRvxtPZHhwtxIKxPlqtLsFLaxtAk@maglev.proxy.rlwy.net:18204/railway',
  ssl: { rejectUnauthorized: false }
})

await client.connect()
console.log('✅ Conectado ao Railway PostgreSQL')

const schema = `
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- SEQUENCES (para tabelas com IDENTITY simulado via nextval)
-- ==========================================
DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS installments_id_seq;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS installment_payments_id_seq;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS midi_insights_id_seq;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- TABELAS (ordem: sem FK primeiro)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id text NOT NULL,
  first_seen_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  page_views integer DEFAULT 0,
  device_type text,
  user_agent text,
  referrer text,
  is_converted boolean DEFAULT false,
  CONSTRAINT analytics_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  page_path text,
  referrer text,
  user_agent text,
  device_type text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.bingo_games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  status text DEFAULT 'waiting'::text CHECK (status = ANY (ARRAY['waiting'::text, 'started'::text, 'finished'::text])),
  called_numbers integer[] DEFAULT '{}'::integer[],
  title text DEFAULT 'Bingo Studio 30'::text,
  pin text NOT NULL UNIQUE,
  CONSTRAINT bingo_games_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.collections (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT collections_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'cost_price'::text])),
  discount_value numeric NOT NULL,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  min_purchase numeric,
  description text,
  is_special boolean DEFAULT false,
  CONSTRAINT coupons_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.customers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  phone text UNIQUE,
  address text,
  complement text,
  instagram text,
  created_at timestamp with time zone DEFAULT now(),
  cpf character varying,
  email character varying,
  addresses jsonb DEFAULT '[]'::jsonb,
  birth_date date,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  cnpj text UNIQUE,
  email text,
  phone text,
  address text,
  city text,
  state text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  contact_person character varying,
  zip_code character varying,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  price numeric,
  cost_price numeric,
  description text,
  stock integer,
  sizes jsonb,
  images text[],
  category text,
  is_featured boolean,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  supplier_id bigint,
  color text,
  variants jsonb DEFAULT '[]'::jsonb,
  is_new boolean DEFAULT true,
  original_price numeric,
  brand text,
  stock_status text DEFAULT 'disponivel'::text CHECK (stock_status = ANY (ARRAY['disponivel'::text, 'em_malinha'::text, 'vendido'::text, 'quarentena'::text])),
  trip_count integer DEFAULT 0,
  last_status_change timestamp with time zone DEFAULT now(),
  image_urls text[],
  is_catalog_featured boolean DEFAULT false,
  is_best_seller boolean DEFAULT false,
  collection_ids bigint[] DEFAULT '{}'::bigint[],
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  customer_id bigint,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'shipped'::text, 'completed'::text, 'cancelled'::text])),
  total_value numeric NOT NULL,
  delivery_date timestamp with time zone,
  pickup_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  converted_to_sale boolean DEFAULT false,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

CREATE TABLE IF NOT EXISTS public.vendas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  customer_id bigint,
  total_value numeric NOT NULL,
  cost_price numeric,
  items jsonb,
  payment_method text,
  created_at timestamp with time zone DEFAULT now(),
  card_brand text,
  fee_percentage numeric DEFAULT 0,
  fee_amount numeric DEFAULT 0,
  net_amount numeric,
  payment_status text NOT NULL DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text])),
  is_installment boolean DEFAULT false,
  num_installments integer DEFAULT 1,
  entry_payment numeric DEFAULT 0,
  installment_start_date date,
  discount_amount numeric DEFAULT 0,
  original_total numeric DEFAULT 0,
  CONSTRAINT vendas_pkey PRIMARY KEY (id),
  CONSTRAINT vendas_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT vendas_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  product_id bigint,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_time numeric NOT NULL,
  size_selected text,
  cost_price_at_time numeric,
  color_selected text,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id text NOT NULL,
  items jsonb NOT NULL,
  total_items integer,
  last_activity_at timestamp with time zone DEFAULT now(),
  checkout_started boolean DEFAULT false,
  checkout_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  customer_data jsonb,
  CONSTRAINT abandoned_carts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.bingo_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  game_id uuid,
  name text NOT NULL,
  card_numbers jsonb NOT NULL,
  score integer DEFAULT 24,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT bingo_participants_pkey PRIMARY KEY (id),
  CONSTRAINT bingo_participants_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.bingo_games(id)
);

CREATE TABLE IF NOT EXISTS public.entregas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id character varying NOT NULL,
  platform character varying DEFAULT 'tiktok'::character varying,
  tiktok_order_id character varying,
  customer_id bigint,
  customer_name text NOT NULL,
  customer_phone text,
  customer_address text NOT NULL,
  customer_cep text,
  customer_city text,
  customer_state character varying,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'returned'::text])),
  tracking_code text,
  tracking_url text,
  carrier text,
  venda_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  notes text,
  tiktok_metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT entregas_pkey PRIMARY KEY (id),
  CONSTRAINT entregas_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT entregas_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id)
);

CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  value numeric NOT NULL,
  category text,
  recurrence text CHECK (recurrence = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text])),
  due_day integer,
  paid boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fixed_expenses_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.installments (
  id bigint NOT NULL DEFAULT nextval('installments_id_seq'::regclass),
  venda_id bigint NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  original_amount numeric NOT NULL,
  paid_amount numeric DEFAULT 0,
  remaining_amount numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  payment_date timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT installments_pkey PRIMARY KEY (id),
  CONSTRAINT installments_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id)
);

CREATE TABLE IF NOT EXISTS public.installment_payments (
  id bigint NOT NULL DEFAULT nextval('installment_payments_id_seq'::regclass),
  installment_id bigint NOT NULL,
  payment_amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method text,
  notes text,
  created_by text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT installment_payments_pkey PRIMARY KEY (id),
  CONSTRAINT installment_payments_installment_id_fkey FOREIGN KEY (installment_id) REFERENCES public.installments(id)
);

CREATE TABLE IF NOT EXISTS public.materials_stock (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  description text,
  quantity integer DEFAULT 0,
  unit_cost numeric,
  category text,
  supplier_id bigint,
  min_stock_level integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT materials_stock_pkey PRIMARY KEY (id),
  CONSTRAINT materials_stock_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

CREATE TABLE IF NOT EXISTS public.midi_insights (
  id bigint NOT NULL DEFAULT nextval('midi_insights_id_seq'::regclass),
  type text NOT NULL CHECK (type = ANY (ARRAY['alert'::text, 'opportunity'::text, 'trend'::text, 'recommendation'::text])),
  category text NOT NULL CHECK (category = ANY (ARRAY['sales'::text, 'inventory'::text, 'customers'::text, 'financial'::text, 'operational'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  title text NOT NULL,
  description text NOT NULL,
  action_text text,
  action_link text,
  context jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'dismissed'::text, 'resolved'::text, 'expired'::text])),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_by text DEFAULT 'system'::text,
  dismissed_by text,
  CONSTRAINT midi_insights_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payment_fees (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['pix'::text, 'debito'::text, 'credito'::text])),
  card_brand text CHECK (card_brand = ANY (ARRAY['visa'::text, 'mastercard'::text, 'elo'::text])),
  installments integer,
  fee_percentage numeric NOT NULL CHECK (fee_percentage >= 0::numeric),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_fees_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  supplier_id bigint,
  value numeric NOT NULL,
  date date NOT NULL,
  payment_method text NOT NULL,
  pieces integer,
  parcelas integer,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  spent_by text DEFAULT 'loja'::text CHECK (spent_by = ANY (ARRAY['loja'::text, 'augusto'::text, 'thais'::text])),
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

CREATE TABLE IF NOT EXISTS public.settings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  setting_key text NOT NULL UNIQUE,
  value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.site_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by text,
  hero_logo text,
  how_it_works_section_image text,
  step_1_image text,
  step_2_image text,
  step_3_image text,
  step_4_image text,
  about_hero_image text,
  CONSTRAINT site_images_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id bigint NOT NULL,
  from_status text,
  to_status text NOT NULL,
  movement_type text NOT NULL CHECK (movement_type = ANY (ARRAY['entrada'::text, 'saida_malinha'::text, 'retorno_malinha'::text, 'venda'::text, 'ajuste'::text, 'quarentena'::text])),
  quantity integer DEFAULT 1,
  notes text,
  malinha_id bigint,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
  CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
`

console.log('📋 Criando schema...')
try {
  await client.query(schema)
  console.log('✅ Schema criado com sucesso!')
} catch (e) {
  console.error('❌ Erro no schema:', e.message)
}

// Verificar tabelas criadas
const { rows } = await client.query(`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`)
console.log(`\n📊 Tabelas no Railway (${rows.length} total):`)
rows.forEach(r => console.log(`  - ${r.tablename}`))

await client.end()
console.log('\n✅ Fase 2 concluída!')
