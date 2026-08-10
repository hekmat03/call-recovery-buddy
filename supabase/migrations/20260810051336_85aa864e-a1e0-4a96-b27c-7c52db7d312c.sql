-- ===== RESET previous schema (no production data yet) =====
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_business_member(uuid) cascade;
drop function if exists public.has_business_role(uuid, public.member_role[]) cascade;
drop table if exists public.messages cascade;
drop table if exists public.leads cascade;
drop table if exists public.business_members cascade;
drop table if exists public.businesses cascade;
drop table if exists public.profiles cascade;
drop type if exists public.member_role cascade;
drop type if exists public.msg_direction cascade;
drop type if exists public.lead_status cascade;

-- ===== ENUMS =====
create type public.lead_status as enum ('new','engaged','booked','lost');
create type public.msg_sender as enum ('customer','ai','business');
create type public.missed_call_status as enum ('pending','contacted','recovered','lost');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_self_select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_self_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- ===== BUSINESSES =====
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  industry text,
  phone_number text,
  service_area text,
  business_hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_user_idx on public.businesses(user_id);
grant select, insert, update, delete on public.businesses to authenticated;
grant all on public.businesses to service_role;
alter table public.businesses enable row level security;
create policy "businesses_owner_select" on public.businesses for select to authenticated using (user_id = auth.uid());
create policy "businesses_owner_insert" on public.businesses for insert to authenticated with check (user_id = auth.uid());
create policy "businesses_owner_update" on public.businesses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "businesses_owner_delete" on public.businesses for delete to authenticated using (user_id = auth.uid());
create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();

create or replace function public.owns_business(_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses
    where id = _business_id and user_id = auth.uid()
  );
$$;
revoke all on function public.owns_business(uuid) from public, anon;
grant execute on function public.owns_business(uuid) to authenticated;

-- ===== LEADS =====
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_name text,
  customer_phone text not null,
  customer_email text,
  lead_source text not null default 'missed_call',
  status public.lead_status not null default 'new',
  estimated_value numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_biz_created_idx on public.leads(business_id, created_at desc);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "leads_owner_select" on public.leads for select to authenticated using (public.owns_business(business_id));
create policy "leads_owner_insert" on public.leads for insert to authenticated with check (public.owns_business(business_id));
create policy "leads_owner_update" on public.leads for update to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "leads_owner_delete" on public.leads for delete to authenticated using (public.owns_business(business_id));
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

-- ===== CONVERSATIONS =====
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  sender public.msg_sender not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index conversations_lead_created_idx on public.conversations(lead_id, created_at);
create index conversations_biz_idx on public.conversations(business_id);
grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "conversations_owner_select" on public.conversations for select to authenticated using (public.owns_business(business_id));
create policy "conversations_owner_insert" on public.conversations for insert to authenticated with check (public.owns_business(business_id));
create policy "conversations_owner_update" on public.conversations for update to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "conversations_owner_delete" on public.conversations for delete to authenticated using (public.owns_business(business_id));

-- ===== MISSED CALLS =====
create table public.missed_calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_name text,
  customer_phone text not null,
  date_time timestamptz not null default now(),
  source text not null default 'phone',
  status public.missed_call_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index missed_calls_biz_time_idx on public.missed_calls(business_id, date_time desc);
grant select, insert, update, delete on public.missed_calls to authenticated;
grant all on public.missed_calls to service_role;
alter table public.missed_calls enable row level security;
create policy "missed_calls_owner_select" on public.missed_calls for select to authenticated using (public.owns_business(business_id));
create policy "missed_calls_owner_insert" on public.missed_calls for insert to authenticated with check (public.owns_business(business_id));
create policy "missed_calls_owner_update" on public.missed_calls for update to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));
create policy "missed_calls_owner_delete" on public.missed_calls for delete to authenticated using (public.owns_business(business_id));
create trigger missed_calls_updated_at before update on public.missed_calls for each row execute function public.set_updated_at();

-- ===== Auto-provision profile + business + demo data on signup =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_biz_id uuid;
  new_lead_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.businesses (user_id, company_name, industry, phone_number, service_area, business_hours)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', 'My Business'),
    coalesce(new.raw_user_meta_data->>'industry', 'roofing'),
    '(415) 555-0100',
    'San Francisco Bay Area',
    'Mon-Fri 8am-6pm, Sat 9am-2pm'
  )
  returning id into new_biz_id;

  insert into public.leads (business_id, customer_name, customer_phone, customer_email, lead_source, status, estimated_value, notes, created_at) values
    (new_biz_id, 'Jenna Ruiz', '(415) 555-0132', 'jenna.ruiz@example.com', 'missed_call', 'booked', 4200, 'Roof leak after storm', now() - interval '2 minutes'),
    (new_biz_id, 'Derek Malone', '(415) 555-0119', 'derek.m@example.com', 'missed_call', 'engaged', 780, 'AC not cooling', now() - interval '11 minutes'),
    (new_biz_id, 'Aisha Patel', '(510) 555-0173', null, 'web_form', 'booked', 320, 'Kitchen sink clog', now() - interval '24 minutes'),
    (new_biz_id, 'Mike Chen', '(408) 555-0198', 'mchen@example.com', 'missed_call', 'engaged', 2400, 'Panel upgrade quote', now() - interval '42 minutes'),
    (new_biz_id, 'Lena Osei', '(650) 555-0141', null, 'missed_call', 'booked', 950, 'Chipped molar, urgent', now() - interval '1 hour'),
    (new_biz_id, 'Rob Sinclair', '(415) 555-0184', null, 'missed_call', 'new', 1800, 'Water heater replacement', now() - interval '1 hour'),
    (new_biz_id, 'Sam Rivera', '(415) 555-0107', null, 'referral', 'lost', 0, 'Estimate for reroof', now() - interval '3 hours'),
    (new_biz_id, 'Marco Bianchi', '(415) 555-0155', null, 'missed_call', 'booked', 380, 'Outlet sparking', now() - interval '5 hours');

  select id into new_lead_id from public.leads where business_id = new_biz_id and customer_name = 'Jenna Ruiz' limit 1;

  insert into public.conversations (lead_id, business_id, sender, message, created_at) values
    (new_lead_id, new_biz_id, 'ai', 'Hi Jenna, this is Ava — sorry we missed your call. What''s going on?', now() - interval '2 minutes'),
    (new_lead_id, new_biz_id, 'customer', 'My roof is leaking after last night''s storm, need someone out asap', now() - interval '2 minutes'),
    (new_lead_id, new_biz_id, 'ai', 'Got it — is this an emergency, or can we schedule for tomorrow morning?', now() - interval '1 minute'),
    (new_lead_id, new_biz_id, 'customer', 'Tomorrow 9am works great', now() - interval '1 minute');

  insert into public.missed_calls (business_id, customer_name, customer_phone, date_time, source, status, notes) values
    (new_biz_id, 'Jenna Ruiz', '(415) 555-0132', now() - interval '3 minutes', 'phone', 'recovered', 'AI followed up in 12 seconds'),
    (new_biz_id, 'Derek Malone', '(415) 555-0119', now() - interval '12 minutes', 'phone', 'contacted', 'Awaiting reply'),
    (new_biz_id, 'Unknown Caller', '(415) 555-0166', now() - interval '35 minutes', 'phone', 'pending', null),
    (new_biz_id, 'Marco Bianchi', '(415) 555-0155', now() - interval '5 hours', 'phone', 'recovered', 'Booked same-day visit');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();