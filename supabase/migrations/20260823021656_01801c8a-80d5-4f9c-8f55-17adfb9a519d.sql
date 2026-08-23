create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null default 'status_change',
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.lead_activities to authenticated;
grant all on public.lead_activities to service_role;

alter table public.lead_activities enable row level security;

create policy lead_activities_owner_select on public.lead_activities for select to authenticated
using (exists (select 1 from public.businesses b where b.id = lead_activities.business_id and b.user_id = auth.uid()));

create policy lead_activities_owner_insert on public.lead_activities for insert to authenticated
with check (exists (select 1 from public.businesses b where b.id = lead_activities.business_id and b.user_id = auth.uid()));

create policy lead_activities_owner_update on public.lead_activities for update to authenticated
using (exists (select 1 from public.businesses b where b.id = lead_activities.business_id and b.user_id = auth.uid()))
with check (exists (select 1 from public.businesses b where b.id = lead_activities.business_id and b.user_id = auth.uid()));

create policy lead_activities_owner_delete on public.lead_activities for delete to authenticated
using (exists (select 1 from public.businesses b where b.id = lead_activities.business_id and b.user_id = auth.uid()));

create index lead_activities_lead_idx on public.lead_activities(lead_id, created_at desc);