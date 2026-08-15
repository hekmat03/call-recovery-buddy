-- Cast status columns to text so we can remap to values not yet in the old enum
alter table public.leads alter column status drop default;
alter table public.leads alter column status type text;
alter table public.missed_calls alter column status drop default;
alter table public.missed_calls alter column status type text;

-- Remap existing rows to the new vocabulary (columns are now free text)
update public.leads set status = 'contacted' where status = 'engaged';
update public.leads set lead_source = 'website_chat' where lead_source = 'web_form';
update public.leads set lead_source = 'manual_entry'
  where lead_source not in ('missed_call','website_chat','referral','manual_entry');
update public.missed_calls set status = 'new' where status = 'pending';
update public.missed_calls set status = 'booked' where status = 'recovered';

-- ===== Replace lead_status enum =====
drop type public.lead_status;
create type public.lead_status as enum ('new','contacted','qualified','booked','closed','lost');
alter table public.leads alter column status type public.lead_status using status::public.lead_status;
alter table public.leads alter column status set default 'new';

-- ===== Replace missed_call_status enum =====
drop type public.missed_call_status;
create type public.missed_call_status as enum ('new','contacted','qualified','booked','closed','lost');
alter table public.missed_calls alter column status type public.missed_call_status using status::public.missed_call_status;
alter table public.missed_calls alter column status set default 'new';

-- ===== Convert lead_source text -> enum =====
create type public.lead_source as enum ('missed_call','website_chat','manual_entry','referral');
alter table public.leads alter column lead_source drop default;
alter table public.leads alter column lead_source type public.lead_source using lead_source::public.lead_source;
alter table public.leads alter column lead_source set default 'missed_call';

-- ===== Rewrite auto-provisioning trigger with new demo data =====
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
    (new_biz_id, 'Derek Malone', '(415) 555-0119', 'derek.m@example.com', 'missed_call', 'contacted', 780, 'AC not cooling', now() - interval '11 minutes'),
    (new_biz_id, 'Aisha Patel', '(510) 555-0173', null, 'website_chat', 'booked', 320, 'Kitchen sink clog', now() - interval '24 minutes'),
    (new_biz_id, 'Mike Chen', '(408) 555-0198', 'mchen@example.com', 'missed_call', 'contacted', 2400, 'Panel upgrade quote', now() - interval '42 minutes'),
    (new_biz_id, 'Lena Osei', '(650) 555-0141', null, 'missed_call', 'booked', 950, 'Chipped molar, urgent', now() - interval '1 hour'),
    (new_biz_id, 'Rob Sinclair', '(415) 555-0184', null, 'manual_entry', 'new', 1800, 'Water heater replacement', now() - interval '1 hour'),
    (new_biz_id, 'Sam Rivera', '(415) 555-0107', null, 'referral', 'lost', 0, 'Estimate for reroof', now() - interval '3 hours'),
    (new_biz_id, 'Marco Bianchi', '(415) 555-0155', null, 'missed_call', 'closed', 380, 'Outlet sparking', now() - interval '5 hours');

  select id into new_lead_id from public.leads where business_id = new_biz_id and customer_name = 'Jenna Ruiz' limit 1;

  insert into public.conversations (lead_id, business_id, sender, message, created_at) values
    (new_lead_id, new_biz_id, 'ai', 'Hi Jenna, this is Ava — sorry we missed your call. What''s going on?', now() - interval '2 minutes'),
    (new_lead_id, new_biz_id, 'customer', 'My roof is leaking after last night''s storm, need someone out asap', now() - interval '2 minutes'),
    (new_lead_id, new_biz_id, 'ai', 'Got it — is this an emergency, or can we schedule for tomorrow morning?', now() - interval '1 minute'),
    (new_lead_id, new_biz_id, 'customer', 'Tomorrow 9am works great', now() - interval '1 minute');

  insert into public.missed_calls (business_id, customer_name, customer_phone, date_time, source, status, notes) values
    (new_biz_id, 'Jenna Ruiz', '(415) 555-0132', now() - interval '3 minutes', 'phone', 'booked', 'AI followed up in 12 seconds'),
    (new_biz_id, 'Derek Malone', '(415) 555-0119', now() - interval '12 minutes', 'phone', 'contacted', 'Awaiting reply'),
    (new_biz_id, 'Unknown Caller', '(415) 555-0166', now() - interval '35 minutes', 'phone', 'new', null),
    (new_biz_id, 'Marco Bianchi', '(415) 555-0155', now() - interval '5 hours', 'phone', 'booked', 'Booked same-day visit');

  return new;
end;
$$;

-- Internal-only helpers: not callable through the API
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;