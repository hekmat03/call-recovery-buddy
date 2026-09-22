-- Compliance groundwork: opt-out tracking. Business-hours enforcement is left
-- for the real-Twilio pass, since business_hours is currently free text and
-- needs a structured format (e.g. per-day start/end) to enforce reliably.

alter table public.leads
  add column if not exists sms_opt_out boolean not null default false,
  add column if not exists opted_out_at timestamptz;

comment on column public.leads.sms_opt_out is
  'True once the customer has texted STOP (or equivalent). No further automated AI messages should be sent once true.';
comment on column public.leads.opted_out_at is
  'When the opt-out was recorded.';

