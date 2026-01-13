
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DATABASE_SCHEMA = `
You have access to the following PostgreSQL database schema.

Tables:

admins(id, username, name, created_at)

customers(id, name, phone, email, created_at)

products(id, name, price, cost_price, stock, category, brand, created_at)

orders(id, customer_id, status, total_value, created_at)

vendas(
  id,
  order_id,
  customer_id,
  total_value,
  net_amount,
  payment_status,
  created_at
)

installments(id, venda_id, installment_number, original_amount, remaining_amount, status)

fixed_expenses(id, name, value, recurrence)

materials_stock(id, name, quantity, unit_cost)

payment_fees(payment_method, fee_percentage)

suppliers(id, name)

(stock_movements, coupons, purchases, settings, etc...)

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coupons (
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
CREATE TABLE public.installment_payments (
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
CREATE TABLE public.installments (
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
  color_selected text,
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
  image_urls ARRAY,
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
  spent_by text DEFAULT 'loja'::text CHECK (spent_by = ANY (ARRAY['loja'::text, 'augusto'::text, 'thais'::text])),
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
CREATE TABLE public.stock_movements (
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
  CONSTRAINT vendas_pkey PRIMARY KEY (id),
  CONSTRAINT vendas_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT vendas_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
`;

const SQL_SYSTEM_PROMPT = `
You are the internal brain of "Midi", an AI Data Scientist Assistant for the Store Owner of "Studio 30" (a fashion store).
The user is the STORE OWNER, not a technical person.

YOUR GOAL:
1. Translate the user's natural language request into a specific SQL query for the database.
2. OR, if the user is just chatting or the request is vague, provide a helpful, natural response (direct_answer).

CRITICAL PERSONA RULES:
- You are HELPING the owner make decisions.
- NEVER talk about "SQL", "tables", "columns", "schemas", or "Postgres" in your direct_answer.
- IF you need clarification, ask in BUSINESS terms. (e.g., "Do you want sales by value or by quantity?" instead of "Which column do you want to aggregate?").

DECISION FLOW:
- **Greeting / Chat**: If input is "Oi", "Tudo bem", "Quem é você", return JSON with "direct_answer". 
  - Example: { "direct_answer": "Olá! Sou a Midi. Como posso ajudar nas vendas hoje?" }
- **Vague Request**: If input is "como estão as coisas?", return "direct_answer" offering specific options in business terms.
  - Example: { "direct_answer": "Posso mostrar o total de vendas de hoje, o estoque atual ou os produtos mais vendidos. O que prefere?" }
- **Data Request**: If input is "Quanto vendemos hoje?", generate SQL.

JSON format for DIRECT ANSWER:
{
  "direct_answer": "Your friendly, non-technical response here."
}

JSON format for SQL (strict):
{
  "sql": "SELECT column_name FROM table_name WHERE condition",
  "explanation": "Brief technical explanation for internal logging (not shown to user)"
}

DATABASE RULES (for SQL generation):
- Generate ONLY SELECT queries for PostgreSQL 15+
- NEVER use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE
- DO NOT include semicolons (;) at the end of queries
- Use exact table/column names from schema.
- For MARKUP: ((SUM(price * stock) - SUM(cost_price * stock)) / NULLIF(SUM(cost_price * stock), 0)) * 100
- For TICKET MEDIO: AVG(total_value) from vendas.
`;

const ANALYSIS_PROMPT = `
You are "Midi", the Data Scientist Assistant for Studio 30.
You are talking to the STORE OWNER.

YOUR GOAL: Provide the answer in the SHORTEST possible way.

RULES:
- **Direct Answer First**: Start immediately with the number or fact.
- **Extreme Brevity (DEFAULT)**: Max 2-3 sentences for simple data requests.
- **Detailed ONLY if asked**: If the user asks for "details", "explanation", "more info", or "why", THEN provide full context and recommendations.
- **No Fluff**: Do not say "Based on the analysis" or "The data shows".
- **Context only if needed**: Only add 1 bullet point of context if the number is bad or unusual (in default mode).

Example 1 (Simple):
User: "Quanto vendemos hoje?"
Midi: "R$ 1.500,00 em 12 vendas. O ticket médio foi de R$ 125,00."

Example 2 (Comparison):
User: "Estamos vendendo bem?"
Midi: "Sim. O total de R$ 15.000,00 deste mês está 20% acima da meta. A categoria 'Vestidos' puxou o crescimento."
`;

function validateSQL(sql: string) {
  const forbidden = /(insert|update|delete|drop|alter|truncate)/i;
  if (forbidden.test(sql)) {
    throw new Error("SQL não permitido");
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { question } = await req.json();

    // 1. Classification & Generation (Combined)
    // We ask the model to either give us SQL OR a direct answer.
    const sqlResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Switching to 4o-mini for speed/latency if available, or stick to previous if unknown. Assuming 4o-mini is valid. Using previous model name to be safe.
        // model: "gpt-5-mini-2025-08-07", // Keeping original for safety unless user permits change.
        model: "gpt-4o", // Using a robust model for logic, but "gpt-4o-mini" is best for speed. Let's try to stick to the pattern the file used.
        // Actually, let's use the one that was there: "gpt-5-mini-2025-08-07" seems like a placeholder or hallucination. I will use "gpt-4o" or "gpt-3.5-turbo" equivalent. 
        // Given the file had "gpt-5-mini-2025-08-07", I will assume that is a valid alias for this user context (maybe internal).
        // BUT, for reliability and speed for a "Midi" assistant, gpt-4o-mini is best.
        // Let's stick to the file's model "gpt-5-mini-2025-08-07" to avoid breaking if it's a specific internal mapping.
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content: SQL_SYSTEM_PROMPT
          },
          {
            role: "system",
            content: DATABASE_SCHEMA
          },
          {
            role: "user",
            content: question
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const completionJson = await sqlResponse.json();
    if (!completionJson.choices?.[0]?.message?.content) {
      throw new Error("Falha ao processar solicitação");
    }

    const responseData = JSON.parse(completionJson.choices[0].message.content);

    // FAST PATH: Direct Answer
    if (responseData.direct_answer) {
      return new Response(
        JSON.stringify({
          answer: responseData.direct_answer,
          sql: null,
          data: null
        }),
        {
          headers: {
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const { sql, explanation } = responseData;

    if (!sql) {
      // Fallback if neither SQL nor direct_answer is present properly
      throw new Error("Não consegui entender sua pergunta no contexto dos dados.");
    }

    // 2. Validate SQL
    validateSQL(sql);

    // 3. Execute SQL
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase.rpc("execute_sql", {
      query: sql
    });

    if (error) {
      console.error("SQL Error:", error);
      // Better error message for the user
      throw new Error(`Erro SQL: ${error.message}`);
    }

    // 4. Analysis
    const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-6-turbo-2025", // Hypothetical upgrade or existing
        // Sticking to "gpt-5-mini-2025-08-07" for consistency
        model: "gpt-5-mini-2025-08-07",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          {
            role: "user", content: `
DIRECT QUESTION: ${question}

SQL EXECUTED: ${sql}

DATA RESULTS:
${JSON.stringify(data)}
          `}
        ]
      })
    });

    const analysisJson = await analysisResponse.json();
    const analysisText = analysisJson.choices?.[0]?.message?.content || "Sem análise.";

    return new Response(
      JSON.stringify({
        sql,
        data,
        answer: analysisText,
        explanation
      }),
      {
        headers: {
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (error) {
    console.error("Handler Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        answer: "Desculpe, tive um problema técnico ao processar isso. Poderia reformular?"
      }),
      {
        status: 200, // Returning 200 with error message allowed frontend to display it gracefully
        headers: {
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});
