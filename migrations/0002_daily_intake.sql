-- What /api/usage accepted per UTC day (#78): reports, and rows written, which the Worker
-- checks against its daily budget so it never spends the account's D1 write quota.
CREATE TABLE daily_intake (
  day TEXT PRIMARY KEY,
  reports INTEGER NOT NULL,
  rows INTEGER NOT NULL
);
