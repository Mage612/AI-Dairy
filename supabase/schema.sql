create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'single-user',
  date date not null,
  weekday text default '',
  raw_entries jsonb not null default '[]'::jsonb,
  raw_query text default '',
  research text default '',
  work text default '',
  growth text default '',
  happiness text default '',
  emotion text default '',
  others text default '',
  summary text default '',
  tomorrow_plan text default '',
  entry_count integer not null default 1,
  sync_status text not null default 'local',
  sync_provider text default 'feishu',
  feishu_record_id text default '',
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_records_set_updated_at on public.daily_records;
create trigger daily_records_set_updated_at
before update on public.daily_records
for each row execute function public.set_updated_at();
