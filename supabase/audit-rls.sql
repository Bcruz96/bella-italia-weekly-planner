-- Read-only audit: run in the Supabase project's SQL Editor as an administrator.
-- RLS must be enabled; inspect policies AND grants for anon/authenticated.
-- A restaurant_id filter in browser JavaScript is not an authorization boundary.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('manual_tasks', 'fixed_task_completion');

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('manual_tasks', 'fixed_task_completion');

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('manual_tasks', 'fixed_task_completion')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee, privilege_type;
