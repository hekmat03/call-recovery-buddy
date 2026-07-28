
revoke execute on function public.is_business_member(uuid) from public, anon;
revoke execute on function public.has_business_role(uuid, public.member_role[]) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.is_business_member(uuid) to authenticated, service_role;
grant execute on function public.has_business_role(uuid, public.member_role[]) to authenticated, service_role;
