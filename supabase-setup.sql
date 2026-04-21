-- Run this in Supabase Dashboard → SQL Editor
-- ⚠️ If you already ran an older version, drop the old tables first:
drop table if exists ratings;
drop table if exists video_state;

-- Video state table (tracks current video for each session)
create table video_state (
  session_id text primary key,
  video_index integer not null default 0,
  playing boolean not null default true,
  updated_at timestamp with time zone default now()
);

-- Ratings table (each audience member's rating per video)
-- Rating scale: 1–100
create table ratings (
  video_id text not null,
  user_id text not null,
  user_name text,
  session_id text not null default 'session-1',
  rating numeric(5,1) not null check (rating >= 0 and rating <= 100),
  created_at timestamp with time zone default now(),
  primary key (video_id, user_id)
);

-- Enable Realtime on both tables
alter publication supabase_realtime add table video_state;
alter publication supabase_realtime add table ratings;

-- Allow public read/write (since we're using anon key with no auth)
-- Adjust these policies if you add Supabase Auth later
alter table video_state enable row level security;
alter table ratings enable row level security;

create policy "Allow all on video_state" on video_state
  for all using (true) with check (true);

create policy "Allow all on ratings" on ratings
  for all using (true) with check (true);
