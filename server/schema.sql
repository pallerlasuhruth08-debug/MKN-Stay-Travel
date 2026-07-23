PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS requests (
  request_id         TEXT PRIMARY KEY,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),

  requester_type     TEXT NOT NULL CHECK (requester_type IN ('POC','Core volunteer','Poornanga')),
  poc_name           TEXT,
  poc_team           TEXT,
  poc_phone          TEXT,
  poc_email          TEXT,
  traveller_type     TEXT CHECK (traveller_type IS NULL OR traveller_type IN ('Team member','Vendor')),

  name               TEXT NOT NULL,
  role               TEXT NOT NULL,
  region             TEXT NOT NULL CHECK (region IN (
                        'South India','North India','East India','West India','Central India',
                        'North East India','APAC','Middle East','North America','Europe','Other')),
  phone              TEXT,
  email              TEXT,

  check_in           TEXT NOT NULL,
  check_out          TEXT NOT NULL,

  travel_mode        TEXT NOT NULL CHECK (travel_mode IN
                        ('Train','Flight','Organized bus (IYC to SSB)','Dedicated team bus (by SSB)')),
  from_location      TEXT,
  to_location        TEXT,
  preferred_option   TEXT,
  arrival            TEXT,
  last_mile          TEXT CHECK (last_mile IS NULL OR last_mile IN
                        ('Isha shuttle','Shared taxi','Shared bus','Own')),

  id_type            TEXT CHECK (id_type IS NULL OR id_type IN ('Aadhaar','Passport')),
  id_number          TEXT,
  id_image_path      TEXT,
  id_status          TEXT NOT NULL DEFAULT 'Awaiting traveller' CHECK (id_status IN ('Awaiting traveller','Received')),

  stay_status        TEXT NOT NULL DEFAULT 'Pending' CHECK (stay_status IN ('Pending','Allocated')),
  stay_allocation    TEXT,

  travel_status      TEXT NOT NULL DEFAULT 'Pending' CHECK (travel_status IN ('Pending','Booked')),
  travel_allocation  TEXT,

  CHECK (
    (travel_mode IN ('Train','Flight')) OR (last_mile IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_requests_stay_status   ON requests(stay_status);
CREATE INDEX IF NOT EXISTS idx_requests_travel_status ON requests(travel_status);
CREATE INDEX IF NOT EXISTS idx_requests_id_status     ON requests(id_status);

CREATE TABLE IF NOT EXISTS recommended_trains (
  train        TEXT PRIMARY KEY,
  route        TEXT NOT NULL,
  arrival      TEXT,
  recommended  TEXT CHECK (recommended IS NULL OR recommended = 'Yes')
);

CREATE TABLE IF NOT EXISTS recommended_flights (
  flight       TEXT PRIMARY KEY,
  airline      TEXT NOT NULL,
  arrival      TEXT,
  recommended  TEXT CHECK (recommended IS NULL OR recommended = 'Yes')
);

-- Confirmed status is always derived from the three live status columns at
-- read time, never stored, so it cannot drift out of sync with them.
CREATE VIEW IF NOT EXISTS request_status AS
SELECT *,
  CASE WHEN id_status = 'Received' AND stay_status = 'Allocated' AND travel_status = 'Booked'
       THEN 'Confirmed' ELSE 'In progress' END AS confirmed_status
FROM requests;
