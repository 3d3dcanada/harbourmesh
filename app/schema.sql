CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  roles TEXT NOT NULL DEFAULT '["user"]',
  status TEXT NOT NULL DEFAULT 'active',
  password_hash TEXT,
  password_salt TEXT,
  google_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email_normalized);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);
