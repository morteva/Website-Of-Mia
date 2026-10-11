CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 items_json TEXT NOT NULL,
 total_cents INTEGER NOT NULL CHECK(total_cents>0),
 reference_id TEXT UNIQUE,
 checkout_url TEXT,
 status TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 client_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_client_created ON orders(client_hash,created_at);
