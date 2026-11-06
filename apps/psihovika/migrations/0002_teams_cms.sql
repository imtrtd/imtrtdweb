-- Teams, shared content overrides, and collaboration notes for ПсихоВика CMS.

create table if not exists teams (
  id text primary key,
  name text not null,
  invite_code text not null unique,
  created_by text not null,
  created_at timestamptz default CURRENT_TIMESTAMP not null
);

create table if not exists team_members (
  team_id text not null references teams (id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz default CURRENT_TIMESTAMP not null,
  primary key (team_id, user_id)
);

create index if not exists team_members_user_id_idx on team_members (user_id);

create table if not exists content_overrides (
  id text primary key,
  team_id text not null references teams (id) on delete cascade,
  method_id text not null,
  title text,
  lead text,
  source text,
  warn text,
  notes text,
  updated_by text not null,
  updated_at timestamptz default CURRENT_TIMESTAMP not null,
  unique (team_id, method_id)
);

create index if not exists content_overrides_team_idx on content_overrides (team_id);

create table if not exists team_notes (
  id text primary key,
  team_id text not null references teams (id) on delete cascade,
  method_id text,
  body text not null,
  author_id text not null,
  author_name text,
  created_at timestamptz default CURRENT_TIMESTAMP not null
);

create index if not exists team_notes_team_idx on team_notes (team_id, created_at desc);
