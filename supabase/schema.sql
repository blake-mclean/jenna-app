-- JENNA App — Supabase schema
-- Run this in your Supabase project's SQL Editor

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT 'Cyclist',
  weekly_ride_goal  INTEGER NOT NULL DEFAULT 4,
  distance_unit     TEXT NOT NULL DEFAULT 'km',
  member_since      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  equipped_badge_id TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rides (
  id             TEXT PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           TIMESTAMPTZ NOT NULL,
  duration       INTEGER NOT NULL,
  distance       NUMERIC,
  calories       INTEGER,
  resistance     INTEGER,
  avg_heart_rate INTEGER,
  instructor     TEXT,
  notes          TEXT
);

CREATE TABLE user_data (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  achievements        JSONB NOT NULL DEFAULT '[]',
  challenges          JSONB NOT NULL DEFAULT '[]',
  unlocked_badges     JSONB NOT NULL DEFAULT '[]',
  notifications       JSONB NOT NULL DEFAULT '{}',
  has_seen_onboarding BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile"   ON profiles  FOR ALL USING (auth.uid() = id);
CREATE POLICY "own rides"     ON rides     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own user_data" ON user_data FOR ALL USING (auth.uid() = user_id);

-- ─── Auto-create rows on sign-up ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles  (id)      VALUES (NEW.id);
  INSERT INTO user_data (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
