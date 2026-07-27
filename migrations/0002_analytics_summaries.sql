CREATE TABLE IF NOT EXISTS analytics_summaries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  period_label TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  booking_clicks INTEGER NOT NULL DEFAULT 0,
  line_clicks INTEGER NOT NULL DEFAULT 0,
  menu_views INTEGER NOT NULL DEFAULT 0,
  booking_rate REAL NOT NULL DEFAULT 0,
  line_rate REAL NOT NULL DEFAULT 0,
  menu_rate REAL NOT NULL DEFAULT 0,
  next_action TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_analytics_summaries_created_at
  ON analytics_summaries (created_at DESC);
