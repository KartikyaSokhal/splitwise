-- Split foundation. Apply through migrations, never from a mobile client.
-- Auth identifies the caller; every RPC independently authorizes the operation.
begin;
revoke create on schema public from public,anon,authenticated;
create schema if not exists split_private;
revoke all on schema split_private from public, anon, authenticated;
grant usage on schema split_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null default 'Member' check (length(btrim(display_name)) between 1 and 100 and display_name !~ '[[:cntrl:]]' and display_name !~ U&'[\202A-\202E\2066-\2069]'),
  created_at timestamptz not null default now()
);
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(btrim(name)) between 1 and 100 and name !~ '[[:cntrl:]]' and name !~ U&'[\202A-\202E\2066-\2069]'),
  created_by uuid not null references public.profiles(id),
  request_key uuid not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(created_by,request_key)
);
-- Persons are group-scoped financial identities, not accounts. A null user_id is a guest.
create table public.persons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  user_id uuid references public.profiles(id),
  display_name text not null check(length(btrim(display_name)) between 1 and 100 and display_name !~ '[[:cntrl:]]' and display_name !~ U&'[\202A-\202E\2066-\2069]'),
  created_at timestamptz not null default now(),
  unique(group_id,id), unique(group_id,user_id)
);
create table public.group_members (
  group_id uuid not null,
  person_id uuid not null,
  role text not null default 'member' check(role in ('admin','member')),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key(group_id,person_id),
  foreign key(group_id,person_id) references public.persons(group_id,id)
);
create table public.member_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  person_id uuid not null,
  target_user_id uuid not null references public.profiles(id),
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now()+interval '7 days'),
  accepted_at timestamptz,
  foreign key(group_id,person_id) references public.group_members(group_id,person_id)
);
create unique index member_invites_pending on public.member_invites(group_id,person_id) where accepted_at is null;
create index member_invites_target on public.member_invites(target_user_id);
create index persons_user_groups on public.persons(user_id,group_id) where user_id is not null;
create index groups_creator on public.groups(created_by);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  description text not null check(length(btrim(description)) between 1 and 500 and description !~ '[[:cntrl:]]' and description !~ U&'[\202A-\202E\2066-\2069]'),
  total_minor bigint not null check(total_minor between 0 and 9007199254740991),
  currency text not null default 'INR' check(currency='INR'),
  created_by uuid not null references public.profiles(id),
  request_key uuid not null,
  request_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique(group_id,id), unique(group_id,created_by,request_key)
);
create index expenses_group_time on public.expenses(group_id,created_at,id);
create table public.payments (
  group_id uuid not null,
  expense_id uuid not null,
  payer_id uuid not null,
  amount_minor bigint not null check(amount_minor between 1 and 9007199254740991),
  primary key(expense_id,payer_id),
  foreign key(group_id,expense_id) references public.expenses(group_id,id),
  foreign key(group_id,payer_id) references public.group_members(group_id,person_id)
);
create index payments_group on public.payments(group_id);
create table public.shares (
  group_id uuid not null,
  expense_id uuid not null,
  person_id uuid not null,
  amount_minor bigint not null check(amount_minor between 0 and 9007199254740991),
  primary key(expense_id,person_id),
  foreign key(group_id,expense_id) references public.expenses(group_id,id),
  foreign key(group_id,person_id) references public.group_members(group_id,person_id)
);
create index shares_group on public.shares(group_id);
create table public.expense_voids (
  expense_id uuid primary key,
  group_id uuid not null,
  recorded_by uuid not null references public.profiles(id),
  reason text not null check(length(btrim(reason)) between 1 and 500 and reason !~ '[[:cntrl:]]' and reason !~ U&'[\202A-\202E\2066-\2069]'),
  created_at timestamptz not null default now(),
  foreign key(group_id,expense_id) references public.expenses(group_id,id)
);
create index expense_voids_group on public.expense_voids(group_id);
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  from_person_id uuid not null,
  to_person_id uuid not null,
  amount_minor bigint not null check(amount_minor between 1 and 9007199254740991),
  recorded_by uuid not null references public.profiles(id),
  request_key uuid not null,
  created_at timestamptz not null default now(),
  check(from_person_id<>to_person_id),
  foreign key(group_id,from_person_id) references public.group_members(group_id,person_id),
  foreign key(group_id,to_person_id) references public.group_members(group_id,person_id),
  unique(group_id,id), unique(group_id,recorded_by,request_key)
);
create index settlements_group_time on public.settlements(group_id,created_at,id);
create table public.settlement_reversals (
  settlement_id uuid primary key,
  group_id uuid not null,
  recorded_by uuid not null references public.profiles(id),
  reason text not null check(length(btrim(reason)) between 1 and 500 and reason !~ '[[:cntrl:]]' and reason !~ U&'[\202A-\202E\2066-\2069]'),
  created_at timestamptz not null default now(),
  foreign key(group_id,settlement_id) references public.settlements(group_id,id)
);
create index settlement_reversals_group on public.settlement_reversals(group_id);

-- Financial records are append-only even if a future migration accidentally grants writes.
-- Corrections are separate authorized events. Privileged maintenance needs explicit review.
create function split_private.immutable_financial_row() returns trigger
language plpgsql set search_path='' as $$
begin raise exception 'Financial history is immutable; use a correction event' using errcode='55000'; end $$;
do $$ declare t text; begin
  foreach t in array array['expenses','payments','shares','expense_voids','settlements','settlement_reversals'] loop
    execute format('create trigger split_immutable before update or delete on public.%I for each row execute function split_private.immutable_financial_row()',t);
  end loop;
end $$;

create function split_private.new_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id) values(new.id) on conflict(id) do nothing;
  return new;
end $$;
create trigger split_new_profile after insert on auth.users for each row execute function split_private.new_profile();
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;

-- These two read-only helpers bypass recursive membership RLS, not authorization.
create function split_private.is_member(g uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.group_members m join public.persons p on p.id=m.person_id and p.group_id=m.group_id
    where m.group_id=g and m.active and p.user_id=auth.uid());
$$;
create function split_private.is_admin(g uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.group_members m join public.persons p on p.id=m.person_id and p.group_id=m.group_id
    where m.group_id=g and m.active and m.role='admin' and p.user_id=auth.uid());
$$;
create function split_private.lock_group(g uuid, admin_required boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
  -- All membership/financial RPCs lock this same row to serialize authorization + writes.
  perform 1 from public.groups where id=g for update;
  if not found or not split_private.is_member(g) or (admin_required and not split_private.is_admin(g)) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if (select archived from public.groups where id=g) then raise exception 'Group is archived' using errcode='22023'; end if;
end $$;

-- Exact numeric aggregates; never DOUBLE PRECISION. Include inactive people's history.
create function split_private.balances(g uuid) returns table(person_id uuid,balance numeric)
language sql stable security definer set search_path='' as $$
  with entries as (
    select p.payer_id as person_id,p.amount_minor::numeric as amount from public.payments p
      where p.group_id=g and not exists(select 1 from public.expense_voids v where v.expense_id=p.expense_id)
    union all select s.person_id,-s.amount_minor::numeric from public.shares s
      where s.group_id=g and not exists(select 1 from public.expense_voids v where v.expense_id=s.expense_id)
    union all select s.from_person_id,s.amount_minor::numeric from public.settlements s
      where s.group_id=g and not exists(select 1 from public.settlement_reversals r where r.settlement_id=s.id)
    union all select s.to_person_id,-s.amount_minor::numeric from public.settlements s
      where s.group_id=g and not exists(select 1 from public.settlement_reversals r where r.settlement_id=s.id)
  ) select m.person_id,coalesce(sum(e.amount),0) from public.group_members m
    left join entries e on e.person_id=m.person_id where m.group_id=g group by m.person_id;
$$;
create function split_private.check_balances(g uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from split_private.balances(g) where abs(balance)>9007199254740991) or
     (select coalesce(sum(balance),0) from split_private.balances(g))<>0 then
    raise exception 'Unsupported or unconserved group balance' using errcode='22023';
  end if;
end $$;

-- Defense against future accidental direct writes too: deferred cross-row invariants.
create function split_private.check_expense() returns trigger
language plpgsql security definer set search_path='' as $$
declare e uuid; t bigint;
begin
  if tg_table_name='expenses' then e=coalesce(new.id,old.id); else e=coalesce(new.expense_id,old.expense_id); end if;
  select total_minor into t from public.expenses where id=e;
  if found and (coalesce((select sum(amount_minor) from public.payments where expense_id=e),0)<>t or
                coalesce((select sum(amount_minor) from public.shares where expense_id=e),0)<>t) then
    raise exception 'Expense allocations must equal total' using errcode='23514';
  end if;
  return null;
end $$;
create constraint trigger split_expense_conservation after insert or update or delete on public.expenses
  deferrable initially deferred for each row execute function split_private.check_expense();
create constraint trigger split_payment_conservation after insert or update or delete on public.payments
  deferrable initially deferred for each row execute function split_private.check_expense();
create constraint trigger split_share_conservation after insert or update or delete on public.shares
  deferrable initially deferred for each row execute function split_private.check_expense();

create function public.split_update_profile(p_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  update public.profiles set display_name=p_name where id=auth.uid();
end $$;
create function public.split_create_group(p_name text,p_request_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); g uuid; person uuid; previous_name text;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  -- A per-user lock also makes idempotent creation and quotas race-safe.
  perform 1 from public.profiles where id=actor for update;
  if not found then raise exception 'Profile unavailable' using errcode='42501'; end if;
  select id,name into g,previous_name from public.groups where created_by=actor and request_key=p_request_key;
  if found then
    if previous_name is distinct from p_name then raise exception 'Conflicting request' using errcode='22023'; end if;
    return g;
  end if;
  if (select count(*) from public.groups where created_by=actor)>=100 then raise exception 'Group limit reached' using errcode='22023'; end if;
  insert into public.groups(name,created_by,request_key) values(p_name,actor,p_request_key) returning id into g;
  insert into public.persons(group_id,user_id,display_name) select g,actor,display_name from public.profiles where id=actor returning id into person;
  insert into public.group_members(group_id,person_id,role) values(g,person,'admin');
  return g;
end $$;
create function public.split_add_guest(p_group_id uuid,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare person uuid;
begin
  perform split_private.lock_group(p_group_id,true);
  if (select count(*) from public.group_members where group_id=p_group_id)>=200 then raise exception 'Member limit reached' using errcode='22023'; end if;
  insert into public.persons(group_id,display_name) values(p_group_id,p_name) returning id into person;
  insert into public.group_members(group_id,person_id) values(p_group_id,person);
  return person;
end $$;
create function public.split_invite_member(p_group_id uuid,p_person_id uuid,p_target_user_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare invitation uuid;
begin
  perform split_private.lock_group(p_group_id,true);
  if not exists(select 1 from public.persons p join public.group_members m on m.group_id=p.group_id and m.person_id=p.id
                where p.group_id=p_group_id and p.id=p_person_id and p.user_id is null and m.active) then
    raise exception 'Participant cannot be linked' using errcode='22023';
  end if;
  -- Revoking/reissuing invalidates the old invitation; possession alone never grants access.
  delete from public.member_invites where group_id=p_group_id and person_id=p_person_id and accepted_at is null;
  insert into public.member_invites(group_id,person_id,target_user_id,invited_by)
    values(p_group_id,p_person_id,p_target_user_id,auth.uid()) returning id into invitation;
  return invitation;
end $$;
create function public.split_accept_invite(p_invite_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare invitation public.member_invites; g uuid;
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  select group_id into g from public.member_invites where id=p_invite_id and target_user_id=auth.uid();
  if not found then raise exception 'Not authorized' using errcode='42501'; end if;
  perform 1 from public.groups where id=g and not archived for update;
  if not found then raise exception 'Invitation unavailable' using errcode='22023'; end if;
  select * into invitation from public.member_invites where id=p_invite_id and target_user_id=auth.uid() for update;
  if not found or invitation.expires_at<=now() then raise exception 'Invitation unavailable' using errcode='22023'; end if;
  if invitation.accepted_at is not null then
    if split_private.is_member(g) then return invitation.person_id; end if;
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  if not exists(select 1 from public.group_members m join public.persons p on p.id=m.person_id and p.group_id=m.group_id
                where m.group_id=g and m.active and m.role='admin' and p.user_id=invitation.invited_by) then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  if not exists(select 1 from public.group_members where group_id=g and person_id=invitation.person_id and active) then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  update public.persons set user_id=auth.uid() where id=invitation.person_id and group_id=g and user_id is null;
  if not found then raise exception 'Participant already linked' using errcode='22023'; end if;
  update public.member_invites set accepted_at=now() where id=p_invite_id;
  return invitation.person_id;
end $$;
create function public.split_change_member(p_group_id uuid,p_person_id uuid,p_active boolean,p_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform split_private.lock_group(p_group_id,true);
  if p_active is null or p_role is null or p_role not in ('admin','member') then raise exception 'Invalid membership' using errcode='22023'; end if;
  if p_role='admin' and not exists(select 1 from public.persons where group_id=p_group_id and id=p_person_id and user_id is not null) then
    raise exception 'Admin requires an account' using errcode='22023';
  end if;
  update public.group_members set active=p_active,role=p_role where group_id=p_group_id and person_id=p_person_id;
  if not found then raise exception 'Member unavailable' using errcode='22023'; end if;
  if not exists(select 1 from public.group_members where group_id=p_group_id and active and role='admin') then
    raise exception 'At least one active admin is required' using errcode='22023';
  end if;
end $$;
create function public.split_update_group(p_group_id uuid,p_name text,p_archive boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform split_private.lock_group(p_group_id,true);
  update public.groups set name=p_name,archived=p_archive where id=p_group_id;
end $$;

create function split_private.validate_entries(g uuid,entries jsonb,id_key text,positive boolean) returns numeric
language plpgsql security definer set search_path='' as $$
declare entry jsonb; person uuid; amount bigint; ids uuid[]='{}'; total numeric=0;
begin
  if entries is null or jsonb_typeof(entries)<>'array' then raise exception 'Allocations must be arrays' using errcode='22023'; end if;
  if jsonb_array_length(entries)>200 then raise exception 'Too many allocations' using errcode='22023'; end if;
  for entry in select value from jsonb_array_elements(entries) loop
    if jsonb_typeof(entry)<>'object' or jsonb_typeof(entry->id_key) is distinct from 'string' or
       jsonb_typeof(entry->'amountMinor') is distinct from 'number' then raise exception 'Invalid allocation shape' using errcode='22023'; end if;
    if (select count(*) from jsonb_object_keys(entry))<>2 or (entry->>'amountMinor') !~ '^(0|[1-9][0-9]{0,15})$' then
      raise exception 'Invalid allocation' using errcode='22023';
    end if;
    person=(entry->>id_key)::uuid; amount=(entry->>'amountMinor')::bigint;
    if amount>9007199254740991 or (positive and amount=0) or person=any(ids) then raise exception 'Invalid amount or duplicate participant' using errcode='22023'; end if;
    if not exists(select 1 from public.group_members where group_id=g and person_id=person and active) then
      raise exception 'Participant not active in group' using errcode='22023';
    end if;
    ids=array_append(ids,person);total=total+amount;
  end loop;
  return total;
end $$;
create function public.split_create_expense(p_group_id uuid,p_request_key uuid,p_description text,p_total_minor bigint,p_payments jsonb,p_shares jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare e uuid; payload jsonb; previous jsonb;
begin
  perform split_private.lock_group(p_group_id);
  payload=jsonb_build_object('description',p_description,'totalMinor',p_total_minor,'payments',p_payments,'shares',p_shares);
  select id,request_payload into e,previous from public.expenses where group_id=p_group_id and created_by=auth.uid() and request_key=p_request_key;
  if found then
    if previous is distinct from payload then raise exception 'Conflicting request' using errcode='22023'; end if;
    return e;
  end if;
  if p_total_minor is null or p_total_minor<0 or p_total_minor>9007199254740991 then raise exception 'Invalid total' using errcode='22023'; end if;
  if split_private.validate_entries(p_group_id,p_payments,'payerId',true)<>p_total_minor or
     split_private.validate_entries(p_group_id,p_shares,'personId',false)<>p_total_minor then
    raise exception 'Allocations must equal total' using errcode='22023';
  end if;
  insert into public.expenses(group_id,description,total_minor,created_by,request_key,request_payload)
    values(p_group_id,p_description,p_total_minor,auth.uid(),p_request_key,payload) returning id into e;
  insert into public.payments(group_id,expense_id,payer_id,amount_minor)
    select p_group_id,e,(x->>'payerId')::uuid,(x->>'amountMinor')::bigint from jsonb_array_elements(p_payments) x;
  insert into public.shares(group_id,expense_id,person_id,amount_minor)
    select p_group_id,e,(x->>'personId')::uuid,(x->>'amountMinor')::bigint from jsonb_array_elements(p_shares) x;
  perform split_private.check_balances(p_group_id);
  return e;
end $$;
create function public.split_void_expense(p_group_id uuid,p_expense_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform split_private.lock_group(p_group_id);
  if not exists(select 1 from public.expenses where group_id=p_group_id and id=p_expense_id and
    (created_by=auth.uid() or split_private.is_admin(p_group_id))) then raise exception 'Not authorized' using errcode='42501'; end if;
  if exists(select 1 from public.expense_voids where expense_id=p_expense_id) then
    if (select reason from public.expense_voids where expense_id=p_expense_id) is distinct from p_reason then raise exception 'Conflicting reversal' using errcode='22023'; end if;
    return;
  end if;
  insert into public.expense_voids(expense_id,group_id,recorded_by,reason) values(p_expense_id,p_group_id,auth.uid(),p_reason);
  perform split_private.check_balances(p_group_id);
end $$;
create function public.split_record_settlement(p_group_id uuid,p_request_key uuid,p_from_person_id uuid,p_to_person_id uuid,p_amount_minor bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.settlements; result uuid; debt numeric; credit numeric;
begin
  perform split_private.lock_group(p_group_id);
  if not exists(select 1 from public.persons p join public.group_members m on m.person_id=p.id and m.group_id=p.group_id
    where p.group_id=p_group_id and p.id=p_from_person_id and p.user_id=auth.uid() and m.active) then raise exception 'Only the sender may record a payment' using errcode='42501'; end if;
  select * into previous from public.settlements where group_id=p_group_id and recorded_by=auth.uid() and request_key=p_request_key;
  if found then
    if previous.from_person_id is distinct from p_from_person_id or previous.to_person_id is distinct from p_to_person_id or previous.amount_minor is distinct from p_amount_minor then
      raise exception 'Conflicting request' using errcode='22023';
    end if;
    return previous.id;
  end if;
  if p_amount_minor is null or p_amount_minor<=0 or p_amount_minor>9007199254740991 or p_from_person_id=p_to_person_id or
     not exists(select 1 from public.group_members where group_id=p_group_id and person_id=p_to_person_id and active) then raise exception 'Invalid transfer' using errcode='22023'; end if;
  select -balance into debt from split_private.balances(p_group_id) where person_id=p_from_person_id;
  select balance into credit from split_private.balances(p_group_id) where person_id=p_to_person_id;
  if debt is null or credit is null or p_amount_minor>debt or p_amount_minor>credit then raise exception 'Transfer exceeds current debt or credit' using errcode='22023'; end if;
  insert into public.settlements(group_id,from_person_id,to_person_id,amount_minor,recorded_by,request_key)
    values(p_group_id,p_from_person_id,p_to_person_id,p_amount_minor,auth.uid(),p_request_key) returning id into result;
  perform split_private.check_balances(p_group_id);
  return result;
end $$;
create function public.split_reverse_settlement(p_group_id uuid,p_settlement_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform split_private.lock_group(p_group_id);
  if not exists(select 1 from public.settlements where group_id=p_group_id and id=p_settlement_id and
    (recorded_by=auth.uid() or split_private.is_admin(p_group_id))) then raise exception 'Not authorized' using errcode='42501'; end if;
  if exists(select 1 from public.settlement_reversals where settlement_id=p_settlement_id) then
    if (select reason from public.settlement_reversals where settlement_id=p_settlement_id) is distinct from p_reason then raise exception 'Conflicting reversal' using errcode='22023'; end if;
    return;
  end if;
  insert into public.settlement_reversals(settlement_id,group_id,recorded_by,reason) values(p_settlement_id,p_group_id,auth.uid(),p_reason);
  perform split_private.check_balances(p_group_id);
end $$;
create function public.split_get_balances(p_group_id uuid) returns table(person_id uuid,balance_minor text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not split_private.is_member(p_group_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  return query select b.person_id,b.balance::text from split_private.balances(p_group_id) b order by b.person_id;
end $$;

-- Every table has RLS. Ordinary clients have SELECT only; no mutation policies.
-- Writes must pass through the narrowly granted RPCs above.
do $$ declare t text; begin
  foreach t in array array['profiles','groups','persons','group_members','member_invites','expenses','payments','shares','expense_voids','settlements','settlement_reversals'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated',t);
    execute format('grant select on table public.%I to authenticated',t);
  end loop;
end $$;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy group_read on public.groups for select to authenticated using(split_private.is_member(id));
create policy person_read on public.persons for select to authenticated using(split_private.is_member(group_id));
create policy membership_read on public.group_members for select to authenticated using(split_private.is_member(group_id));
create policy invitation_read on public.member_invites for select to authenticated using(target_user_id=(select auth.uid()) or split_private.is_admin(group_id));
create policy expense_read on public.expenses for select to authenticated using(split_private.is_member(group_id));
create policy payment_read on public.payments for select to authenticated using(split_private.is_member(group_id));
create policy share_read on public.shares for select to authenticated using(split_private.is_member(group_id));
create policy expense_void_read on public.expense_voids for select to authenticated using(split_private.is_member(group_id));
create policy settlement_read on public.settlements for select to authenticated using(split_private.is_member(group_id));
create policy reversal_read on public.settlement_reversals for select to authenticated using(split_private.is_member(group_id));

revoke all on all functions in schema split_private from public,anon,authenticated;
grant execute on function split_private.is_member(uuid),split_private.is_admin(uuid) to authenticated;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('split_update_profile','split_create_group','split_add_guest','split_invite_member','split_accept_invite','split_change_member','split_update_group','split_create_expense','split_void_expense','split_record_settlement','split_reverse_settlement','split_get_balances') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;
commit;
