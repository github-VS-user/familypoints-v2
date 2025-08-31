-- Create family members table
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create points transactions table
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('daily_award', 'rule_broken', 'bonus_activity', 'school_reward', 'school_penalty')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily progress table
CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_points_awarded BOOLEAN DEFAULT FALSE,
  rules_broken JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, date)
);

-- Insert initial family members
INSERT INTO family_members (name) VALUES ('Dario'), ('Linda') ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - in production you'd want proper user-based policies)
CREATE POLICY "Allow all operations on family_members" ON family_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on points_transactions" ON points_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on daily_progress" ON daily_progress FOR ALL USING (true);
