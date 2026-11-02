-- Migración 002: categorías (relación 1:N con posts)
CREATE TABLE categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE posts ADD COLUMN category_id INTEGER REFERENCES categories(id);
