begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.club_role as enum ('owner', 'dealer', 'player');
create type public.membership_status as enum ('INVITED', 'ACTIVE', 'SUSPENDED');
create type public.balance_kind as enum ('IRL_REAL_VALUE', 'PRACTICE_CHIPS', 'FRACTIONAL_REMAINDER');
create type public.ledger_event_type as enum ('BUY_IN', 'REBUY', 'CASH_OUT', 'PRACTICE_GRANT', 'PRACTICE_WAGER', 'PRACTICE_WIN', 'CORRECTION', 'FRACTIONAL_CARRY');
create type public.game_kind as enum ('IRL_HOLDEM_FAST', 'IRL_HOLDEM_LIVE', 'PRACTICE_HOLDEM', 'PRACTICE_BLACKJACK', 'PRACTICE_SPEED');
create type public.game_status as enum ('LOBBY', 'ACTIVE', 'PAUSED', 'SETTLED', 'CANCELLED');
create type public.command_status as enum ('ACCEPTED', 'REJECTED');

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  venue_label text not null default 'Private residence' check (char_length(venue_label) between 1 and 80),
  timezone text not null default 'America/Los_Angeles',
  no_rake boolean not null default true check (no_rake),
  created_at timestamptz not null default now()
);

comment on table public.clubs is 'One private household club. No public discovery or venue address is stored.';

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.club_role not null default 'player',
  status public.membership_status not null default 'ACTIVE',
  display_name text not null check (char_length(display_name) between 1 and 48),
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table public.club_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  email_normalized text not null check (email_normalized = lower(email_normalized)),
  role public.club_role not null default 'player',
  token_hash bytea not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete restrict,
  kind public.game_kind not null,
  name text not null check (char_length(name) between 1 and 80),
  status public.game_status not null default 'LOBBY',
  mode_version integer not null default 1 check (mode_version > 0),
  state_version bigint not null default 0 check (state_version >= 0),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  started_at timestamptz,
  settled_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check ((status = 'SETTLED' and settled_at is not null) or status <> 'SETTLED')
);

create unique index one_open_irl_session on public.game_sessions (club_id)
where kind in ('IRL_HOLDEM_FAST', 'IRL_HOLDEM_LIVE') and status in ('LOBBY', 'ACTIVE', 'PAUSED');

create table public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete restrict,
  membership_id uuid not null references public.club_memberships(id) on delete restrict,
  seat_number smallint check (seat_number between 1 and 10),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'ACTIVE', 'AWAY', 'CASHED_OUT', 'DECLINED')),
  approved_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique (session_id, membership_id),
  unique nulls not distinct (session_id, seat_number)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete restrict,
  membership_id uuid not null references public.club_memberships(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (club_id, membership_id)
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete restrict,
  session_id uuid references public.game_sessions(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  kind public.balance_kind not null,
  event_type public.ledger_event_type not null,
  amount_millicents bigint not null check (amount_millicents <> 0),
  idempotency_key uuid not null,
  correlation_id uuid not null default gen_random_uuid(),
  reverses_entry_id uuid unique references public.ledger_entries(id) on delete restrict,
  note text check (note is null or char_length(note) <= 240),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (club_id, idempotency_key),
  check (
    (kind = 'IRL_REAL_VALUE' and event_type in ('BUY_IN', 'REBUY', 'CASH_OUT', 'CORRECTION')) or
    (kind = 'PRACTICE_CHIPS' and event_type in ('PRACTICE_GRANT', 'PRACTICE_WAGER', 'PRACTICE_WIN', 'CORRECTION')) or
    (kind = 'FRACTIONAL_REMAINDER' and event_type in ('FRACTIONAL_CARRY', 'CORRECTION'))
  ),
  check ((event_type = 'CORRECTION') = (reverses_entry_id is not null))
);

create index ledger_account_kind_created on public.ledger_entries (account_id, kind, created_at);
create index ledger_session_created on public.ledger_entries (session_id, created_at);

create view public.account_balances with (security_invoker = true) as
select account_id, kind, sum(amount_millicents)::bigint as balance_millicents
from public.ledger_entries
group by account_id, kind;

create table public.join_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.game_commands (
  id uuid primary key,
  game_id uuid not null references public.game_sessions(id) on delete restrict,
  actor_id uuid not null references auth.users(id),
  expected_version bigint not null check (expected_version >= 0),
  command_type text not null check (command_type in ('START_GAME', 'PAUSE_GAME', 'RESUME_GAME', 'PLAYER_ACTION', 'RECORD_CHECKPOINT', 'SETTLE_GAME')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status public.command_status not null,
  rejection_code text,
  accepted_version bigint,
  created_at timestamptz not null default now(),
  check ((status = 'ACCEPTED' and accepted_version is not null and rejection_code is null) or (status = 'REJECTED' and accepted_version is null and rejection_code is not null))
);

create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game_sessions(id) on delete restrict,
  version bigint not null check (version > 0),
  event_type text not null,
  public_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(public_payload) = 'object'),
  command_id uuid not null unique references public.game_commands(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (game_id, version)
);

create table public.private_game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game_sessions(id) on delete restrict,
  version bigint not null check (version > 0),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (game_id, version, recipient_user_id)
);

create table public.shuffle_receipts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game_sessions(id) on delete restrict,
  hand_number integer not null check (hand_number > 0),
  commitment text not null check (commitment ~ '^[a-f0-9]{64}$'),
  revealed_seed text check (revealed_seed is null or revealed_seed ~ '^[a-f0-9]{64}$'),
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game_id, hand_number),
  check ((revealed_seed is null and revealed_at is null) or (revealed_seed is not null and revealed_at is not null))
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  club_id uuid not null references public.clubs(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function private.user_club_role(requested_club_id uuid)
returns public.club_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.club_memberships
  where club_id = requested_club_id
    and user_id = (select auth.uid())
    and status = 'ACTIVE'
  limit 1
$$;

create or replace function private.is_club_member(requested_club_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$ select private.user_club_role(requested_club_id) is not null $$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.user_club_role(uuid) from public;
revoke all on function private.is_club_member(uuid) from public;
grant execute on function private.user_club_role(uuid) to authenticated;
grant execute on function private.is_club_member(uuid) to authenticated;

create or replace function private.reject_immutable_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'immutable_record' using errcode = '23000';
end $$;

create trigger ledger_entries_immutable before update or delete on public.ledger_entries
for each row execute function private.reject_immutable_mutation();
create trigger game_commands_immutable before update or delete on public.game_commands
for each row execute function private.reject_immutable_mutation();
create trigger game_events_immutable before update or delete on public.game_events
for each row execute function private.reject_immutable_mutation();
create trigger private_game_events_immutable before update or delete on public.private_game_events
for each row execute function private.reject_immutable_mutation();
create trigger audit_log_immutable before update or delete on public.audit_log
for each row execute function private.reject_immutable_mutation();

create or replace function public.append_ledger_entry(
  p_account_id uuid,
  p_session_id uuid,
  p_kind public.balance_kind,
  p_event_type public.ledger_event_type,
  p_amount_millicents bigint,
  p_idempotency_key uuid,
  p_note text default null,
  p_reverses_entry_id uuid default null
) returns public.ledger_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.accounts;
  v_session public.game_sessions;
  v_original public.ledger_entries;
  v_result public.ledger_entries;
  v_role public.club_role;
begin
  if p_amount_millicents = 0 or abs(p_amount_millicents) > 1000000000000 then raise exception 'invalid_amount'; end if;
  if p_note is not null and char_length(p_note) > 240 then raise exception 'note_too_long'; end if;
  select * into v_account from public.accounts where id = p_account_id;
  select * into v_session from public.game_sessions where id = p_session_id;
  if v_account.id is null or v_session.id is null or v_account.club_id <> v_session.club_id then raise exception 'scope_mismatch'; end if;
  v_role := private.user_club_role(v_account.club_id);
  if v_role not in ('owner', 'dealer') then raise exception 'forbidden'; end if;
  select * into v_result from public.ledger_entries where club_id = v_account.club_id and idempotency_key = p_idempotency_key;
  if v_result.id is not null then return v_result; end if;
  if p_event_type = 'CORRECTION' then
    select * into v_original from public.ledger_entries where id = p_reverses_entry_id and club_id = v_account.club_id;
    if v_original.id is null or v_original.reverses_entry_id is not null or p_amount_millicents <> -v_original.amount_millicents or p_kind <> v_original.kind then raise exception 'invalid_correction'; end if;
  elsif p_reverses_entry_id is not null then raise exception 'unexpected_reversal';
  end if;
  insert into public.ledger_entries (club_id, session_id, account_id, kind, event_type, amount_millicents, idempotency_key, reverses_entry_id, note, created_by)
  values (v_account.club_id, p_session_id, p_account_id, p_kind, p_event_type, p_amount_millicents, p_idempotency_key, p_reverses_entry_id, p_note, auth.uid())
  returning * into v_result;
  insert into public.audit_log (club_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_account.club_id, auth.uid(), 'LEDGER_ENTRY_APPENDED', 'ledger_entry', v_result.id, jsonb_build_object('event_type', p_event_type, 'kind', p_kind));
  return v_result;
end $$;

create or replace function public.submit_game_command(
  p_command_id uuid,
  p_game_id uuid,
  p_expected_version bigint,
  p_command_type text,
  p_payload jsonb
) returns public.game_commands
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.game_sessions;
  v_command public.game_commands;
  v_role public.club_role;
  v_next_version bigint;
begin
  select * into v_game from public.game_sessions where id = p_game_id for update;
  if v_game.id is null then raise exception 'game_not_found'; end if;
  v_role := private.user_club_role(v_game.club_id);
  if v_role is null then raise exception 'forbidden'; end if;
  select * into v_command from public.game_commands where id = p_command_id and game_id = p_game_id;
  if v_command.id is not null then return v_command; end if;
  if p_command_type not in ('START_GAME', 'PAUSE_GAME', 'RESUME_GAME', 'PLAYER_ACTION', 'RECORD_CHECKPOINT', 'SETTLE_GAME') then raise exception 'invalid_command'; end if;
  if p_command_type <> 'PLAYER_ACTION' and v_role not in ('owner', 'dealer') then raise exception 'forbidden'; end if;
  if p_expected_version <> v_game.state_version then
    insert into public.game_commands (id, game_id, actor_id, expected_version, command_type, payload, status, rejection_code)
    values (p_command_id, p_game_id, auth.uid(), p_expected_version, p_command_type, coalesce(p_payload, '{}'::jsonb), 'REJECTED', 'VERSION_CONFLICT') returning * into v_command;
    return v_command;
  end if;
  v_next_version := v_game.state_version + 1;
  update public.game_sessions set state_version = v_next_version,
    status = case p_command_type when 'START_GAME' then 'ACTIVE'::public.game_status when 'PAUSE_GAME' then 'PAUSED'::public.game_status when 'RESUME_GAME' then 'ACTIVE'::public.game_status when 'SETTLE_GAME' then 'SETTLED'::public.game_status else status end,
    started_at = case when p_command_type = 'START_GAME' then coalesce(started_at, now()) else started_at end,
    settled_at = case when p_command_type = 'SETTLE_GAME' then now() else settled_at end
  where id = p_game_id;
  insert into public.game_commands (id, game_id, actor_id, expected_version, command_type, payload, status, accepted_version)
  values (p_command_id, p_game_id, auth.uid(), p_expected_version, p_command_type, coalesce(p_payload, '{}'::jsonb), 'ACCEPTED', v_next_version) returning * into v_command;
  insert into public.game_events (game_id, version, event_type, public_payload, command_id)
  values (p_game_id, v_next_version, p_command_type, coalesce(p_payload, '{}'::jsonb), p_command_id);
  insert into public.audit_log (club_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_game.club_id, auth.uid(), 'GAME_COMMAND_ACCEPTED', 'game_session', p_game_id, jsonb_build_object('version', v_next_version, 'command_type', p_command_type));
  return v_command;
end $$;

revoke all on function public.append_ledger_entry(uuid, uuid, public.balance_kind, public.ledger_event_type, bigint, uuid, text, uuid) from public;
revoke all on function public.submit_game_command(uuid, uuid, bigint, text, jsonb) from public;
grant execute on function public.append_ledger_entry(uuid, uuid, public.balance_kind, public.ledger_event_type, bigint, uuid, text, uuid) to authenticated;
grant execute on function public.submit_game_command(uuid, uuid, bigint, text, jsonb) to authenticated;

alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.club_invitations enable row level security;
alter table public.game_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.accounts enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.join_tokens enable row level security;
alter table public.game_commands enable row level security;
alter table public.game_events enable row level security;
alter table public.private_game_events enable row level security;
alter table public.shuffle_receipts enable row level security;
alter table public.audit_log enable row level security;

create policy clubs_member_select on public.clubs for select to authenticated using (private.is_club_member(id));
create policy memberships_member_select on public.club_memberships for select to authenticated using (private.is_club_member(club_id));
create policy memberships_owner_manage on public.club_memberships for all to authenticated using (private.user_club_role(club_id) = 'owner') with check (private.user_club_role(club_id) = 'owner');
create policy invitations_owner_manage on public.club_invitations for all to authenticated using (private.user_club_role(club_id) = 'owner') with check (private.user_club_role(club_id) = 'owner');
create policy sessions_member_select on public.game_sessions for select to authenticated using (private.is_club_member(club_id));
create policy sessions_dealer_create on public.game_sessions for insert to authenticated with check (private.user_club_role(club_id) in ('owner', 'dealer') and created_by = auth.uid());
create policy session_members_member_select on public.session_members for select to authenticated using (exists (select 1 from public.game_sessions g where g.id = session_id and private.is_club_member(g.club_id)));
create policy session_members_dealer_manage on public.session_members for all to authenticated using (exists (select 1 from public.game_sessions g where g.id = session_id and private.user_club_role(g.club_id) in ('owner', 'dealer'))) with check (exists (select 1 from public.game_sessions g where g.id = session_id and private.user_club_role(g.club_id) in ('owner', 'dealer')));
create policy accounts_member_select on public.accounts for select to authenticated using (private.is_club_member(club_id));
create policy ledger_member_select on public.ledger_entries for select to authenticated using (private.is_club_member(club_id));
create policy join_tokens_dealer_select on public.join_tokens for select to authenticated using (exists (select 1 from public.game_sessions g where g.id = session_id and private.user_club_role(g.club_id) in ('owner', 'dealer')));
create policy commands_member_select on public.game_commands for select to authenticated using (exists (select 1 from public.game_sessions g where g.id = game_id and private.is_club_member(g.club_id)));
create policy events_member_select on public.game_events for select to authenticated using (exists (select 1 from public.game_sessions g where g.id = game_id and private.is_club_member(g.club_id)));
create policy private_events_recipient_select on public.private_game_events for select to authenticated using (recipient_user_id = auth.uid());
create policy receipts_member_select on public.shuffle_receipts for select to authenticated using (exists (select 1 from public.game_sessions g where g.id = game_id and private.is_club_member(g.club_id)));
create policy audit_owner_dealer_select on public.audit_log for select to authenticated using (private.user_club_role(club_id) in ('owner', 'dealer'));

grant select on public.account_balances to authenticated;
grant select on public.clubs, public.club_memberships, public.game_sessions, public.session_members, public.accounts, public.ledger_entries, public.game_commands, public.game_events, public.private_game_events, public.shuffle_receipts, public.audit_log to authenticated;

alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.session_members;
alter publication supabase_realtime add table public.ledger_entries;
alter publication supabase_realtime add table public.game_events;
alter publication supabase_realtime add table public.private_game_events;

insert into public.clubs (id, name, venue_label)
values ('00000000-0000-4000-8000-000000000001', 'Friday Night', 'Private residence')
on conflict (id) do nothing;

commit;
