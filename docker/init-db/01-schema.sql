-- ==============================================================================
-- NaviSecret Standalone Production Relational Database Schema (PostgreSQL 16)
-- Author & Owner: Ersin Sandal (SliferSoft)
-- Description: Clean, high-performance relational schema. No RLS complexity.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Profiles & Credentials
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    status_emoji VARCHAR(16) DEFAULT '👋',
    status_text VARCHAR(140) DEFAULT 'NaviSecret kullanıyor',
    status_expires_at TIMESTAMPTZ,
    is_casper BOOLEAN DEFAULT FALSE,
    casper_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Social Network & Friendships
CREATE TABLE IF NOT EXISTS friendships (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'accepted', -- 'pending', 'accepted', 'rejected', 'blocked'
    can_view_location BOOLEAN DEFAULT TRUE,
    share_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- 3. Settings & Notification Preferences
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    update_interval_sec INT DEFAULT 5,
    notifications_bumps BOOLEAN DEFAULT TRUE,
    notifications_reactions BOOLEAN DEFAULT TRUE,
    notifications_requests BOOLEAN DEFAULT TRUE,
    notifications_chat BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bookmarked / Saved Places (Favorites)
CREATE TABLE IF NOT EXISTS saved_places (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    place_type VARCHAR(50) DEFAULT 'other',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters REAL DEFAULT 100.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Social Groups & Group Membership
CREATE TABLE IF NOT EXISTS social_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    invite_code VARCHAR(16) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_group_members (
    group_id UUID NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(group_id, user_id)
);

-- 6. Chat Rooms, Members & Messages
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type VARCHAR(20) DEFAULT 'direct', -- 'direct', 'group'
    group_id UUID REFERENCES social_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Pulse Encounter History (⚡)
CREATE TABLE IF NOT EXISTS pulse_history (
    id BIGSERIAL PRIMARY KEY,
    initiator_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    peer_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    distance_meters REAL NOT NULL,
    pulsed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Secret Capsules (🎁)
CREATE TABLE IF NOT EXISTS secret_capsules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geohash VARCHAR(12) NOT NULL,
    title VARCHAR(120) NOT NULL,
    encrypted_payload TEXT NOT NULL,
    salt_entropy VARCHAR(64) NOT NULL,
    unlock_radius_m REAL DEFAULT 50.0,
    requires_passcode BOOLEAN DEFAULT FALSE,
    passcode_hint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Footprint Movement Breadcrumbs (👣)
CREATE TABLE IF NOT EXISTS footprint_points (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters REAL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. World Unveil Fog-of-War Discovery (🌍)
CREATE TABLE IF NOT EXISTS unveiled_territories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    cell_token VARCHAR(24) NOT NULL,
    visit_count INT DEFAULT 1,
    unveiled_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_territory UNIQUE (user_id, cell_token)
);

-- 11. Expressive Reactions
CREATE TABLE IF NOT EXISTS expressive_reactions (
    id BIGSERIAL PRIMARY KEY,
    from_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    emoji VARCHAR(16) NOT NULL,
    message VARCHAR(255),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning-fast lookups
CREATE INDEX IF NOT EXISTS idx_friendships_lookup ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_capsules_geohash ON secret_capsules(geohash);
CREATE INDEX IF NOT EXISTS idx_footprint_user ON footprint_points(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_unveil_user ON unveiled_territories(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_recipient ON expressive_reactions(to_user_id, sent_at DESC);
