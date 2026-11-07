begin;

create unique index one_active_owner_per_club
on public.club_memberships (club_id)
where role = 'owner' and status = 'ACTIVE';

create policy memberships_self_select
on public.club_memberships for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.request_club_membership(p_display_name text default null)
returns public.club_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_membership public.club_memberships;
  v_name text;
  v_club_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  v_name := left(regexp_replace(coalesce(nullif(trim(p_display_name), ''), 'Player'), '[^[:alnum:] .''-]', ' ', 'g'), 48);
  if char_length(trim(v_name)) = 0 then v_name := 'Player'; end if;

  insert into public.club_memberships (club_id, user_id, role, status, display_name)
  values (v_club_id, v_user_id, 'player', 'INVITED', trim(v_name))
  on conflict (club_id, user_id) do nothing;

  select * into v_membership
  from public.club_memberships
  where club_id = v_club_id and user_id = v_user_id;

  return v_membership;
end;
$$;

create or replace function public.list_pending_memberships()
returns table (
  id uuid,
  email text,
  display_name text,
  requested_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_club_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
begin
  if private.user_club_role(v_club_id) <> 'owner' then
    raise exception 'owner_required' using errcode = '42501';
  end if;

  return query
  select m.id, u.email::text, m.display_name, m.created_at
  from public.club_memberships m
  join auth.users u on u.id = m.user_id
  where m.club_id = v_club_id and m.status = 'INVITED'
  order by m.created_at;
end;
$$;

create or replace function public.approve_club_membership(
  p_membership_id uuid,
  p_role public.club_role default 'player'
)
returns public.club_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_club_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  v_membership public.club_memberships;
begin
  if private.user_club_role(v_club_id) <> 'owner' then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  if p_role not in ('player', 'dealer') then
    raise exception 'invalid_approval_role' using errcode = '22023';
  end if;

  update public.club_memberships
  set status = 'ACTIVE', role = p_role
  where id = p_membership_id and club_id = v_club_id and status = 'INVITED'
  returning * into v_membership;
  if v_membership.id is null then
    raise exception 'pending_membership_not_found' using errcode = 'P0002';
  end if;

  insert into public.accounts (club_id, membership_id)
  values (v_club_id, v_membership.id)
  on conflict (club_id, membership_id) do nothing;

  insert into public.audit_log (club_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_club_id, (select auth.uid()), 'MEMBERSHIP_APPROVED', 'club_membership', v_membership.id,
    jsonb_build_object('role', p_role));

  return v_membership;
end;
$$;

create or replace function public.reject_club_membership(p_membership_id uuid)
returns public.club_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_club_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  v_membership public.club_memberships;
begin
  if private.user_club_role(v_club_id) <> 'owner' then
    raise exception 'owner_required' using errcode = '42501';
  end if;

  update public.club_memberships
  set status = 'SUSPENDED'
  where id = p_membership_id and club_id = v_club_id and status = 'INVITED'
  returning * into v_membership;
  if v_membership.id is null then
    raise exception 'pending_membership_not_found' using errcode = 'P0002';
  end if;

  insert into public.audit_log (club_id, actor_id, action, entity_type, entity_id)
  values (v_club_id, (select auth.uid()), 'MEMBERSHIP_REJECTED', 'club_membership', v_membership.id);

  return v_membership;
end;
$$;

revoke all on function public.request_club_membership(text) from public;
revoke all on function public.list_pending_memberships() from public;
revoke all on function public.approve_club_membership(uuid, public.club_role) from public;
revoke all on function public.reject_club_membership(uuid) from public;
grant execute on function public.request_club_membership(text) to authenticated;
grant execute on function public.list_pending_memberships() to authenticated;
grant execute on function public.approve_club_membership(uuid, public.club_role) to authenticated;
grant execute on function public.reject_club_membership(uuid) to authenticated;

commit;
