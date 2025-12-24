-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coupons (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'cost_price'::text])),
  discount_value numeric NOT NULL,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_special boolean DEFAULT false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  min_purchase numeric,
  description text,
  CONSTRAINT coupons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customers (
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
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fixed_expenses (
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
CREATE TABLE public.materials_stock (
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
CREATE TABLE public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  product_id bigint,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_time numeric NOT NULL,
  size_selected text,
  cost_price_at_time numeric,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.orders (
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
CREATE TABLE public.payment_fees (
  id bigint NOT NULL DEFAULT nextval('payment_fees_id_seq'::regclass),
  payment_method text NOT NULL,
  card_brand text,
  fee_percentage numeric NOT NULL DEFAULT 0,
  fee_fixed numeric DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_fees_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  price numeric,
  cost_price numeric,
  description text,
  stock integer,
  sizes jsonb,
  images ARRAY,
  category text,
  is_featured boolean,
  active boolean,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  supplier_id bigint,
  color text,
  variants jsonb DEFAULT '[]'::jsonb,
  is_new boolean DEFAULT true,
  original_price numeric,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.purchases (
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
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.settings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  setting_key text NOT NULL UNIQUE,
  value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.suppliers (
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
CREATE TABLE public.vendas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  customer_id bigint,
  total_value numeric NOT NULL,
  cost_price numeric,
  items jsonb,
  payment_method text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  card_brand text,
  fee_percentage numeric DEFAULT 0,
  fee_amount numeric DEFAULT 0,
  net_amount numeric,
  CONSTRAINT vendas_pkey PRIMARY KEY (id),
  CONSTRAINT vendas_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT vendas_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);