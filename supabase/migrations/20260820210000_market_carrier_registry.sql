-- Carrier identity, so Command can join to public market data.
--
-- Everything published by the NAIC and filed through SERFF is keyed on NAIC
-- company and group codes. Command matched carriers by lowercasing a string
-- against a hand-written table, which is fine for deciding that Owners and
-- Auto-Owners are one insurer and useless for joining to anything external.
-- This gives a carrier a code.
--
-- Two things make these tables unlike every other table here:
--
--   1. They hold no household data. They are public reference data, the same
--      for every user, so they are readable by any signed-in account and are
--      not scoped by household_owner(). Nothing writes to them from the app —
--      rows arrive from an ingest run, so there is no insert or update policy
--      at all.
--   2. Every row carries its source, the period it describes and when it was
--      taken. A market figure with no date is a market figure that will be
--      wrong later and never say so.
--
-- Seeded from the NAIC 2025 Property/Casualty Market Share Report
-- (2025 data, published 2026), which is countrywide rather than by state. State
-- level share is not in the NAIC's free reports; Minnesota publishes its own
-- P&C summary and that is the next source. `scope` exists for exactly that —
-- 'countrywide' today, a state code later.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS market_carrier_groups (
  naic_group_code INT PRIMARY KEY,
  group_name      TEXT NOT NULL,
  source          TEXT NOT NULL,
  source_url      TEXT,
  data_year       INT,
  as_of           DATE NOT NULL DEFAULT CURRENT_DATE
);

COMMENT ON TABLE market_carrier_groups IS
  'Public reference data: NAIC group codes and names. Not household data.';

CREATE TABLE IF NOT EXISTS market_group_line_share (
  naic_group_code         INT NOT NULL REFERENCES market_carrier_groups(naic_group_code) ON DELETE CASCADE,
  line                    TEXT NOT NULL,
  -- 'countrywide' now; a two-letter state once state-level data is ingested.
  scope                   TEXT NOT NULL DEFAULT 'countrywide',
  data_year               INT NOT NULL,
  rank_in_scope           INT,
  direct_premiums_written BIGINT,
  market_share_pct        NUMERIC(6,3),
  source                  TEXT NOT NULL,
  source_url              TEXT,
  as_of                   DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (naic_group_code, line, scope, data_year)
);

CREATE INDEX IF NOT EXISTS market_group_line_share_lookup
  ON market_group_line_share (line, scope, data_year, market_share_pct DESC);

-- Read-only to every signed-in account, written only by an ingest run holding
-- the service role. No insert, update or delete policy exists on purpose.
ALTER TABLE market_carrier_groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_group_line_share  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Readable by any signed-in account" ON market_carrier_groups;
CREATE POLICY "Readable by any signed-in account" ON market_carrier_groups
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Readable by any signed-in account" ON market_group_line_share;
CREATE POLICY "Readable by any signed-in account" ON market_group_line_share
  FOR SELECT TO authenticated USING (true);

-- The code a policy resolves to, so the join is settled once at confirm time
-- rather than fuzzy-matched on every render.
ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS naic_group_code INT;
ALTER TABLE insurance_policy_extractions
  ADD COLUMN IF NOT EXISTS naic_group_code INT;

COMMENT ON COLUMN insurance_policies.naic_group_code IS
  'Resolved from the carrier name. Null when Command could not place the carrier.';

INSERT INTO market_carrier_groups (naic_group_code, group_name, source, source_url, data_year) VALUES
  (8, 'ALLSTATE INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (12, 'AMERICAN INTL GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (28, 'AMICA MUT GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (31, 'BERKSHIRE HATHAWAY GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (50, 'COUNTRY INS & FIN SERV GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (55, 'AUTOMOBILE CLUB MI GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (69, 'FARMERS INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (84, 'AMERICAN FINANCIAL GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (91, 'HARTFORD FIRE & CAS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (98, 'WR BERKLEY CORP GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (111, 'LIBERTY MUT GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (140, 'NATIONWIDE CORP GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (155, 'PROGRESSIVE GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (158, 'FAIRFAX FIN GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (176, 'STATE FARM GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (200, 'UNITED SERV AUTOMOBILE ASSN GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (212, 'ZURICH INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (213, 'ERIE INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (218, 'CNA INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (244, 'CINCINNATI FIN GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (280, 'AUTO OWNERS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (473, 'AMERICAN FAMILY INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (626, 'CHUBB LTD GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (660, 'MERCURY GEN GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (785, 'MARKEL GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (968, 'AXA INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (1278, 'CSAA INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (1318, 'AUTO CLUB ENTERPRISES INS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (3098, 'TOKIO MARINE HOLDINGS INC GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (3548, 'TRAVELERS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (4663, 'UNIVERSAL INS HOLDING GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (4769, 'FLORIDA PENINSULA HOLDINGS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025),
  (5101, 'SLIDE INS HOLDINGS GRP', 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf', 2025)
ON CONFLICT (naic_group_code) DO UPDATE SET group_name = EXCLUDED.group_name, as_of = CURRENT_DATE;

INSERT INTO market_group_line_share
  (naic_group_code, line, scope, data_year, rank_in_scope, direct_premiums_written, market_share_pct, source, source_url) VALUES
  (176, 'all_lines', 'countrywide', 2025, 1, 115280669888, 10.39, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (155, 'all_lines', 'countrywide', 2025, 2, 84195656188, 7.59, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (31, 'all_lines', 'countrywide', 2025, 3, 64514367675, 5.81, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (8, 'all_lines', 'countrywide', 2025, 4, 59467366225, 5.36, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (3548, 'all_lines', 'countrywide', 2025, 5, 43181564023, 3.89, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (111, 'all_lines', 'countrywide', 2025, 6, 42346467572, 3.82, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (200, 'all_lines', 'countrywide', 2025, 7, 38543461363, 3.47, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (626, 'all_lines', 'countrywide', 2025, 8, 35271237741, 3.18, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (69, 'all_lines', 'countrywide', 2025, 9, 29586855033, 2.67, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (212, 'all_lines', 'countrywide', 2025, 10, 18896036175, 1.7, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (91, 'all_lines', 'countrywide', 2025, 11, 18680161128, 1.68, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (473, 'all_lines', 'countrywide', 2025, 12, 17949597132, 1.62, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (280, 'all_lines', 'countrywide', 2025, 13, 17030268289, 1.53, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (140, 'all_lines', 'countrywide', 2025, 14, 16701689240, 1.5, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (12, 'all_lines', 'countrywide', 2025, 15, 16464312898, 1.48, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (218, 'all_lines', 'countrywide', 2025, 16, 14528123717, 1.31, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (3098, 'all_lines', 'countrywide', 2025, 17, 13369698827, 1.2, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (213, 'all_lines', 'countrywide', 2025, 18, 12957320370, 1.17, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (158, 'all_lines', 'countrywide', 2025, 19, 12228673916, 1.1, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (98, 'all_lines', 'countrywide', 2025, 20, 11626140954, 1.05, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (84, 'all_lines', 'countrywide', 2025, 21, 10150767271, 0.91, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (785, 'all_lines', 'countrywide', 2025, 22, 9735516420, 0.88, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (244, 'all_lines', 'countrywide', 2025, 23, 9511386782, 0.86, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (1318, 'all_lines', 'countrywide', 2025, 24, 8973674982, 0.81, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (968, 'all_lines', 'countrywide', 2025, 25, 8051916381, 0.73, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (176, 'home', 'countrywide', 2025, 1, 35270359902, 18.69, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (8, 'home', 'countrywide', 2025, 2, 17765729513, 9.42, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (200, 'home', 'countrywide', 2025, 3, 13255017433, 7.02, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (111, 'home', 'countrywide', 2025, 4, 10396255012, 5.51, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (69, 'home', 'countrywide', 2025, 5, 10309717558, 5.46, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (473, 'home', 'countrywide', 2025, 6, 9716315410, 5.15, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (3548, 'home', 'countrywide', 2025, 7, 8622262164, 4.57, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (626, 'home', 'countrywide', 2025, 8, 4711052079, 2.5, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (280, 'home', 'countrywide', 2025, 9, 4137984071, 2.19, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (213, 'home', 'countrywide', 2025, 10, 3710290629, 1.97, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (140, 'home', 'countrywide', 2025, 11, 3494633336, 1.85, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (155, 'home', 'countrywide', 2025, 12, 3336269743, 1.77, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (4663, 'home', 'countrywide', 2025, 13, 2017856927, 1.07, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (3098, 'home', 'countrywide', 2025, 14, 1951626475, 1.03, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (244, 'home', 'countrywide', 2025, 15, 1906623067, 1.01, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (1318, 'home', 'countrywide', 2025, 16, 1797224338, 0.95, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (1278, 'home', 'countrywide', 2025, 17, 1719231619, 0.91, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (660, 'home', 'countrywide', 2025, 18, 1673509307, 0.89, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (4769, 'home', 'countrywide', 2025, 20, 1476259636, 0.78, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (28, 'home', 'countrywide', 2025, 21, 1320730182, 0.7, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (91, 'home', 'countrywide', 2025, 22, 1299931397, 0.69, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (55, 'home', 'countrywide', 2025, 23, 1279827813, 0.68, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (5101, 'home', 'countrywide', 2025, 24, 1250320041, 0.66, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf'),
  (50, 'home', 'countrywide', 2025, 25, 1230168885, 0.65, 'NAIC 2025 Property/Casualty Market Share Report', 'https://content.naic.org/sites/default/files/research-actuarial-property-casualty-market-share.pdf')
ON CONFLICT (naic_group_code, line, scope, data_year) DO UPDATE SET
  rank_in_scope = EXCLUDED.rank_in_scope,
  direct_premiums_written = EXCLUDED.direct_premiums_written,
  market_share_pct = EXCLUDED.market_share_pct,
  as_of = CURRENT_DATE;
