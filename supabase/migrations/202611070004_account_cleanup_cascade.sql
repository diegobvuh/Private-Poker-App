begin;

alter table public.accounts
  drop constraint accounts_membership_id_fkey,
  add constraint accounts_membership_id_fkey
    foreign key (membership_id) references public.club_memberships(id) on delete cascade;

commit;
