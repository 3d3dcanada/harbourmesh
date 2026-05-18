CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  user_agent TEXT,
  category TEXT NOT NULL DEFAULT 'bug',
  message TEXT NOT NULL,
  page TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
