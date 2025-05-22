-- -- db/postgres/init.sql
-- -- Skrypt inicjalizacyjny dla PostgreSQL (dostosowany do Keycloak)

-- -- Tworzenie rozszerzeń
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "citext";

-- -- Funkcja aktualizująca pole updated_at
-- CREATE OR REPLACE FUNCTION update_modified_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- -- Tabela projektów
-- CREATE TABLE projects (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     description TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     created_by VARCHAR(36) NOT NULL, -- ID użytkownika z Keycloak (UUID)
--     is_archived BOOLEAN DEFAULT FALSE
-- );

-- -- Indeks dla wyszukiwania projektów
-- CREATE INDEX idx_projects_created_by ON projects(created_by);

-- -- Tabela członków projektu
-- CREATE TABLE project_members (
--     project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
--     user_id VARCHAR(36) NOT NULL, -- ID użytkownika z Keycloak (UUID)
--     role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
--     joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     PRIMARY KEY (project_id, user_id)
-- );

-- -- Indeks dla szybkiego wyszukiwania członków projektu
-- CREATE INDEX idx_project_members_user ON project_members(user_id);

-- -- Tabela kategorii
-- CREATE TABLE categories (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(50) NOT NULL,
--     description TEXT,
--     color VARCHAR(7) DEFAULT '#CCCCCC',
--     project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
--     created_by VARCHAR(36) NOT NULL, -- ID użytkownika z Keycloak (UUID)
--     UNIQUE (name, project_id)
-- );

-- -- Indeks dla wyszukiwania kategorii w obrębie projektu
-- CREATE INDEX idx_categories_project ON categories(project_id);

-- -- Tabela tagów
-- CREATE TABLE tags (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(30) NOT NULL,
--     color VARCHAR(7) DEFAULT '#CCCCCC',
--     project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
--     created_by VARCHAR(36) NOT NULL, -- ID użytkownika z Keycloak (UUID)
--     UNIQUE (name, project_id)
-- );

-- -- Indeks dla wyszukiwania tagów w obrębie projektu
-- CREATE INDEX idx_tags_project ON tags(project_id);

-- -- Tabela definicji zadań
-- CREATE TABLE tasks (
--     id SERIAL PRIMARY KEY,
--     title VARCHAR(255) NOT NULL,
--     description TEXT,
--     priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
--     status VARCHAR(20) NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
--     due_date TIMESTAMP,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     created_by VARCHAR(36) NOT NULL, -- ID użytkownika z Keycloak (UUID)
--     assigned_to VARCHAR(36), -- ID użytkownika z Keycloak (UUID)
--     project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
--     is_recurring BOOLEAN DEFAULT FALSE,
--     parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL
-- );

-- -- Indeksy dla wyszukiwania i filtrowania zadań
-- CREATE INDEX idx_tasks_project ON tasks(project_id);
-- CREATE INDEX idx_tasks_created_by ON tasks(created_by);
-- CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
-- CREATE INDEX idx_tasks_status ON tasks(status);
-- CREATE INDEX idx_tasks_priority ON tasks(priority);
-- CREATE INDEX idx_tasks_due_date ON tasks(due_date);
-- CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

-- -- Tabela powiązań zadań z kategoriami
-- CREATE TABLE task_categories (
--     task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
--     category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
--     PRIMARY KEY (task_id, category_id)
-- );

-- -- Indeks dla wyszukiwania kategorii zadania
-- CREATE INDEX idx_task_categories_category ON task_categories(category_id);

-- -- Tabela powiązań zadań z tagami
-- CREATE TABLE task_tags (
--     task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
--     tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
--     PRIMARY KEY (task_id, tag_id)
-- );

-- -- Indeks dla wyszukiwania tagów zadania
-- CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);

-- -- Tabela zadań cyklicznych
-- CREATE TABLE recurring_tasks (
--     id SERIAL PRIMARY KEY,
--     task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
--     recurrence_pattern VARCHAR(20) NOT NULL CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
--     recurrence_interval INTEGER NOT NULL DEFAULT 1,
--     start_date TIMESTAMP NOT NULL,
--     end_date TIMESTAMP,
--     days_of_week SMALLINT, -- bitmaska dla dni tygodnia (1-7)
--     day_of_month SMALLINT,
--     month_of_year SMALLINT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Indeks dla zadań cyklicznych
-- CREATE INDEX idx_recurring_tasks_task ON recurring_tasks(task_id);

-- -- Tabela udostępnień zadań
-- CREATE TABLE task_shares (
--     id SERIAL PRIMARY KEY,
--     task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
--     shared_by VARCHAR(36) NOT NULL, -- ID użytkownika z Keycloak (UUID)
--     shared_with VARCHAR(36) NOT NULL, -- ID użytkownika z Keycloak (UUID)
--     permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'edit', 'admin')),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Indeksy dla udostępnień
-- CREATE INDEX idx_task_shares_task ON task_shares(task_id);
-- CREATE INDEX idx_task_shares_shared_with ON task_shares(shared_with);

-- -- Triggery do aktualizacji pola updated_at
-- CREATE TRIGGER update_projects_modtime
--     BEFORE UPDATE ON projects
--     FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- CREATE TRIGGER update_tasks_modtime
--     BEFORE UPDATE ON tasks
--     FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- CREATE TRIGGER update_recurring_tasks_modtime
--     BEFORE UPDATE ON recurring_tasks
--     FOR EACH ROW EXECUTE FUNCTION update_modified_column();