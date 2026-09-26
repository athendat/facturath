-- Anonymous usage totals (#76): one row per local day and event, never one per device.
CREATE TABLE counts (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (day, event)
);
