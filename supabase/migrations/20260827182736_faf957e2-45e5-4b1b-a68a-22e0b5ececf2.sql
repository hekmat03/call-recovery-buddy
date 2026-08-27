alter table public.businesses
  add column if not exists description text,
  add column if not exists services_offered text,
  add column if not exists faqs jsonb not null default '[]'::jsonb,
  add column if not exists ai_tone text not null default 'professional';

alter table public.leads
  add column if not exists qualification jsonb not null default '{}'::jsonb,
  add column if not exists is_demo boolean not null default false;

alter table public.missed_calls
  add column if not exists is_demo boolean not null default false;

alter table public.conversations
  add column if not exists is_demo boolean not null default false;

alter table public.lead_activities
  add column if not exists is_demo boolean not null default false;

create index if not exists leads_business_demo_idx on public.leads (business_id, is_demo);
create index if not exists missed_calls_business_demo_idx on public.missed_calls (business_id, is_demo);