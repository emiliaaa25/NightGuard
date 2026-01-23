-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(255),
    
    is_guardian BOOLEAN DEFAULT FALSE,
    last_latitude NUMERIC,
    last_longitude NUMERIC,
    last_seen TIMESTAMP,
    role VARCHAR(50) DEFAULT 'USER', -- e.g., 'USER', 'ADMIN', 'SECURITY'
    phone VARCHAR(50),
    application_reason TEXT,
    experience TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    relation VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,           -- 'SOS', 'PANIC'
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    source VARCHAR(50) DEFAULT 'USER',   -- 'USER_APP'
    trigger_method VARCHAR(50),          -- 'BUTTON', 'SHAKE'
    audio_url TEXT,                      -- New column for audio recordings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. SAFETY REPORTS TABLE
CREATE TABLE IF NOT EXISTS safety_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    type VARCHAR(50), -- 'BROKEN_LIGHT', 'DANGEROUS_CROWD', 'SUSPICIOUS'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS route_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    start_lat DECIMAL(10, 8),
    start_lng DECIMAL(11, 8),
    destination_name VARCHAR(100), -- Ex: "Tudor Vladimirescu", "Corp A"
    departure_time TIMESTAMP,     
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'MATCHED', 'EXPIRED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routes_status ON route_posts(status);

CREATE TABLE IF NOT EXISTS buddy_messages (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES route_posts(id),
    sender_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_buddy_messages_route ON buddy_messages(route_id);

ALTER TABLE route_posts ADD COLUMN buddy_id INTEGER REFERENCES users(id);

-- 6. USER RATINGS (Trust System)
CREATE TABLE IF NOT EXISTS user_ratings (
    id SERIAL PRIMARY KEY,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    target_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stars SMALLINT CHECK (stars >= 1 AND stars <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_ratings_target ON user_ratings(target_id);