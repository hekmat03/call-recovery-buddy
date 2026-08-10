-- Replace helper-based policies with inline ownership checks
drop policy "leads_owner_select" on public.leads;
drop policy "leads_owner_insert" on public.leads;
drop policy "leads_owner_update" on public.leads;
drop policy "leads_owner_delete" on public.leads;
create policy "leads_owner_select" on public.leads for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = leads.business_id and b.user_id = auth.uid()));
create policy "leads_owner_insert" on public.leads for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = leads.business_id and b.user_id = auth.uid()));
create policy "leads_owner_update" on public.leads for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = leads.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = leads.business_id and b.user_id = auth.uid()));
create policy "leads_owner_delete" on public.leads for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = leads.business_id and b.user_id = auth.uid()));

drop policy "conversations_owner_select" on public.conversations;
drop policy "conversations_owner_insert" on public.conversations;
drop policy "conversations_owner_update" on public.conversations;
drop policy "conversations_owner_delete" on public.conversations;
create policy "conversations_owner_select" on public.conversations for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = conversations.business_id and b.user_id = auth.uid()));
create policy "conversations_owner_insert" on public.conversations for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = conversations.business_id and b.user_id = auth.uid()));
create policy "conversations_owner_update" on public.conversations for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = conversations.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = conversations.business_id and b.user_id = auth.uid()));
create policy "conversations_owner_delete" on public.conversations for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = conversations.business_id and b.user_id = auth.uid()));

drop policy "missed_calls_owner_select" on public.missed_calls;
drop policy "missed_calls_owner_insert" on public.missed_calls;
drop policy "missed_calls_owner_update" on public.missed_calls;
drop policy "missed_calls_owner_delete" on public.missed_calls;
create policy "missed_calls_owner_select" on public.missed_calls for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = missed_calls.business_id and b.user_id = auth.uid()));
create policy "missed_calls_owner_insert" on public.missed_calls for insert to authenticated
  with check (exists (select 1 from public.businesses b where b.id = missed_calls.business_id and b.user_id = auth.uid()));
create policy "missed_calls_owner_update" on public.missed_calls for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = missed_calls.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = missed_calls.business_id and b.user_id = auth.uid()));
create policy "missed_calls_owner_delete" on public.missed_calls for delete to authenticated
  using (exists (select 1 from public.businesses b where b.id = missed_calls.business_id and b.user_id = auth.uid()));

drop function if exists public.owns_business(uuid);

-- Internal-only helpers: not callable through the API
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;