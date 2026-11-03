create table public.ai_usage (user_id uuid not null references auth.users(id) on delete cascade, window_start timestamptz not null, requests integer not null default 0, primary key(user_id,window_start));
alter table public.ai_usage enable row level security;
-- Only this authenticated, bounded function can modify usage counters.
create function public.consume_ai_request() returns boolean language plpgsql security definer set search_path = public as $$
declare used integer; owner_id uuid := auth.uid();
begin
 if owner_id is null then return false; end if;
 insert into public.ai_usage(user_id,window_start,requests) values(owner_id,date_trunc('hour',now()),1)
 on conflict(user_id,window_start) do update set requests=ai_usage.requests+1 where ai_usage.requests<20 returning requests into used;
 return used is not null;
end; $$;
revoke all on function public.consume_ai_request() from public, anon;
grant execute on function public.consume_ai_request() to authenticated;
