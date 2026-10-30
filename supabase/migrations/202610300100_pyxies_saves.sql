-- Pyxies keeps its save next to each PixPy student, in its own column, so the game never
-- touches PixPy progress. Login still goes through public.pixpy_login (first name + last name).

alter table private.pixpy_students add column if not exists pyxies_save jsonb;
alter table private.pixpy_students add column if not exists pyxies_updated_at timestamptz;

create or replace function public.pyxies_load(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text;
  found_save jsonb;
begin
  normalized := pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(coalesce(p_username, ''))), '[^a-z0-9]', '', 'g');
  select pyxies_save into found_save
  from private.pixpy_students
  where username_hash = pg_catalog.encode(extensions.digest(normalized, 'sha256'), 'hex');
  return found_save;
end;
$$;

create or replace function public.pyxies_save(p_username text, p_save jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text;
  changed integer;
begin
  normalized := pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(coalesce(p_username, ''))), '[^a-z0-9]', '', 'g');
  if p_save is null or pg_catalog.jsonb_typeof(p_save) <> 'object' or pg_catalog.pg_column_size(p_save) > 200000 then
    return false;
  end if;

  update private.pixpy_students
  set pyxies_save = p_save,
      pyxies_updated_at = pg_catalog.now()
  where username_hash = pg_catalog.encode(extensions.digest(normalized, 'sha256'), 'hex')
    and pyxies_save is distinct from p_save;

  get diagnostics changed = row_count;
  if changed = 1 then
    return true;
  end if;
  return exists (select 1 from private.pixpy_students where username_hash = pg_catalog.encode(extensions.digest(normalized, 'sha256'), 'hex'));
end;
$$;

-- The Hall of Fame shows only names, badges, Trainer XP and the champion flag.
create or replace function public.pyxies_hall_of_fame()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name', display_name, 'badges', badges, 'xp', xp, 'champion', champion, 'caught', caught
  ) order by champion desc, badges desc, xp desc, display_name), '[]'::jsonb)
  from (
    select display_name,
      coalesce(pg_catalog.jsonb_array_length(case when pg_catalog.jsonb_typeof(pyxies_save -> 'badges') = 'array' then pyxies_save -> 'badges' else '[]'::jsonb end), 0) as badges,
      case when pyxies_save ->> 'trainerXp' ~ '^[0-9]{1,9}$' then (pyxies_save ->> 'trainerXp')::integer else 0 end as xp,
      coalesce(pyxies_save -> 'flags' ? 'champion', false) as champion,
      coalesce(pg_catalog.jsonb_array_length(case when pg_catalog.jsonb_typeof(pyxies_save -> 'caught') = 'array' then pyxies_save -> 'caught' else '[]'::jsonb end), 0) as caught
    from private.pixpy_students
    where pyxies_save is not null
    order by champion desc, badges desc, xp desc
    limit 30
  ) as fame;
$$;

revoke all on function public.pyxies_load(text) from public;
revoke all on function public.pyxies_save(text, jsonb) from public;
revoke all on function public.pyxies_hall_of_fame() from public;
grant execute on function public.pyxies_load(text) to anon, authenticated;
grant execute on function public.pyxies_save(text, jsonb) to anon, authenticated;
grant execute on function public.pyxies_hall_of_fame() to anon, authenticated;
