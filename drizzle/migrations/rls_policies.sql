-- Migration script enforcing Row Level Security (RLS) policies for users, requirements, and bids.

-- 1. Enable Row Level Security (RLS) on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflict during rerun/updates
DROP POLICY IF EXISTS select_users ON users;
DROP POLICY IF EXISTS mutate_users ON users;
DROP POLICY IF EXISTS select_requirements ON requirements;
DROP POLICY IF EXISTS mutate_requirements ON requirements;
DROP POLICY IF EXISTS select_bids ON bids;
DROP POLICY IF EXISTS mutate_bids ON bids;

-- =========================================================================
-- USERS TABLE POLICIES
-- =========================================================================

-- SELECT: Allow anyone (or authenticated users) to view public user profile info
CREATE POLICY select_users ON users
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Allow only the user whose id matches the authenticated session
CREATE POLICY mutate_users ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =========================================================================
-- REQUIREMENTS TABLE POLICIES
-- =========================================================================

-- SELECT: Anyone can view public requirements
CREATE POLICY select_requirements ON requirements
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE: Allow mutation only if the buyer_id matches the authenticated session
CREATE POLICY mutate_requirements ON requirements
  FOR ALL
  TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- =========================================================================
-- BIDS TABLE POLICIES
-- =========================================================================

-- SELECT: Users can only view bids they placed (provider_id matches session)
-- Or if they are the buyer who posted the requirement linked to the bid
CREATE POLICY select_bids ON bids
  FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM requirements
      WHERE requirements.id = bids.requirement_id
      AND requirements.buyer_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Allow mutation only if provider_id matches the authenticated session
CREATE POLICY mutate_bids ON bids
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- =========================================================================
-- COMPLIANCE VAULT TABLE POLICIES
-- =========================================================================

-- Enable Row Level Security (RLS) on compliance_vault table
ALTER TABLE compliance_vault ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS select_compliance_vault ON compliance_vault;
DROP POLICY IF EXISTS mutate_compliance_vault ON compliance_vault;

-- SELECT: Only the owner can select their vault record
CREATE POLICY select_compliance_vault ON compliance_vault
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- MUTATE: Only the owner can insert, update or delete their vault record
CREATE POLICY mutate_compliance_vault ON compliance_vault
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
