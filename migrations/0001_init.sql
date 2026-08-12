-- Studio CMS + leads schema
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  note TEXT NOT NULL DEFAULT '',
  first_response_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_copy (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seed: site copy
INSERT OR IGNORE INTO site_copy (key, value, updated_at) VALUES
  ('brand', 'I''m Trying To Design', datetime('now')),
  ('headline', 'Дизайн, который держит продукт вместе', datetime('now')),
  ('subhead', 'Студия цифрового дизайна: брендинг, интерфейсы и визуальные системы для команд, которым нужен ясный результат.', datetime('now')),
  ('cta_label', 'Оставить заявку', datetime('now')),
  ('contact_email', 'hello@imtryingtodesign.com', datetime('now')),
  ('contact_telegram', '@imtrtd', datetime('now'));

-- Seed: services
INSERT OR IGNORE INTO services (id, title, description, sort_order, published, created_at, updated_at) VALUES
  ('svc-brand', 'Брендинг', 'Идентичность, голос и визуальная система, с которой продукт узнаваем.', 1, 1, datetime('now'), datetime('now')),
  ('svc-product', 'Product UI', 'Интерфейсы продуктов и кабинетов: структура, состояния, аккуратная детализация.', 2, 1, datetime('now'), datetime('now')),
  ('svc-landing', 'Лендинги', 'Посадочные с ясным героем, одним CTA и сильной визуальной подачей.', 3, 1, datetime('now'), datetime('now')),
  ('svc-system', 'Дизайн-системы', 'Токены, компоненты и правила, чтобы команда масштабировалась без хаоса.', 4, 1, datetime('now'), datetime('now'));

-- Seed: cases
INSERT OR IGNORE INTO cases (id, title, role, result, image_url, sort_order, published, created_at, updated_at) VALUES
  ('case-north', 'Northline', 'Бренд + сайт', 'Собран визуальный язык и лендинг для B2B-платформы.', '', 1, 1, datetime('now'), datetime('now')),
  ('case-orbit', 'Orbit Pay', 'Product UI', 'Упрощён онбординг и ключевые экраны платежного кабинета.', '', 2, 1, datetime('now'), datetime('now')),
  ('case-atelier', 'Atelier 12', 'Брендинг', 'Идентичность для студии пространства и набор носителей.', '', 3, 1, datetime('now'), datetime('now')),
  ('case-signal', 'Signal Desk', 'Лендинг', 'Конверсионная посадочная для аналитического инструмента.', '', 4, 1, datetime('now'), datetime('now'));
