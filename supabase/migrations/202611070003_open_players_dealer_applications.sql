begin;

create table public.dealer_applications (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  note text check (note is null or char_length(note) <= 240),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, membership_id),
  check ((status = 'PENDING' and reviewed_by is null and reviewed_at is null) or
         (status <> 'PENDING' and reviewed_by is not null and reviewed_at is not null))
);

alter table public.dealer_applications enable row level security;
create policy dealer_applications_self_select on public.dealer_applications
for select to authenticated using (
  exists (select 1 from public.club_memberships m where m.id = membership_id and m.user_id = (select auth.uid()))
);
create policy dealer_applications_reviewer_select on public.dealer_applications
for select to authenticated using (private.user_club_role(club_id) in ('owner', 'dealer'));
grant select on public.dealer_applications to authenticated;

create or replace function public.request_club_membership(p_display_name text default null)
returns public.club_memberships
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_membership public.club_memberships;
  v_name text;
  v_club_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  v_name := left(regexp_replace(coalesce(nullif(trim(p_display_name), ''), 'Player'), '[^[:alnum:] .''-]', ' ', 'g'), 48);
  if char_length(trim(v_name)) = 0 then v_name := 'Player'; end if;

  insert into public.club_memberships (club_id, user_id, role, status, display_name)
  values (v_club_id, v_user_id, 'player', 'ACTIVE', trim(v_name))
  on conflict (club_id, user_id) do nothing;
  select * into v_membership from public.club_memberships
  where club_id = v_club_id and user_id = v_user_id;

  insert into public.accounts (club_id, membership_id)
  values (v_club_id, v_membership.id)
  on conflict (club_id, membership_id) do nothing;
  return v_membership;
end;
$$;

update public.club_memberships set status = 'ACTIVE'
where status = 'INVITED' and role = 'player';
insert into public.accounts (club_id, membership_id)
select club_id, id from public.club_memberships where status = 'ACTIVE'
on conflict (club_id, membership_id) do nothing;

create or replace function public.request_dealer_access(p_note text default null)
returns public.dealer_applications
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_membership public.club_memberships;
  v_application public.dealer_applications;
begin
  select * into v_membership from public.club_memberships
  where user_id = v_user_id and status = 'ACTIVE' limit 1;
  if v_membership.id is null then raise exception 'active_membership_required' using errcode = '42501'; end if;
  if v_membership.role in ('owner', 'dealer') then raise exception 'already_dealer' using errcode = '22023'; end if;

  insert into public.dealer_applications (club_id, membership_id, status, note)
  values (v_membership.club_id, v_membership.id, 'PENDING', nullif(left(trim(p_note), 240), ''))
  on conflict (club_id, membership_id) do update
  set status = 'PENDING', note = excluded.note, reviewed_by = null, reviewed_at = null, updated_at = now()
  where public.dealer_applications.status = 'REJECTED'
  returning * into v_application;

  if v_application.id is null then
    select * into v_application from public.dealer_applications
    where club_id = v_membership.club_id and membership_id = v_membership.id;
  end if;
  return v_application;
end;
$$;

create or replace function public.get_my_dealer_application()
returns public.dealer_applications
language sql security definer stable set search_path = ''
as $$
  select a.* from public.dealer_applications a
  join public.club_memberships m on m.id = a.membership_id
  where m.user_id = (select auth.uid()) limit 1
$$;

create or replace function public.list_pending_dealer_applications()
returns table (id uuid, email text, display_name text, note text, applied_at timestamptz)
language plpgsql security definer stable set search_path = ''
as $$
declare
  v_club_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
begin
  if private.user_club_role(v_club_id) not in ('owner', 'dealer') then
    raise exception 'dealer_required' using errcode = '42501';
  end if;
  return query
  select a.id, u.email::text, m.display_name, a.note, a.created_at
  from public.dealer_applications a
  join public.club_memberships m on m.id = a.membership_id
  join auth.users u on u.id = m.user_id
  where a.club_id = v_club_id and a.status = 'PENDING'
  order by a.created_at;
end;
$$;

create or replace function public.review_dealer_application(p_application_id uuid, p_approve boolean)
returns public.dealer_applications
language plpgsql security definer set search_path = ''
as $$
declare
  v_club_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  v_application public.dealer_applications;
begin
  if private.user_club_role(v_club_id) not in ('owner', 'dealer') then
    raise exception 'dealer_required' using errcode = '42501';
  end if;
  update public.dealer_applications
  set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
      reviewed_by = (select auth.uid()), reviewed_at = now(), updated_at = now()
  where id = p_application_id and club_id = v_club_id and status = 'PENDING'
  returning * into v_application;
  if v_application.id is null then raise exception 'pending_application_not_found' using errcode = 'P0002'; end if;

  if p_approve then
    update public.club_memberships set role = 'dealer'
    where id = v_application.membership_id and status = 'ACTIVE' and role = 'player';
  end if;
  insert into public.audit_log (club_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_club_id, (select auth.uid()),
    case when p_approve then 'DEALER_APPLICATION_APPROVED' else 'DEALER_APPLICATION_REJECTED' end,
    'dealer_application', v_application.id, jsonb_build_object('membership_id', v_application.membership_id));
  return v_application;
end;
$$;

revoke all on function public.request_dealer_access(text) from public;
revoke all on function public.get_my_dealer_application() from public;
revoke all on function public.list_pending_dealer_applications() from public;
revoke all on function public.review_dealer_application(uuid, boolean) from public;
grant execute on function public.request_dealer_access(text) to authenticated;
grant execute on function public.get_my_dealer_application() to authenticated;
grant execute on function public.list_pending_dealer_applications() to authenticated;
grant execute on function public.review_dealer_application(uuid, boolean) to authenticated;

commit;
