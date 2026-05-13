import { pool } from './db.js'

async function migrate() {
    console.log('Starting migration for returns and store credit...')
    try {
        await pool.query(`
            -- Adiciona store_credit aos clientes (Haver)
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_credit NUMERIC(10, 2) DEFAULT 0;

            -- Cria a tabela de devoluções (Returns)
            CREATE TABLE IF NOT EXISTS returns (
                id SERIAL PRIMARY KEY,
                original_venda_id BIGINT REFERENCES vendas(id) ON DELETE SET NULL,
                customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
                items JSONB NOT NULL,
                total_value NUMERIC(10, 2) NOT NULL,
                return_type VARCHAR(50) NOT NULL DEFAULT 'credit', -- 'credit' (Haver) or 'refund' (Estorno)
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Cria índices para a tabela returns
            CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
            CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
        `)
        console.log('✅ Migration successful')
    } catch (err) {
        console.error('❌ Migration failed:', err)
    } finally {
        process.exit()
    }
}

migrate()
