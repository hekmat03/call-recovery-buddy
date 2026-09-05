create type public.notification_type as enum ('new_lead','qualified_lead','appointment_opportunity','important_message');
create type public.appointment_status as enum ('requested','scheduled','completed','cancelled');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications_owner_all" on public.notifications for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = notifications.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = notifications.business_id and b.user_id = auth.uid()));
create index notifications_biz_idx on public.notifications(business_id, is_read, created_at desc);
create trigger notifications_updated_at before update on public.notifications for each row execute function public.set_updated_at();

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  customer_name text,
  customer_phone text,
  preferred_at timestamptz,
  notes text,
  status public.appointment_status not null default 'requested',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "appointments_owner_all" on public.appointments for all to authenticated
  using (exists (select 1 from public.businesses b where b.id = appointments.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = appointments.business_id and b.user_id = auth.uid()));
create index appointments_biz_idx on public.appointments(business_id, created_at desc);
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();