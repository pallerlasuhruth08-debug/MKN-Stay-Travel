-- Postgres schema for the Supabase-backed deployment. This is a reference
-- copy of the migration already applied to the project via the Supabase
-- dashboard/CLI/MCP — the app does not run this file automatically, unlike
-- the old SQLite version which applied it on every boot.
--
-- Tables are prefixed `mkn_` because this project is shared with other
-- apps. RLS is enabled with no policies for anon/authenticated: the server
-- talks to Postgres exclusively via the service_role key, which bypasses
-- RLS, so nothing here is reachable through the public REST API.

create table if not exists mkn_requests (
  request_id         text primary key,
  created_at         timestamptz not null default now(),

  requester_type     text not null check (requester_type in ('POC','Core volunteer','Poornanga')),
  poc_name           text,
  poc_team           text,
  poc_phone          text,
  poc_email          text,
  traveller_type     text check (traveller_type is null or traveller_type in ('Team member','Vendor')),

  name               text not null,
  role               text not null,
  region             text not null check (region in (
                        'South India','North India','East India','West India','Central India',
                        'North East India','APAC','Middle East','North America','Europe','Other')),
  phone              text,
  email              text,

  check_in           text not null,
  check_out          text not null,

  travel_mode        text not null check (travel_mode in
                        ('Train','Flight','Organized bus (IYC to SSB)','Dedicated team bus (by SSB)')),
  from_location      text,
  to_location        text,
  preferred_option   text,
  arrival            text,
  last_mile          text check (last_mile is null or last_mile in
                        ('Isha shuttle','Shared taxi','Shared bus','Own')),

  id_type            text check (id_type is null or id_type in ('Aadhaar','Passport')),
  id_number          text,
  id_image_path      text,
  id_status          text not null default 'Awaiting traveller' check (id_status in ('Awaiting traveller','Received')),

  stay_status        text not null default 'Pending' check (stay_status in ('Pending','Allocated')),
  stay_allocation    text,

  travel_status      text not null default 'Pending' check (travel_status in ('Pending','Booked')),
  travel_allocation  text,

  constraint mkn_requests_last_mile_mode_ck check (
    (travel_mode in ('Train','Flight')) or (last_mile is null)
  )
);

create index if not exists idx_mkn_requests_stay_status   on mkn_requests(stay_status);
create index if not exists idx_mkn_requests_travel_status on mkn_requests(travel_status);
create index if not exists idx_mkn_requests_id_status     on mkn_requests(id_status);

create table if not exists mkn_recommended_trains (
  train        text primary key,
  route        text not null,
  arrival      text,
  recommended  text check (recommended is null or recommended = 'Yes')
);

create table if not exists mkn_recommended_flights (
  flight       text primary key,
  airline      text not null,
  arrival      text,
  recommended  text check (recommended is null or recommended = 'Yes')
);

-- Confirmed status is always derived from the three live status columns at
-- read time, never stored, so it cannot drift out of sync with them.
-- security_invoker=true makes the view respect the querying role's RLS
-- against mkn_requests instead of running with the view owner's
-- permissions (Postgres views are SECURITY DEFINER-like by default).
create or replace view mkn_request_status as
select *,
  case when id_status = 'Received' and stay_status = 'Allocated' and travel_status = 'Booked'
       then 'Confirmed' else 'In progress' end as confirmed_status
from mkn_requests;

alter view mkn_request_status set (security_invoker = true);

alter table mkn_requests enable row level security;
alter table mkn_recommended_trains enable row level security;
alter table mkn_recommended_flights enable row level security;

revoke all on mkn_requests from anon, authenticated;
revoke all on mkn_recommended_trains from anon, authenticated;
revoke all on mkn_recommended_flights from anon, authenticated;
revoke all on mkn_request_status from anon, authenticated;

-- Private bucket for Aadhaar/passport images, accessed only via signed URLs
-- generated server-side with the service_role key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mkn-id-uploads', 'mkn-id-uploads', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;
