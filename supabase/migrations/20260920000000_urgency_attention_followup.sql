-- Urgency, human-attention, and follow-up tracking for leads.
-- All simulated logic — no Twilio/real SMS involved yet.

alter table public.leads
  add column if not exists urgency text not null default 'normal'
    check (urgency in ('normal', 'urgent')),
  add column if not exists needs_attention boolean not null default false,
  add column if not exists attention_reason text,
  add column if not exists follow_up_stage integer not null default 0,
  add column if not exists last_customer_reply_at timestamptz;

create index if not exists leads_business_urgency_idx
  on public.leads (business_id, urgency);

create index if not exists leads_business_attention_idx
  on public.leads (business_id, needs_attention);

comment on column public.leads.urgency is
  'Simulated urgency flag detected from qualification answers (e.g. active leak, emergency).';
comment on column public.leads.needs_attention is
  'True when the AI flow determines a human should step in (frustration, explicit request, or fully qualified and ready to book).';
comment on column public.leads.attention_reason is
  'Short human-readable reason the lead was flagged for attention.';
comment on column public.leads.follow_up_stage is
  '0 = no reminder sent, 1 = first reminder sent, 2 = second reminder sent, 3 = marked needs manual follow-up.';
comment on column public.leads.last_customer_reply_at is
  'Timestamp of the most recent customer message, used to simulate "no reply" follow-up reminders.';

