-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Challenges: bisa dibaca oleh semua (anon juga)
CREATE POLICY "challenges_read_all"
  ON challenges FOR SELECT
  USING (is_active = TRUE);

-- Categories: bisa dibaca oleh semua
CREATE POLICY "categories_read_all"
  ON categories FOR SELECT
  USING (TRUE);

-- Users: hanya bisa baca data sendiri (untuk nanti web)
CREATE POLICY "users_read_own"
  ON users FOR SELECT
  USING (discord_id = current_setting('app.discord_id', TRUE));

-- Submissions: bisa baca milik sendiri
CREATE POLICY "submissions_read_own"
  ON submissions FOR SELECT
  USING (
    user_id = (
      SELECT id FROM users
      WHERE discord_id = current_setting('app.discord_id', TRUE)
    )
  );
