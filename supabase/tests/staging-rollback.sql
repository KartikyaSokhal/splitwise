-- Run only against the selected staging project. No persistent fixture writes.
-- Real PostgreSQL/Auth schema/RLS roles, but claims are set by this privileged
-- test: this is NOT a test of JWT signature verification or Google sign-in.
begin;
set local statement_timeout='15s';
do $$
declare a uuid=gen_random_uuid(); b uuid=gen_random_uuid(); ga uuid; gb uuid; gt uuid; pa uuid; guest uuid; traveler uuid;
  key uuid=gen_random_uuid(); e uuid; result jsonb; checks integer=0;
begin
  insert into auth.users(id) values(a),(b);
  perform set_config('request.jwt.claim.sub',a::text,true);
  set local role authenticated;
  ga=public.split_create_group('DueShare rollback-only QA',key);
  if public.split_create_group('DueShare rollback-only QA',key)<>ga then raise exception 'Idempotency failed'; end if; checks=checks+1;
  perform public.split_update_group(ga,'Renamed rollback-only QA',false);
  if public.split_create_group('DueShare rollback-only QA',key)<>ga then raise exception 'Rename retry failed'; end if; checks=checks+1;
  select id into pa from public.persons where group_id=ga and user_id=a;
  guest=public.split_add_guest_once(ga,'QA person',key);
  if public.split_add_guest_once(ga,'QA person',key)<>guest then raise exception 'Guest retry failed'; end if; checks=checks+1;
  e=public.split_create_expense(ga,key,'Rollback expense',101,
    jsonb_build_array(jsonb_build_object('payerId',pa,'amountMinor',101)),
    jsonb_build_array(jsonb_build_object('personId',guest,'amountMinor',101)));
  result=public.split_group_snapshot(ga);
  if (select sum((x->>'balance_minor')::numeric) from jsonb_array_elements(result->'balances') x)<>0 then raise exception 'Conservation failed'; end if; checks=checks+1;
  if jsonb_array_length(public.split_history(ga))<>1 then raise exception 'History failed'; end if; checks=checks+1;
  if public.split_expense_detail(ga,e)->>'total_minor'<>'101' then raise exception 'Exact detail failed'; end if; checks=checks+1;
  gt=public.split_create_group_v2('Rollback-only Trip','trip','Goa','2026-10-03','2026-10-05',
    '[{"name":"Traveler"}]'::jsonb,gen_random_uuid());
  result=public.split_group_snapshot(gt);
  if result->>'purpose'<>'trip' or result->>'destination'<>'Goa' or
     result->>'start_date'<>'2026-10-03' or result->>'end_date'<>'2026-10-05' then
    raise exception 'Trip metadata failed'; end if; checks=checks+1;
  if jsonb_array_length(result->'people')<>2 then raise exception 'Atomic trip people failed'; end if; checks=checks+1;
  select id into traveler from public.persons where group_id=gt and display_name='Traveler';
  select id into pa from public.persons where group_id=gt and user_id=a;
  perform public.split_create_expense(gt,gen_random_uuid(),'Trip expense',101,
    jsonb_build_array(jsonb_build_object('payerId',pa,'amountMinor',101)),
    jsonb_build_array(jsonb_build_object('personId',traveler,'amountMinor',101)));
  result=public.split_group_snapshot(gt);
  if (select sum((x->>'balance_minor')::numeric) from jsonb_array_elements(result->'balances') x)<>0 or
     jsonb_array_length(public.split_history(gt))<>1 then raise exception 'Trip ledger failed'; end if; checks=checks+1;
  begin
    update public.expenses set total_minor=1 where id=e;
    raise exception 'Direct update succeeded';
  exception when insufficient_privilege then checks=checks+1; end;
  perform set_config('request.jwt.claim.sub',b::text,true);
  gb=public.split_create_group('Other rollback-only group',gen_random_uuid());
  if exists(select 1 from public.profiles where id=a) or exists(select 1 from public.groups where id=ga) then raise exception 'RLS leak'; end if; checks=checks+1;
  begin
    perform public.split_group_snapshot(ga);
    raise exception 'Foreign snapshot succeeded';
  exception when insufficient_privilege then checks=checks+1; end;
  begin
    perform public.split_group_snapshot(gt);
    raise exception 'Foreign trip snapshot succeeded';
  exception when insufficient_privilege then checks=checks+1; end;
  begin
    perform public.split_history(ga);
    raise exception 'Foreign history succeeded';
  exception when insufficient_privilege then checks=checks+1; end;
  if jsonb_array_length(public.split_history())<>0 then raise exception 'Global history leak'; end if; checks=checks+1;
  set local role anon;
  begin
    perform public.split_list_groups();
    raise exception 'Anonymous RPC succeeded';
  exception when insufficient_privilege then checks=checks+1; end;
  begin
    perform public.split_create_group_v2('Trip','trip',null,null,null,'[]'::jsonb,gen_random_uuid());
    raise exception 'Anonymous Trip creation succeeded';
  exception when insufficient_privilege then checks=checks+1; end;
  reset role;
  if checks<>17 then raise exception 'Incomplete staging checks'; end if;
  set constraints all immediate;
end $$;
rollback;
select 'PASS: 17 rollback-only staging assertions; no fixtures committed' as verification;
