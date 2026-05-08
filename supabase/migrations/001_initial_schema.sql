-- ============================================================
-- EXTENSION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE submission_status AS ENUM ('passed', 'failed', 'error', 'timeout', 'pending');
CREATE TYPE badge_trigger AS ENUM (
  'first_solve',
  'streak_7',
  'streak_30',
  'hard_first_solve',
  'speedster',
  'polyglot',
  'top10_server'
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id      VARCHAR(20) UNIQUE NOT NULL,
  username        VARCHAR(100) NOT NULL,
  discriminator   VARCHAR(10),
  avatar_url      TEXT,
  xp              INTEGER NOT NULL DEFAULT 0,
  level           SMALLINT NOT NULL DEFAULT 1,
  streak_current  SMALLINT NOT NULL DEFAULT 0,
  streak_longest  SMALLINT NOT NULL DEFAULT 0,
  streak_freeze   SMALLINT NOT NULL DEFAULT 1,
  last_solved_at  DATE,
  dm_reminder     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_xp ON users(xp DESC);

-- ============================================================
-- TABLE: guilds
-- ============================================================
CREATE TABLE guilds (
  guild_id            VARCHAR(20) PRIMARY KEY,
  guild_name          VARCHAR(100),
  challenge_channel   VARCHAR(20),
  daily_channel       VARCHAR(20),
  daily_time          TIME NOT NULL DEFAULT '08:00:00',
  timezone            VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  prefix              VARCHAR(5) DEFAULT '/',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon        VARCHAR(10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: challenges
-- ============================================================
CREATE TABLE challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                VARCHAR(100) UNIQUE NOT NULL,
  title               VARCHAR(200) NOT NULL,
  difficulty          difficulty_level NOT NULL,
  xp_reward           SMALLINT NOT NULL,
  description         TEXT NOT NULL,
  constraints         TEXT,
  examples            JSONB NOT NULL DEFAULT '[]',
  function_signatures JSONB NOT NULL DEFAULT '{}',
  test_cases_public   JSONB NOT NULL DEFAULT '[]',
  test_cases_hidden   JSONB NOT NULL DEFAULT '[]',
  hints               JSONB NOT NULL DEFAULT '[]',
  tags                TEXT[] DEFAULT '{}',
  supported_languages TEXT[] NOT NULL DEFAULT '{python,javascript}',
  time_limit_ms       INTEGER NOT NULL DEFAULT 5000,
  memory_limit_mb     INTEGER NOT NULL DEFAULT 256,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_daily_eligible   BOOLEAN NOT NULL DEFAULT TRUE,
  total_attempts      INTEGER NOT NULL DEFAULT 0,
  total_solves        INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_challenges_active ON challenges(is_active);
CREATE INDEX idx_challenges_daily ON challenges(is_daily_eligible, is_active);

-- ============================================================
-- TABLE: challenge_categories (many-to-many)
-- ============================================================
CREATE TABLE challenge_categories (
  challenge_id  UUID REFERENCES challenges(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (challenge_id, category_id)
);

-- ============================================================
-- TABLE: submissions
-- ============================================================
CREATE TABLE submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  guild_id        VARCHAR(20) REFERENCES guilds(guild_id),
  language        VARCHAR(30) NOT NULL,
  code            TEXT NOT NULL,
  status          submission_status NOT NULL DEFAULT 'pending',
  test_passed     SMALLINT,
  test_total      SMALLINT,
  runtime_ms      INTEGER,
  memory_kb       INTEGER,
  error_message   TEXT,
  xp_earned       SMALLINT NOT NULL DEFAULT 0,
  is_first_solve  BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_user    ON submissions(user_id, submitted_at DESC);
CREATE INDEX idx_submissions_challenge ON submissions(challenge_id);
CREATE INDEX idx_submissions_guild   ON submissions(guild_id, submitted_at DESC);
CREATE INDEX idx_submissions_status  ON submissions(user_id, challenge_id, status);

-- ============================================================
-- TABLE: daily_challenges
-- ============================================================
CREATE TABLE daily_challenges (
  id            SERIAL PRIMARY KEY,
  guild_id      VARCHAR(20) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  challenge_id  UUID NOT NULL REFERENCES challenges(id),
  scheduled_for DATE NOT NULL,
  message_id    VARCHAR(20),
  posted_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guild_id, scheduled_for)
);

CREATE INDEX idx_daily_guild_date ON daily_challenges(guild_id, scheduled_for DESC);

-- ============================================================
-- TABLE: user_badges
-- ============================================================
CREATE TABLE user_badges (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key   badge_trigger NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_key)
);

CREATE INDEX idx_badges_user ON user_badges(user_id);

-- ============================================================
-- TABLE: leaderboard_snapshots
-- ============================================================
CREATE TABLE leaderboard_snapshots (
  id          SERIAL PRIMARY KEY,
  guild_id    VARCHAR(20) NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period      VARCHAR(20) NOT NULL,
  data        JSONB NOT NULL
);

CREATE INDEX idx_snapshot_guild_period ON leaderboard_snapshots(guild_id, period, snapshot_at DESC);

-- ============================================================
-- FUNCTION: update_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_guilds_updated_at
  BEFORE UPDATE ON guilds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
