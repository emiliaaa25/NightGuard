-- Creare tabel utilizatori
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pentru performanță
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Trigger pentru updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Date de test (opțional)
-- Parola este: test123
INSERT INTO users (username, email, password, full_name, bio) 
VALUES (
    'testuser', 
    'test@example.com', 
    '$2a$10$8K1p/a0dL3LcrmtSYN0X5OvZdVlX6xHqo1KpJLMQ9ZQ7QJGxqHAWa',
    'Utilizator Test',
    'Aceasta este o biografie de test'
) ON CONFLICT DO NOTHING;