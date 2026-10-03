-- DueShare additive integration. Never rewrite the deployed foundation.
begin;

-- Creation retries must not compare against a subsequently renamed group.
-- Legacy rows can only be backfilled from the currently stored name.
alter table public.groups add column creation_name text;
update public.groups set creation_name=name;
alter table public.groups alter column creation_name set not null;
create or replace function public.split_create_group(p_name text,p_request_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); g uuid; person uuid; previous_name text;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  perform 1 from public.profiles where id=actor for update;
  if not found then raise exception 'Profile unavailable' using errcode='42501'; end if;
  select id,creation_name into g,previous_name from public.groups where created_by=actor and request_key=p_request_key;
  if found then
    if previous_name is distinct from p_name then raise exception 'Conflicting request' using errcode='22023'; end if;
    return g;
  end if;
  if (select count(*) from public.groups where created_by=actor)>=100 then raise exception 'Group limit reached' using errcode='22023'; end if;
  insert into public.groups(name,creation_name,created_by,request_key) values(p_name,p_name,actor,p_request_key) returning id into g;
  insert into public.persons(group_id,user_id,display_name) select g,actor,display_name from public.profiles where id=actor returning id into person;
  insert into public.group_members(group_id,person_id,role) values(g,person,'admin');
  return g;
end $$;

-- Idempotent member creation without changing existing identities or callers.
alter table public.persons add column added_by uuid references public.profiles(id);
alter table public.persons add column request_key uuid;
alter table public.persons add constraint persons_request_pair check ((added_by is null)=(request_key is null));
create unique index persons_creation_request on public.persons(group_id,added_by,request_key) where request_key is not null;
create function public.split_add_guest_once(p_group_id uuid,p_name text,p_request_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare person uuid; previous_name text;
begin
  perform split_private.lock_group(p_group_id,true);
  if p_request_key is null then raise exception 'Request key required' using errcode='22023'; end if;
  select id,display_name into person,previous_name from public.persons
    where group_id=p_group_id and added_by=auth.uid() and request_key=p_request_key;
  if found then
    if previous_name is distinct from p_name then raise exception 'Conflicting request' using errcode='22023'; end if;
    return person;
  end if;
  if (select count(*) from public.group_members where group_id=p_group_id)>=200 then raise exception 'Member limit reached' using errcode='22023'; end if;
  insert into public.persons(group_id,display_name,added_by,request_key)
    values(p_group_id,p_name,auth.uid(),p_request_key) returning id into person;
  insert into public.group_members(group_id,person_id) values(p_group_id,person);
  return person;
end $$;

-- Keyset ordering always includes an immutable unique tie-breaker. No OFFSET.
create index groups_time_id on public.groups(created_at desc,id desc);
create index expense_voids_group_time on public.expense_voids(group_id,created_at desc,expense_id desc);
create index reversals_group_time on public.settlement_reversals(group_id,created_at desc,settlement_id desc);
create index invites_target_expiry on public.member_invites(target_user_id,expires_at desc,id desc) where accepted_at is null;

create function public.split_list_groups(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null) then raise exception 'Invalid page' using errcode='22023'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') into result from (
    select g.id,g.name,g.archived,g.created_at from public.persons p
    join public.group_members m on m.group_id=p.group_id and m.person_id=p.id and m.active
    join public.groups g on g.id=m.group_id
    where p.user_id=auth.uid() and (p_before is null or (g.created_at,g.id)<(p_before,p_before_id))
    order by g.created_at desc,g.id desc limit p_limit+1
  ) q;
  return result;
end $$;

-- One statement/snapshot: members and balances cannot describe different commits.
create function public.split_group_snapshot(p_group_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not split_private.is_member(p_group_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  select jsonb_build_object('id',g.id,'name',g.name,'archived',g.archived,'created_at',g.created_at,
    'people',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,'user_id',p.user_id,
      'active',m.active,'role',m.role) order by p.id),'[]') from public.persons p
      join public.group_members m on m.group_id=p.group_id and m.person_id=p.id where p.group_id=g.id),
    'balances',(select coalesce(jsonb_agg(jsonb_build_object('person_id',b.person_id,'balance_minor',b.balance::text) order by b.person_id),'[]')
      from split_private.balances(g.id) b)) into result from public.groups g where g.id=p_group_id;
  return result;
end $$;

-- Only the targeted account sees these previews. A preview is not membership.
create function public.split_list_invites(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null) then raise exception 'Invalid page' using errcode='22023'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.expires_at desc,q.id desc),'[]') into result from (
    select i.id,g.name as group_name,p.display_name as person_name,i.expires_at from public.member_invites i
    join public.groups g on g.id=i.group_id and not g.archived
    join public.persons p on p.id=i.person_id and p.group_id=i.group_id and p.user_id is null
    join public.group_members m on m.person_id=p.id and m.group_id=p.group_id and m.active
    where i.target_user_id=auth.uid() and i.accepted_at is null and i.expires_at>now()
      and exists(select 1 from public.persons issuer join public.group_members im on im.group_id=issuer.group_id and im.person_id=issuer.id
        where issuer.group_id=i.group_id and issuer.user_id=i.invited_by and im.active and im.role='admin')
      and (p_before is null or (i.expires_at,i.id)<(p_before,p_before_id))
    order by i.expires_at desc,i.id desc limit p_limit+1
  ) q;
  return result;
end $$;

-- A bounded timeline, shared by account and group screens. Derive allowed groups
-- once instead of evaluating recursive membership checks on each ledger row.
create function public.split_history(p_group_id uuid default null,p_before timestamptz default null,
  p_kind text default null,p_before_id uuid default null,p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or (p_group_id is not null and not split_private.is_member(p_group_id)) then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 50 or
    (p_before is null)<>(p_before_id is null) or (p_before is null)<>(p_kind is null) or
    (p_kind is not null and p_kind not in ('expense','repayment','void','reversal')) then raise exception 'Invalid page' using errcode='22023'; end if;
  with allowed as materialized (
    select m.group_id from public.persons p join public.group_members m on m.person_id=p.id and m.group_id=p.group_id
    where p.user_id=auth.uid() and m.active and (p_group_id is null or m.group_id=p_group_id)
  ), events as (
    (select e.id,e.group_id,e.created_at,'expense'::text as kind from public.expenses e join allowed a on a.group_id=e.group_id
      where p_before is null or (e.created_at,'expense'::text,e.id)<(p_before,p_kind,p_before_id)
      order by e.created_at desc,e.id desc limit p_limit+1)
    union all
    (select s.id,s.group_id,s.created_at,'repayment'::text from public.settlements s join allowed a on a.group_id=s.group_id
      where p_before is null or (s.created_at,'repayment'::text,s.id)<(p_before,p_kind,p_before_id)
      order by s.created_at desc,s.id desc limit p_limit+1)
    union all
    (select v.expense_id,v.group_id,v.created_at,'void'::text from public.expense_voids v join allowed a on a.group_id=v.group_id
      where p_before is null or (v.created_at,'void'::text,v.expense_id)<(p_before,p_kind,p_before_id)
      order by v.created_at desc,v.expense_id desc limit p_limit+1)
    union all
    (select r.settlement_id,r.group_id,r.created_at,'reversal'::text from public.settlement_reversals r join allowed a on a.group_id=r.group_id
      where p_before is null or (r.created_at,'reversal'::text,r.settlement_id)<(p_before,p_kind,p_before_id)
      order by r.created_at desc,r.settlement_id desc limit p_limit+1)
  ), page as (
    select * from events order by created_at desc,kind desc,id desc limit p_limit+1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'group_id',q.group_id,'group_name',g.name,'created_at',q.created_at,'kind',q.kind,
    'title',coalesce(e.description,fp.display_name || ' → ' || tp.display_name),
    'amount_minor',coalesce(e.total_minor,s.amount_minor)::text,
    'actor_id',case q.kind when 'void' then v.recorded_by when 'reversal' then r.recorded_by else coalesce(e.created_by,s.recorded_by) end,
    'corrected',case when e.id is not null then v.expense_id is not null else r.settlement_id is not null end,
    'reason',case when q.kind='void' then v.reason when q.kind='reversal' then r.reason else null end,
    'payer',case when e.id is not null then (select string_agg(p.display_name,', ' order by p.id) from public.payments pay join public.persons p on p.id=pay.payer_id where pay.expense_id=e.id) else fp.display_name end,
    'participant_count',case when e.id is not null then (select count(*) from public.shares sh where sh.expense_id=e.id) else 2 end
  ) order by q.created_at desc,q.kind desc,q.id desc),'[]') into result from page q
    join public.groups g on g.id=q.group_id
    left join public.expenses e on q.kind in ('expense','void') and e.id=q.id and e.group_id=q.group_id
    left join public.expense_voids v on v.expense_id=e.id
    left join public.settlements s on q.kind in ('repayment','reversal') and s.id=q.id and s.group_id=q.group_id
    left join public.settlement_reversals r on r.settlement_id=s.id
    left join public.persons fp on fp.id=s.from_person_id
    left join public.persons tp on tp.id=s.to_person_id;
  return result;
end $$;

create function public.split_expense_detail(p_group_id uuid,p_expense_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not split_private.is_member(p_group_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  select jsonb_build_object('id',e.id,'description',e.description,'total_minor',e.total_minor::text,'created_by',e.created_by,
    'reason',(select v.reason from public.expense_voids v where v.expense_id=e.id),
    'payments',(select coalesce(jsonb_agg(jsonb_build_object('id',p.payer_id,'name',person.display_name,'amount_minor',p.amount_minor::text) order by p.payer_id),'[]')
      from public.payments p join public.persons person on person.id=p.payer_id where p.expense_id=e.id),
    'shares',(select coalesce(jsonb_agg(jsonb_build_object('id',s.person_id,'name',person.display_name,'amount_minor',s.amount_minor::text) order by s.person_id),'[]')
      from public.shares s join public.persons person on person.id=s.person_id where s.expense_id=e.id)) into result
    from public.expenses e where e.id=p_expense_id and e.group_id=p_group_id;
  if result is null then raise exception 'Expense unavailable' using errcode='42501'; end if;
  return result;
end $$;

-- Explicit allowlist only. New functions otherwise default to PUBLIC execution.
create function public.split_settlement_detail(p_group_id uuid,p_settlement_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not split_private.is_member(p_group_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  select jsonb_build_object('id',s.id,'from_name',fp.display_name,'to_name',tp.display_name,
    'amount_minor',s.amount_minor::text,'recorded_by',s.recorded_by,
    'reason',(select r.reason from public.settlement_reversals r where r.settlement_id=s.id)) into result
    from public.settlements s join public.persons fp on fp.id=s.from_person_id join public.persons tp on tp.id=s.to_person_id
    where s.id=p_settlement_id and s.group_id=p_group_id;
  if result is null then raise exception 'Settlement unavailable' using errcode='42501'; end if;
  return result;
end $$;
revoke all on function public.split_settlement_detail(uuid,uuid) from public,anon,authenticated;
grant execute on function public.split_settlement_detail(uuid,uuid) to authenticated;
revoke all on function public.split_add_guest_once(uuid,text,uuid),public.split_list_groups(timestamptz,uuid,integer),
  public.split_group_snapshot(uuid),public.split_list_invites(timestamptz,uuid,integer),
  public.split_history(uuid,timestamptz,text,uuid,integer),public.split_expense_detail(uuid,uuid) from public,anon,authenticated;
grant execute on function public.split_add_guest_once(uuid,text,uuid),public.split_list_groups(timestamptz,uuid,integer),
  public.split_group_snapshot(uuid),public.split_list_invites(timestamptz,uuid,integer),
  public.split_history(uuid,timestamptz,text,uuid,integer),public.split_expense_detail(uuid,uuid) to authenticated;
commit;
