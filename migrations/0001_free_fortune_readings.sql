CREATE TABLE IF NOT EXISTS free_fortune_readings (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  theme TEXT NOT NULL,
  situation TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL DEFAULT '',
  result_title TEXT NOT NULL,
  result_card TEXT NOT NULL,
  result_reading TEXT NOT NULL,
  result_advice TEXT NOT NULL,
  result_next_step TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_free_fortune_readings_created_at
  ON free_fortune_readings (created_at DESC);
