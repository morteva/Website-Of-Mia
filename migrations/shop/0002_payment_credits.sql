CREATE TABLE IF NOT EXISTS order_payment_credits (
 reference_id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id),
 amount_micros INTEGER NOT NULL CHECK(amount_micros >= 0)
);
CREATE INDEX IF NOT EXISTS order_payment_credits_order ON order_payment_credits(order_id);
