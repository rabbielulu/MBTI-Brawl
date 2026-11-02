-- Only the authoritative game server may read/write. No public client policy.
begin;
create table if not exists public.brawl_wins (
 match_id text primary key,
 ended_at timestamptz not null,
 nickname text not null check (char_length(nickname) between 1 and 64),
 mbti text not null check (mbti in ('INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP')),
 created_at timestamptz not null default now()
);
create index if not exists brawl_wins_ended_at_idx on public.brawl_wins (ended_at);
alter table public.brawl_wins enable row level security;
revoke all on public.brawl_wins from anon, authenticated;
grant select, insert on public.brawl_wins to service_role;
commit;
