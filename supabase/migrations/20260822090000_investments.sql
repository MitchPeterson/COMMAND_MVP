-- What the household actually holds, and how it is taxed.
--
-- finance_accounts already carries balances, which is enough to total a net
-- worth and not enough to say anything about investments. Two things are
-- missing:
--
--   1. Holdings. Without them there is no allocation, and allocation is the
--      whole point of an investments view.
--   2. Tax treatment. A 401(k) and a Roth IRA are both account_type
--      'retirement' and are taxed in opposite directions, so the column that
--      distinguishes them has to exist rather than be guessed from a name.
--
-- Deliberately absent: prices, returns, and anything that would let Command
-- project a future value. It has no market data feed, so every figure here is
-- what was last recorded, and as_of says when. A holdings table that silently
-- goes stale is worse than no holdings table.
--
-- Additive and idempotent.

ALTER TABLE finance_accounts
  ADD COLUMN IF NOT EXISTS tax_treatment TEXT
    CHECK (tax_treatment IN ('taxable', 'tax_deferred', 'tax_free', 'hsa', 'education'));

COMMENT ON COLUMN finance_accounts.tax_treatment IS
  'How withdrawals are taxed. Null means Command infers it from the account type and name, and says that it inferred it.';

CREATE TABLE IF NOT EXISTS investment_holdings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  account_id   UUID REFERENCES finance_accounts(id) ON DELETE CASCADE NOT NULL,
  symbol       TEXT,
  name         TEXT NOT NULL,
  asset_class  TEXT NOT NULL DEFAULT 'other'
    CHECK (asset_class IN ('us_equity', 'intl_equity', 'bonds', 'cash', 'real_assets', 'crypto', 'other')),
  -- True for a single company rather than a fund. Concentration is a fact
  -- about one of these, never about a diversified holding.
  is_single_security BOOLEAN NOT NULL DEFAULT FALSE,
  units        NUMERIC,
  value        NUMERIC,
  cost_basis   NUMERIC,
  as_of        DATE,
  entry_source TEXT NOT NULL DEFAULT 'manual',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS investment_holdings_household_idx
  ON investment_holdings (household_id, account_id);

ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members only" ON investment_holdings;
CREATE POLICY "Household members only" ON investment_holdings
  FOR ALL USING (household_owner(household_id))
  WITH CHECK (household_owner(household_id));

COMMENT ON TABLE investment_holdings IS
  'Positions inside an investment account. Values are as last recorded, not marked to market: Command has no price feed.';
