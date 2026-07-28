
-- ===== ENUMS =====
create type public.member_role as enum ('owner','admin','agent');
create type public.lead_status as enum ('new','engaged','booked','lost');
create type public.msg_direction as enum ('in','out');

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
create policy "profiles_self_upsert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ===== BUSINESSES =====
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  phone text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.businesses to authenticated;
grant all on public.businesses to service_role;
alter table public.businesses enable row level security;

-- ===== BUSINESS MEMBERS =====
create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'agent',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index business_members_user_idx on public.business_members(user_id);
create index business_members_biz_idx on public.business_members(business_id);
grant select, insert, update, delete on public.business_members to authenticated;
grant all on public.business_members to service_role;
alter table public.business_members enable row level security;

-- Security-definer helpers (avoid recursive RLS)
create or replace function public.is_business_member(_business_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = _business_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_business_role(_business_id uuid, _roles public.member_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = _business_id
      and user_id = auth.uid()
      and role = any(_roles)
  );
$$;

-- Business policies
create policy "businesses_member_select" on public.businesses for select to authenticated
  using (public.is_business_member(id));
create policy "businesses_insert_self" on public.businesses for insert to authenticated
  with check (created_by = auth.uid());
create policy "businesses_admin_update" on public.businesses for update to authenticated
  using (public.has_business_role(id, array['owner','admin']::public.member_role[]))
  with check (public.has_business_role(id, array['owner','admin']::public.member_role[]));
create policy "businesses_owner_delete" on public.businesses for delete to authenticated
  using (public.has_business_role(id, array['owner']::public.member_role[]));

-- Members policies
create policy "members_self_or_biz_select" on public.business_members for select to authenticated
  using (user_id = auth.uid() or public.is_business_member(business_id));
create policy "members_admin_insert" on public.business_members for insert to authenticated
  with check (
    -- founder inserting themself into a business they just created
    (user_id = auth.uid() and exists (
      select 1 from public.businesses b where b.id = business_id and b.created_by = auth.uid()
    ))
    or public.has_business_role(business_id, array['owner','admin']::public.member_role[])
  );
create policy "members_admin_update" on public.business_members for update to authenticated
  using (public.has_business_role(business_id, array['owner','admin']::public.member_role[]))
  with check (public.has_business_role(business_id, array['owner','admin']::public.member_role[]));
create policy "members_admin_delete" on public.business_members for delete to authenticated
  using (public.has_business_role(business_id, array['owner','admin']::public.member_role[]));

-- ===== LEADS =====
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text,
  phone text not null,
  issue text,
  status public.lead_status not null default 'new',
  estimated_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_biz_created_idx on public.leads(business_id, created_at desc);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;

create policy "leads_member_select" on public.leads for select to authenticated
  using (public.is_business_member(business_id));
create policy "leads_member_insert" on public.leads for insert to authenticated
  with check (public.is_business_member(business_id));
create policy "leads_member_update" on public.leads for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "leads_member_delete" on public.leads for delete to authenticated
  using (public.is_business_member(business_id));

-- ===== MESSAGES =====
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  direction public.msg_direction not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_lead_created_idx on public.messages(lead_id, created_at);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create policy "messages_member_select" on public.messages for select to authenticated
  using (public.is_business_member(business_id));
create policy "messages_member_insert" on public.messages for insert to authenticated
  with check (public.is_business_member(business_id));
create policy "messages_member_update" on public.messages for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "messages_member_delete" on public.messages for delete to authenticated
  using (public.is_business_member(business_id));

-- ===== Auto-provision profile + starter business on signup =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_biz_id uuid;
  new_lead_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.businesses (name, industry, phone, created_by)
  values (
    coalesce(new.raw_user_meta_data->>'business_name', 'My Business'),
    coalesce(new.raw_user_meta_data->>'industry', 'roofing'),
    '(415) 555-0100',
    new.id
  )
  returning id into new_biz_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_biz_id, new.id, 'owner');

  -- Seed demo leads so the dashboard is populated on first login
  insert into public.leads (business_id, name, phone, issue, status, estimated_value, created_at) values
    (new_biz_id, 'Jenna Ruiz', '(415) 555-0132', 'Roof leak after storm', 'booked', 4200, now() - interval '2 minutes'),
    (new_biz_id, 'Derek Malone', '(415) 555-0119', 'AC not cooling', 'engaged', 780, now() - interval '11 minutes'),
    (new_biz_id, 'Aisha Patel', '(510) 555-0173', 'Kitchen sink clog', 'booked', 320, now() - interval '24 minutes'),
    (new_biz_id, 'Mike Chen', '(408) 555-0198', 'Panel upgrade quote', 'engaged', 2400, now() - interval '42 minutes'),
    (new_biz_id, 'Lena Osei', '(650) 555-0141', 'Chipped molar, urgent', 'booked', 950, now() - interval '1 hour'),
    (new_biz_id, 'Rob Sinclair', '(415) 555-0184', 'Water heater replacement', 'new', 1800, now() - interval '1 hour'),
    (new_biz_id, 'Sam Rivera', '(415) 555-0107', 'Estimate for reroof', 'lost', 0, now() - interval '3 hours'),
    (new_biz_id, 'Marco Bianchi', '(415) 555-0155', 'Outlet sparking', 'booked', 380, now() - interval '5 hours');

  -- Seed a conversation on the first lead
  select id into new_lead_id from public.leads where business_id = new_biz_id and name = 'Jenna Ruiz' limit 1;
  insert into public.messages (lead_id, business_id, direction, body, created_at) values
    (new_lead_id, new_biz_id, 'out', 'Hi Jenna, this is Ava — sorry we missed your call. What''s going on?', now() - interval '2 minutes'),
    (new_lead_id, new_biz_id, 'in', 'My roof is leaking after last night''s storm, need someone out asap', now() - interval '2 minutes'),
    (new_lead_id, new_biz_id, 'out', 'Got it — is this an emergency, or can we schedule for tomorrow morning?', now() - interval '1 minute'),
    (new_lead_id, new_biz_id, 'in', 'Tomorrow 9am works great', now() - interval '1 minute');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_businesses_updated before update on public.businesses for each row execute function public.set_updated_at();
create trigger trg_leads_updated before update on public.leads for each row execute function public.set_updated_at();
