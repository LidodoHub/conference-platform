-- 000_diagnostic.sql : LECTURE SEULE, ne modifie rien.
-- À lancer dans le SQL Editor de Supabase. Résultat : une seule cellule JSON à copier entièrement.
-- Sert à vérifier l'état réel de la base (policies RLS, fonctions, triggers, contraintes, colonnes)
-- avant d'écrire les migrations de sécurité.

select json_build_object(
  'rls', (
    select json_agg(json_build_object('table', c.relname, 'rls', c.relrowsecurity) order by c.relname)
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  ),
  'policies', (
    select json_agg(json_build_object(
      'table', tablename, 'name', policyname, 'cmd', cmd, 'roles', roles::text,
      'using', qual, 'check', with_check) order by tablename, cmd, policyname)
    from pg_policies
    where schemaname = 'public'
  ),
  'functions', (
    select json_agg(json_build_object(
      'name', p.proname,
      'args', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef,
      'settings', p.proconfig,
      'definition', pg_get_functiondef(p.oid)) order by p.proname)
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  ),
  'triggers', (
    select json_agg(json_build_object('table', t.tgrelid::regclass::text, 'name', t.tgname, 'def', pg_get_triggerdef(t.oid)) order by 1)
    from pg_trigger t
    where not t.tgisinternal
      and t.tgrelid in (select oid from pg_class where relnamespace in ('public'::regnamespace, 'auth'::regnamespace))
  ),
  'constraints', (
    select json_agg(json_build_object('table', conrelid::regclass::text, 'name', conname, 'def', pg_get_constraintdef(oid)) order by 1, 2)
    from pg_constraint
    where connamespace = 'public'::regnamespace and contype in ('u', 'c', 'f')
  ),
  'columns', (
    select json_agg(json_build_object(
      'table', table_name, 'column', column_name, 'type', udt_name,
      'default', column_default, 'nullable', is_nullable) order by table_name, ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
  ),
  'enums', (
    select json_agg(json_build_object('type', t.typname, 'values', (
      select json_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)))
    from pg_type t
    where t.typnamespace = 'public'::regnamespace and t.typtype = 'e'
  ),
  'grants_profiles_columns', (
    select json_agg(json_build_object('grantee', grantee, 'privilege', privilege_type, 'column', column_name))
    from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'profiles' and grantee in ('anon', 'authenticated')
  )
) as diagnostic;
