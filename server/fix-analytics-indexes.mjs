import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:lkFzFRvxtPZHhwtxIKxPlqtLsFLaxtAk@maglev.proxy.rlwy.net:18204/railway',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Creating optimized indexes for analytics...");
        
        // 1. Index for abandoned_carts (critical for checking active sessions)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session_checkout 
            ON abandoned_carts (session_id, checkout_completed);
        `);
        console.log("✅ Created idx_abandoned_carts_session_checkout");

        // 2. Index for querying product_id inside event_data JSONB (for Top products viewed & added to cart)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_events_product_id 
            ON analytics_events (((event_data->>'product_id')::int));
        `);
        console.log("✅ Created idx_analytics_events_product_id (for JSONB product_id)");

        // 3. Composite Index for event_type and time (very common in summaries)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time 
            ON analytics_events (event_type, created_at);
        `);
        console.log("✅ Created idx_analytics_events_type_time");

        // 4. Index for Session IDs inside events (used by distinct queries)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_events_session 
            ON analytics_events (session_id);
        `);
        console.log("✅ Created idx_analytics_events_session");

        console.log("🎉 All DB Analytics optimizations applied successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error applying indexes:", err);
        process.exit(1);
    }
}

run();
