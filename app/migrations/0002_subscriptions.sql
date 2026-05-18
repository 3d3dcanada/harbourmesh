CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  started_at TEXT NOT NULL,
  expires_at TEXT,
  ko_fi_transaction_id TEXT,
  payment_method TEXT DEFAULT 'ko-fi',
  amount_cents INTEGER,
  currency TEXT DEFAULT 'CAD',
  status TEXT DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_kofi ON subscriptions(ko_fi_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
