-- Site-wide content overrides for the public catalog editor (/editor).
-- Team-scoped CMS stays in content_overrides (0002); this table feeds the live site.

create table if not exists site_content (
  method_id text primary key,
  title text,
  lead text,
  source text,
  warn text,
  notes text,
  updated_by text not null,
  updated_at timestamptz default CURRENT_TIMESTAMP not null
);

create index if not exists site_content_updated_at_idx on site_content (updated_at desc);
