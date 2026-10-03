-- One Group ledger for every purpose. 001 and 002 are already deployed and immutable.
begin;

alter table public.groups add column purpose text not null default 'general'
  check (purpose in ('general','trip','family','home','car_pool','couple','office','college','event','other'));
alter table public.groups add column destination text
  check (destination is null or (length(btrim(destination)) between 1 and 100
    and destination !~ '[[:cntrl:]]' and destination !~ U&'[\202A-\202E\2066-\2069]'));
alter table public.groups add column start_date date;
alter table public.groups add column end_date date;
alter table public.groups add column creation_payload jsonb;
alter table public.groups add constraint group_trip_details_only check
  (purpose='trip' or (destination is null and start_date is null and end_date is null));
alter table public.groups add constraint group_trip_date_order check
  (start_date is null or end_date is null or start_date<=end_date);

-- New creation is one transaction: the caller's linked admin identity and all
-- named people are inserted together. A lost response can replay the complete
-- original request even after the public group name is changed later.
create function public.split_create_group_v2(
  p_name text,p_purpose text,p_destination text,p_start_date date,p_end_date date,
  p_people jsonb,p_request_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); g uuid; person uuid; previous jsonb; payload jsonb; guest jsonb;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_request_key is null or p_purpose is null or
    p_purpose not in ('general','trip','family','home','car_pool','couple','office','college','event','other') or
    p_people is null or jsonb_typeof(p_people)<>'array' or jsonb_array_length(p_people)>199 then
    raise exception 'Invalid group request' using errcode='22023';
  end if;
  if p_purpose<>'trip' and (p_destination is not null or p_start_date is not null or p_end_date is not null) then
    raise exception 'Trip details require Trip purpose' using errcode='22023';
  end if;
  payload=jsonb_build_object('name',p_name,'purpose',p_purpose,'destination',p_destination,
    'start_date',p_start_date,'end_date',p_end_date,'people',p_people);
  -- Profile lock serializes quotas and same-key attempts across connections.
  perform 1 from public.profiles where id=actor for update;
  if not found then raise exception 'Profile unavailable' using errcode='42501'; end if;
  select id,creation_payload into g,previous from public.groups where created_by=actor and request_key=p_request_key;
  if found then
    if previous is distinct from payload then raise exception 'Conflicting request' using errcode='22023'; end if;
    if not split_private.is_member(g) then raise exception 'Not authorized' using errcode='42501'; end if;
    return g;
  end if;
  if (select count(*) from public.groups where created_by=actor)>=100 then raise exception 'Group limit reached' using errcode='22023'; end if;
  -- Constraints also defend the row if a privileged caller bypasses the RPC.
  insert into public.groups(name,creation_name,created_by,request_key,creation_payload,
    purpose,destination,start_date,end_date)
    values(p_name,p_name,actor,p_request_key,payload,p_purpose,p_destination,p_start_date,p_end_date)
    returning id into g;
  insert into public.persons(group_id,user_id,display_name)
    select g,actor,display_name from public.profiles where id=actor returning id into person;
  insert into public.group_members(group_id,person_id,role) values(g,person,'admin');
  for guest in select value from jsonb_array_elements(p_people) loop
    if jsonb_typeof(guest)<>'object' or not (guest ? 'name') or
      (select count(*) from jsonb_object_keys(guest))<>1 or jsonb_typeof(guest->'name')<>'string' then
      raise exception 'Invalid person' using errcode='22023';
    end if;
    insert into public.persons(group_id,display_name)
      values(g,guest->>'name') returning id into person;
    insert into public.group_members(group_id,person_id) values(g,person);
  end loop;
  return g;
end $$;

-- These are presentation fields on the same authorized Group rows.
create or replace function public.split_list_groups(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null) then raise exception 'Invalid page' using errcode='22023'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') into result from (
    select g.id,g.name,g.archived,g.created_at,g.purpose,g.destination,g.start_date,g.end_date
    from public.persons p
    join public.group_members m on m.group_id=p.group_id and m.person_id=p.id and m.active
    join public.groups g on g.id=m.group_id
    where p.user_id=auth.uid() and (p_before is null or (g.created_at,g.id)<(p_before,p_before_id))
    order by g.created_at desc,g.id desc limit p_limit+1
  ) q;
  return result;
end $$;

create or replace function public.split_group_snapshot(p_group_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not split_private.is_member(p_group_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  select jsonb_build_object('id',g.id,'name',g.name,'archived',g.archived,'created_at',g.created_at,
    'purpose',g.purpose,'destination',g.destination,'start_date',g.start_date,'end_date',g.end_date,
    'people',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,'user_id',p.user_id,
      'active',m.active,'role',m.role) order by p.id),'[]') from public.persons p
      join public.group_members m on m.group_id=p.group_id and m.person_id=p.id where p.group_id=g.id),
    'balances',(select coalesce(jsonb_agg(jsonb_build_object('person_id',b.person_id,'balance_minor',b.balance::text) order by b.person_id),'[]')
      from split_private.balances(g.id) b)) into result from public.groups g where g.id=p_group_id;
  return result;
end $$;

revoke all on function public.split_create_group_v2(text,text,text,date,date,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.split_create_group_v2(text,text,text,date,date,jsonb,uuid) to authenticated;
commit;
