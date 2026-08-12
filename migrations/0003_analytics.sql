-- Optional Cloudflare Web Analytics beacon token (set in admin CMS)
INSERT OR IGNORE INTO site_copy (key, value, updated_at) VALUES
  ('cf_beacon_token', '', datetime('now'));
