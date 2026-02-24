import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/studio30'
});

async function run() {
    try {
        console.log("Testing summary aggregation...");
        const res = await pool.query(`
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT session_id) as unique_sessions,
                SUM(CASE WHEN event_type = 'catalog_view' THEN 1 ELSE 0 END) as catalog_views,
                SUM(CASE WHEN event_type = 'product_view' THEN 1 ELSE 0 END) as product_views,
                SUM(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) as add_to_cart,
                SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) as checkouts_started,
                SUM(CASE WHEN event_type = 'checkout_completed' THEN 1 ELSE 0 END) as checkouts_completed,
                SUM(CASE WHEN event_type = 'social_click_whatsapp' THEN 1 ELSE 0 END) as whatsapp_clicks,
                SUM(CASE WHEN event_type = 'social_click_instagram' THEN 1 ELSE 0 END) as instagram_clicks
            FROM analytics_events
        `);
        console.log("Summary:", res.rows[0]);

        console.log("Testing products viewed...");
        const res2 = await pool.query(`
            SELECT 
                (event_data->>'product_id')::int as id,
                MAX(event_data->>'product_name') as name,
                COUNT(*) as views
            FROM analytics_events
            WHERE event_type = 'product_view' AND event_data->>'product_id' IS NOT NULL
            GROUP BY (event_data->>'product_id')::int
            ORDER BY views DESC
            LIMIT 5
        `);
        console.log("Top Viewed:", res2.rows);

        console.log("Testing products added to cart...");
        const res3 = await pool.query(`
            SELECT 
                (event_data->>'product_id')::int as id,
                MAX(event_data->>'product_name') as name,
                MAX((event_data->>'product_price')::numeric) as price,
                COUNT(*) as count
            FROM analytics_events
            WHERE event_type = 'add_to_cart' AND event_data->>'product_id' IS NOT NULL
            GROUP BY (event_data->>'product_id')::int
            ORDER BY count DESC
            LIMIT 5
        `);
        console.log("Top Added:", res3.rows);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
