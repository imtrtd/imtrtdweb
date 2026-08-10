-- Phase 4: follow-up fields on leads
ALTER TABLE leads ADD COLUMN next_step TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN brief_url TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN reminded_at TEXT;
