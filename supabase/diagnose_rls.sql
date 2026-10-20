select policyname, cmd, roles::text as roles, qual, with_check
from pg_policies
where tablename = 'leaderboard'
order by cmd;

select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'leaderboard';

select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'leaderboard'
order by grantee, privilege_type;
