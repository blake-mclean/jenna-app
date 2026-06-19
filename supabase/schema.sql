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
  INSERT INTO public.profiles  (id)      VALUES (NEW.id);
  INSERT INTO public.user_data (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Edge Function secrets (set via Supabase CLI, not SQL) ──────────────────────
-- supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
-- supabase functions deploy ride-recap
-- supabase functions deploy weekly-reflection

-- ─── Sport migration (run once on existing databases) ─────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_sport TEXT NOT NULL DEFAULT 'cycling';

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS sport TEXT NOT NULL DEFAULT 'cycling';

ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS running_achievements    JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS running_challenges      JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS running_unlocked_badges JSONB NOT NULL DEFAULT '[]';

-- ─── Security hardening migration (run once on existing databases) ────────────

-- Make WITH CHECK explicit on all RLS policies (previously implicit via FOR ALL)
DROP POLICY IF EXISTS "own profile"   ON profiles;
DROP POLICY IF EXISTS "own rides"     ON rides;
DROP POLICY IF EXISTS "own user_data" ON user_data;

CREATE POLICY "own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "own rides" ON rides
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own user_data" ON user_data
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rate-limit log for Edge Function call throttling (50 calls/user/hour)
CREATE TABLE IF NOT EXISTS ai_call_log (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  called_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_call_log ENABLE ROW LEVEL SECURITY;

-- SELECT-only: clients can read their own usage; INSERT/UPDATE/DELETE
-- are handled exclusively by the check_and_log_ai_call SECURITY DEFINER
-- function (called by Edge Functions via the admin client). Granting
-- DELETE here would let a user wipe their own log and bypass the rate limit.
CREATE POLICY "own call log - read only" ON ai_call_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_call_log_user_time
  ON ai_call_log (user_id, called_at DESC);

-- ─── Mood column migration (run once) ────────────────────────────────────────
ALTER TABLE rides ADD COLUMN IF NOT EXISTS mood INTEGER;

-- ─── XP and Garage migration (run once) ──────────────────────────────────────
ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS cycling_xp              INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycling_total_xp_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycling_garage          JSONB,
  ADD COLUMN IF NOT EXISTS running_xp              INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS running_total_xp_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS running_garage          JSONB;

-- ─── Atomic rate-limit check (fixes TOCTOU race condition) ───────────────────
-- Acquires a per-user advisory lock so concurrent Edge Function invocations
-- serialize and cannot all pass the count check simultaneously.
-- Returns TRUE and inserts a log row if the user is under the limit,
-- or returns FALSE (no insert) if the limit is reached.
CREATE OR REPLACE FUNCTION check_and_log_ai_call(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Transaction-scoped advisory lock keyed to this user ID.
  -- Serializes concurrent calls for the same user within this transaction.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT COUNT(*) INTO v_count
  FROM public.ai_call_log
  WHERE user_id = p_user_id
    AND called_at >= NOW() - INTERVAL '1 hour';

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_call_log (user_id) VALUES (p_user_id);
  RETURN TRUE;
END;
$$;
